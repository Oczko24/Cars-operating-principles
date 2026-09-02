import * as THREE from 'three';
import { VehicleDimensions } from './VehicleConfig.js';

export class ChassisBuilder {
  constructor(scene) {
    this.scene = scene;
  }


buildChassisFrame() {
    const frame = new THREE.Group();
    const frontZ = VehicleDimensions.wheelbaseFrontZ;
    const rearZ = VehicleDimensions.wheelbaseRearZ;
    const sillY = VehicleDimensions.groundClearance;
    const railYFront = sillY + 0.20;
    const railYMid = sillY + 0.05;
    const railYRear = sillY + 0.15;
    const railX = VehicleDimensions.trackWidthHalf - 0.35; // Inside the wheels

    // Podłużnice główne ramy nośnej (Main Longitudinal Rails)
    [-railX, railX].forEach(x => {
      const railCurve = new THREE.CurvePath();
      railCurve.add(new THREE.LineCurve3(new THREE.Vector3(x, railYFront, frontZ + 0.80), new THREE.Vector3(x, railYMid, frontZ - 0.20)));
      railCurve.add(new THREE.LineCurve3(new THREE.Vector3(x, railYMid, frontZ - 0.20), new THREE.Vector3(x, sillY, -0.20)));
      railCurve.add(new THREE.LineCurve3(new THREE.Vector3(x, sillY, -0.20), new THREE.Vector3(x, railYRear, rearZ + 0.40)));
      railCurve.add(new THREE.LineCurve3(new THREE.Vector3(x, railYRear, rearZ + 0.40), new THREE.Vector3(x, railYRear, rearZ - 0.60)));

      const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 16, 0.045, 12, false), this.scene.matChassis);
      rail.userData.name = "Podłużnica ramy nośnej";
      frame.add(rail);
    });

    // Progi boczne (Side Sills)
    const sillX = VehicleDimensions.trackWidthHalf - 0.05;
    [-sillX, sillX].forEach(x => {
      const sillLength = (frontZ - rearZ) * 0.8;
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, sillLength), this.scene.matDarkSteel);
      sill.position.set(x, sillY + 0.06, (frontZ + rearZ) / 2);
      sill.userData.name = "Próg boczny nadwozia";
      frame.add(sill);
    });

    // Belki poprzeczne ramy (Crossmembers)
    [
      { z: frontZ + 0.70, w: railX * 2.2, y: railYFront, name: "Pas przedni chłodnicy" },
      { z: frontZ - 0.20, w: railX * 2.0, y: railYMid, name: "Kołyska silnika (Subframe przedni)" },
      { z: (frontZ + rearZ) / 2, w: railX * 2.0, y: sillY, name: "Belka nośna skrzyni biegów" },
      { z: rearZ + 0.40, w: railX * 2.0, y: railYRear, name: "Kołyska dyferencjału (Subframe tylny)" },
      { z: rearZ - 0.50, w: railX * 2.2, y: railYRear, name: "Belka tylna zderzaka" }
    ].forEach(cm => {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(cm.w, 0.06, 0.08), this.scene.matChassis);
      cross.position.set(0, cm.y, cm.z);
      cross.userData.name = cm.name;
      frame.add(cross);
    });

    this.scene.carGroup.add(frame);
  }

buildSuspensionAssembly() {
    const suspGroup = new THREE.Group();
    const wheelY = VehicleDimensions.wheelCenterY;
    const trackX = VehicleDimensions.trackWidthHalf;
    const frontZ = VehicleDimensions.wheelbaseFrontZ;
    const rearZ = VehicleDimensions.wheelbaseRearZ;

    // ═══ 1. ZESPÓŁ 4 KÓŁ POJAZDU (Koła przednie i tylne ze zwrotnicami i hamulcami) ═══
    const wheelFL = this.createCarWheel(true, false);
    wheelFL.position.set(-trackX, wheelY, frontZ);
    suspGroup.add(wheelFL);

    const wheelFR = this.createCarWheel(true, true);
    wheelFR.position.set(trackX, wheelY, frontZ);
    suspGroup.add(wheelFR);

    const wheelRL = this.createCarWheel(false, false);
    wheelRL.position.set(-trackX, wheelY, rearZ);
    suspGroup.add(wheelRL);

    const wheelRR = this.createCarWheel(false, true);
    wheelRR.position.set(trackX, wheelY, rearZ);
    suspGroup.add(wheelRR);

    // ═══ 2. ZAWIESZENIE PRZEDNIE (Podwójne wahacze poprzeczne + Amortyzatory + Maglownica) ═══
    [-1, 1].forEach(side => {
      const sign = side;
      const armStartX = sign * (trackX - 0.5);
      const armEndX = sign * (trackX - 0.1);

      // Dolny wahacz trójkątny (A-Arm)
      const lArmCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(armStartX, wheelY - 0.15, frontZ - 0.20),
        new THREE.Vector3(armEndX, wheelY - 0.10, frontZ),
        new THREE.Vector3(armStartX, wheelY - 0.15, frontZ + 0.20)
      ]);
      const lArm = new THREE.Mesh(new THREE.TubeGeometry(lArmCurve, 16, 0.024, 8, false), this.scene.matDarkSteel);
      lArm.userData.name = `Wahacz dolny przedni (${sign < 0 ? 'Lewy' : 'Prawy'})`;
      suspGroup.add(lArm);

      // Górny wahacz poprzeczny
      const uArmCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(armStartX + sign * 0.08, wheelY + 0.20, frontZ - 0.15),
        new THREE.Vector3(armEndX, wheelY + 0.15, frontZ),
        new THREE.Vector3(armStartX + sign * 0.08, wheelY + 0.20, frontZ + 0.15)
      ]);
      const uArm = new THREE.Mesh(new THREE.TubeGeometry(uArmCurve, 16, 0.020, 8, false), this.scene.matDarkSteel);
      uArm.userData.name = `Wahacz górny przedni (${sign < 0 ? 'Lewy' : 'Prawy'})`;
      suspGroup.add(uArm);

      // Kolumna amortyzatora i sprężyny (Coilover Strut)
      const strutG = new THREE.Group();
      const strutBottom = new THREE.Vector3(armEndX - sign * 0.10, wheelY - 0.05, frontZ);
      const strutTop = new THREE.Vector3(sign * (trackX - 0.4), wheelY + 0.45, frontZ);
      const strutLen = strutBottom.distanceTo(strutTop);
      const strutMid = new THREE.Vector3().addVectors(strutBottom, strutTop).multiplyScalar(0.5);

      strutG.position.copy(strutMid);
      strutG.lookAt(strutTop);

      const damperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, strutLen * 0.5, 16), this.scene.matGold);
      damperBody.rotation.x = Math.PI / 2;
      damperBody.position.z = -strutLen * 0.2;
      strutG.add(damperBody);

      const damperRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, strutLen * 0.6, 16), this.scene.matChrome);
      damperRod.rotation.x = Math.PI / 2;
      damperRod.position.z = strutLen * 0.15;
      strutG.add(damperRod);

      const springPts = [];
      const coils = 6;
      for (let c = 0; c <= coils * 24; c++) {
        const t = c / (coils * 24);
        const a = t * Math.PI * 2 * coils;
        const r = 0.055;
        const z = (t - 0.5) * (strutLen * 0.65);
        springPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
      }
      const springCurve = new THREE.CatmullRomCurve3(springPts);
      const springMesh = new THREE.Mesh(new THREE.TubeGeometry(springCurve, 80, 0.010, 8, false), this.scene.matIntake);
      springMesh.userData.name = `Sprężyna zawieszenia przedniego (${sign < 0 ? 'Lewa' : 'Prawa'})`;
      strutG.add(springMesh);
      suspGroup.add(strutG);

      // Drążek kierowniczy (Tie Rod)
      const tieRodCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sign * (trackX - 0.5), wheelY - 0.05, frontZ - 0.15),
        new THREE.Vector3(sign * (trackX - 0.1), wheelY, frontZ - 0.05)
      ]);
      const tieRod = new THREE.Mesh(new THREE.TubeGeometry(tieRodCurve, 12, 0.018, 8, false), this.scene.matSteel);
      tieRod.userData.name = `Drążek kierowniczy (${sign < 0 ? 'Lewy' : 'Prawy'})`;
      suspGroup.add(tieRod);
    });

    // Maglownica / Przekładnia kierownicza
    const rackMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, (trackX - 0.5) * 2, 16), this.scene.matDarkSteel);
    rackMesh.rotation.z = Math.PI / 2;
    rackMesh.position.set(0, wheelY - 0.05, frontZ - 0.15);
    rackMesh.userData.name = "Przekładnia kierownicza (Maglownica)";
    suspGroup.add(rackMesh);

    // ═══ 3. ZAWIESZENIE TYLNE (Multi-link + Coilovers) ═══
    [-1, 1].forEach(side => {
      const sign = side;
      const armStartX = sign * (trackX - 0.5);
      const armEndX = sign * (trackX - 0.1);

      // Dolny wahacz wleczony / nośny
      const rLArmCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(armStartX, wheelY - 0.10, rearZ - 0.20),
        new THREE.Vector3(armEndX, wheelY - 0.05, rearZ),
        new THREE.Vector3(armStartX, wheelY - 0.10, rearZ + 0.20)
      ]);
      const rLArm = new THREE.Mesh(new THREE.TubeGeometry(rLArmCurve, 16, 0.026, 8, false), this.scene.matDarkSteel);
      rLArm.userData.name = `Wahacz nośny tylny (${sign < 0 ? 'Lewy' : 'Prawy'})`;
      suspGroup.add(rLArm);

      // Górny drążek zbieżności
      const rUArmCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(armStartX + sign * 0.08, wheelY + 0.20, rearZ + 0.15),
        new THREE.Vector3(armEndX, wheelY + 0.15, rearZ)
      ]);
      const rUArm = new THREE.Mesh(new THREE.TubeGeometry(rUArmCurve, 12, 0.020, 8, false), this.scene.matDarkSteel);
      rUArm.userData.name = `Drążek poprzeczny tylny (${sign < 0 ? 'Lewy' : 'Prawy'})`;
      suspGroup.add(rUArm);

      // Amortyzator tylny ze sprężyną
      const rStrutG = new THREE.Group();
      const rStrutBottom = new THREE.Vector3(armEndX - sign * 0.10, wheelY - 0.05, rearZ);
      const rStrutTop = new THREE.Vector3(sign * (trackX - 0.4), wheelY + 0.45, rearZ - 0.10);
      const rStrutLen = rStrutBottom.distanceTo(rStrutTop);
      const rStrutMid = new THREE.Vector3().addVectors(rStrutBottom, rStrutTop).multiplyScalar(0.5);

      rStrutG.position.copy(rStrutMid);
      rStrutG.lookAt(rStrutTop);

      const rDamper = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, rStrutLen * 0.5, 16), this.scene.matGold);
      rDamper.rotation.x = Math.PI / 2;
      rDamper.position.z = -rStrutLen * 0.2;
      rStrutG.add(rDamper);

      const rRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rStrutLen * 0.6, 16), this.scene.matChrome);
      rRod.rotation.x = Math.PI / 2;
      rRod.position.z = rStrutLen * 0.15;
      rStrutG.add(rRod);

      const rSpringPts = [];
      const rCoils = 6;
      for (let c = 0; c <= rCoils * 24; c++) {
        const t = c / (rCoils * 24);
        const a = t * Math.PI * 2 * rCoils;
        const r = 0.055;
        const z = (t - 0.5) * (rStrutLen * 0.65);
        rSpringPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
      }
      const rSpringCurve = new THREE.CatmullRomCurve3(rSpringPts);
      const rSpringMesh = new THREE.Mesh(new THREE.TubeGeometry(rSpringCurve, 80, 0.010, 8, false), this.scene.matExhaust);
      rSpringMesh.userData.name = `Sprężyna tylna (${sign < 0 ? 'Lewa' : 'Prawa'})`;
      rStrutG.add(rSpringMesh);
      suspGroup.add(rStrutG);
    });

    this.scene.carGroup.add(suspGroup);
  }

createCarWheel(isFront = false, isRight = false) {
    const wheelGroup = new THREE.Group();
    wheelGroup.userData.name = isFront 
      ? (isRight ? "Koło przednie prawe" : "Koło przednie lewe")
      : (isRight ? "Koło tylne prawe" : "Koło tylne lewe");

    // 1. OBRACAJĄCY SIĘ ZESPÓŁ KOŁA (Tire + Rim + Brake Rotor)
    const spinner = new THREE.Group();
    wheelGroup.add(spinner);

    const tireR = VehicleDimensions.tireRadius;      
    const rimR = tireR * 0.70;       
    const tireWidth = 0.24;  // Realistyczna szerokość (240mm)
    const rimWidth = 0.22;   

    // Profil opony (Bieżnik + boki)
    const tireGeo = new THREE.CylinderGeometry(tireR, tireR, tireWidth, 32, 1, false);
    const tireMesh = new THREE.Mesh(tireGeo, this.scene.matTire);
    tireMesh.rotation.z = Math.PI / 2;
    tireMesh.userData.name = "Opona radialna (Sport)";
    spinner.add(tireMesh);

    // Krawędzie opony / zaokrąglenie barku
    [-tireWidth / 2 + 0.02, tireWidth / 2 - 0.02].forEach(tx => {
      const shoulder = new THREE.Mesh(new THREE.TorusGeometry(tireR - 0.03, 0.03, 16, 32), this.scene.matTire);
      shoulder.rotation.y = Math.PI / 2;
      shoulder.position.x = tx;
      spinner.add(shoulder);
    });

    // Rant felgi (Rim barrel)
    const rimBarrel = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, rimWidth, 32, 1, true), this.scene.matRim);
    rimBarrel.rotation.z = Math.PI / 2;
    rimBarrel.userData.name = "Rant felgi aluminiowej";
    spinner.add(rimBarrel);

    // Centralna piasta felgi (Hub)
    const hubOutX = isRight ? (tireWidth / 2 - 0.02) : (-tireWidth / 2 + 0.02);
    const rimHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 24), this.scene.matDarkSteel);
    rimHub.rotation.z = Math.PI / 2;
    rimHub.position.x = hubOutX;
    rimHub.userData.name = "Piasta felgi";
    spinner.add(rimHub);

    // Ramiona felgi (5 ramion typu split-spoke)
    const spokeCount = 5;
    for (let s = 0; s < spokeCount; s++) {
      const ang = (s / spokeCount) * Math.PI * 2;
      const spokeG = new THREE.Group();
      spokeG.rotation.x = ang;

      [-0.015, 0.015].forEach(spokeOffY => {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, rimR - 0.08), this.scene.matRim);
        spoke.position.set(hubOutX, spokeOffY, (rimR - 0.08) / 2 + 0.06);
        spokeG.add(spoke);
      });
      spinner.add(spokeG);

      // Śruby koła (Lug nuts)
      const boltR = 0.045;
      const boltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 6), this.scene.matSteel);
      boltMesh.rotation.z = Math.PI / 2;
      boltMesh.position.set(hubOutX + (isRight ? 0.018 : -0.018), Math.sin(ang) * boltR, Math.cos(ang) * boltR);
      boltMesh.userData.name = "Śruba mocująca koło";
      spinner.add(boltMesh);
    }

    // Tarcza hamulcowa (Brake Disc Rotor - obraca się razem z kołem)
    const discR = rimR * 0.85;
    const discWidth = 0.030;
    const discX = isRight ? (hubOutX - 0.06) : (hubOutX + 0.06);

    const brakeRotor = new THREE.Mesh(new THREE.CylinderGeometry(discR, discR, discWidth, 32), this.scene.matSteel);
    brakeRotor.rotation.z = Math.PI / 2;
    brakeRotor.position.x = discX;
    brakeRotor.userData.name = "Tarcza hamulcowa wentylowana";
    spinner.add(brakeRotor);

    // Dzwon tarczy (Center brake hat)
    const brakeHat = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 24), this.scene.matDarkSteel);
    brakeHat.rotation.z = Math.PI / 2;
    brakeHat.position.x = discX;
    brakeHat.userData.name = "Dzwon tarczy hamulcowej";
    spinner.add(brakeHat);

    // 2. ELEMENTY NIERUCHOME (Zwrotnica + Zacisk hamulcowy)
    const knuckleG = new THREE.Group();
    wheelGroup.add(knuckleG);

    // Zacisk hamulcowy (Brembo Sport Caliper)
    const caliperG = new THREE.Group();
    caliperG.position.set(discX, Math.SQRT1_2 * (discR - 0.02), Math.SQRT1_2 * (discR - 0.02));
    caliperG.rotation.x = -Math.PI / 4;

    const caliperBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), this.scene.matBrake);
    caliperBody.userData.name = "Zacisk hamulcowy 6-tłoczkowy";
    caliperG.add(caliperBody);

    // Tłoczki i detale zacisku
    [-0.045, 0, 0.045].forEach(pz => {
      const pistonRing = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 16), this.scene.matDarkSteel);
      pistonRing.rotation.z = Math.PI / 2;
      pistonRing.position.set(0, 0, pz);
      caliperG.add(pistonRing);
    });
    knuckleG.add(caliperG);

    // Zwrotnica koła / Piasta nośna
    const knuckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.25, 0.15), this.scene.matDarkSteel);
    knuckleMesh.position.set(isRight ? (discX - 0.05) : (discX + 0.05), 0, 0);
    knuckleMesh.userData.name = "Zwrotnica koła (Knuckle)";
    knuckleG.add(knuckleMesh);

    this.scene.carWheels.push(spinner);
    return wheelGroup;
  }

}
