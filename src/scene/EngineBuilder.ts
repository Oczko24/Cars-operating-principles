import * as THREE from 'three';

import { createCylConfig, computeEngineDatum, buildDatumVisuals, createDatumLabel } from './engine/Block';
import { createConnectingRod, createPiston, createSparkPlug } from './engine/Crank';
import { createValve, createSpringMesh, createRockerArm, createCamLobe, getCamRadius } from './engine/Valvetrain';

import { resolveFiringSequence, resolveCrankPinAngles, analyzeEngineBalance } from '../crankshaft_solver.js';
import { VehicleDimensions } from './VehicleConfig.js';
import { SceneAssembler } from './modules/SceneAssembler';

export class EngineBuilder {
  [key: string]: any;

  constructor(scene) {
    this.scene = scene;
  }


createCylConfig(id, z, bank, firingAngleDeg, crankPinAngle) {
    return createCylConfig(this.scene.config, id, z, bank, firingAngleDeg, crankPinAngle);
  }

computeEngineDatum() {
    return computeEngineDatum(this.scene);
  }

createDatumLabel(text, color = '#ffffff', bgColor = 'rgba(15, 23, 42, 0.85)') {
    return createDatumLabel(text, color, bgColor);
  }

buildDatumVisuals(engineGroup, datum) {
    return buildDatumVisuals(this.scene, engineGroup, datum);
  }

async buildEngineAssembly() {
    const datum = this.computeEngineDatum();
    this.scene.currentEngineDatum = datum;
    const { 
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength 
    } = datum;

    const isTransverse = this.scene.config.orientation === 'transverse';
    const compactGbLen = isTransverse ? 0.32 : 0.65;
    const gbEndLocal = minZ - 0.05 - compactGbLen;
    const midZLocal = (maxZ + gbEndLocal) / 2.0;

    this.scene.engineMountGroup = new THREE.Group();
    
    // 1. Placement (Vehicle Coordinates)
    const mountY = VehicleDimensions.engineMountY;
    const frontZ = VehicleDimensions.wheelbaseFrontZ;
    const rearZ = VehicleDimensions.wheelbaseRearZ;
    
    if (this.scene.config.placement === 'front') {
      this.scene.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (frontZ + 0.18) : (frontZ - 0.25));
    } else if (this.scene.config.placement === 'mid') {
      this.scene.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (rearZ + 0.8) : (rearZ + 0.90));
    } else if (this.scene.config.placement === 'rear') {
      this.scene.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (rearZ - 0.20) : (rearZ - 0.25));
    }

    // 2. Orientation (Transverse vs Longitudinal)
    if (isTransverse) {
      this.scene.engineMountGroup.rotation.y = -Math.PI / 2;
    }

    // 3. Tilt / Slant
    if (this.scene.config.tiltAngle) {
      this.scene.engineMountGroup.rotation.z = (this.scene.config.tiltAngle * Math.PI) / 180;
    }

    const engineGroup = new THREE.Group();
    this.scene.engineMountGroup.add(engineGroup);

    this.buildDatumVisuals(engineGroup, datum);

    const layout = this.scene.config.layout;
    const cylCount = this.scene.config.cylinders;
    const vAngle = this.scene.config.vAngle * Math.PI / 180;
    const strokeLength = crankRadius * 2;
    const pistonLength = Math.max(0.12, boreRadius * 1.4);

    // Crankcase as Wireframe: szerokość i długość rozszerzają się wraz z rozmiarem tłoków i układem
    let blockWidth = Math.max(0.56, 2 * sleeveRadius + 0.36);
    if (layout === 'V' || layout === 'W') {
      blockWidth = Math.max(0.68, (sleeveCenter + sleeveRadius) * 2 * Math.sin(vAngle / 2) + 0.25);
    } else if (layout === 'Boxer') {
      blockWidth = Math.max(1.10, (sleeveCenter + sleeveRadius) * 2 + 0.20);
    }

    const crankcaseHeight = Math.max(0.20, crankRadius * 1.3 + 0.04);
    const crankcase = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(blockWidth, crankcaseHeight, engineLength + 0.12)), 
      this.scene.crankcaseLineMat
    );
    crankcase.position.set(0, -crankcaseHeight / 2, (maxZ+minZ)/2);
    crankcase.userData.name = "Miska olejowa (Zarys)";
    engineGroup.add(crankcase);

    const crankMaster = new THREE.Group();
    // ═══ SEGMENTOWE CZOPY GŁÓWNE I WYKORBIENIA WAŁU KORBOWEGO ═══
    const pinWidth = 0.052; // nieco krótszy sworzeń by zrobić miejsce na grubsze ramiona
    const webThick = 0.028; // znacznie grubsze ramię wykorbienia (masywniejszy wał)
    const throwHalfWidth = pinWidth / 2 + webThick; // ~0.054

    // Profil ramienia wykorbienia i aerodynamicznego przeciwciężaru (THREE.Shape)
    // Zwiększone promienie i szerokości, by wyglądał na ciężki, odkuty wał
    const webShape = new THREE.Shape();
    webShape.moveTo(-0.042 * strokeScale, crankRadius);
    webShape.absarc(0, crankRadius, 0.042 * strokeScale, Math.PI, 0, false); // grubszy materiał nad czopem
    webShape.lineTo(0.055 * strokeScale, 0.02 * strokeScale);                              // ramię ku osi głównej (masywniejsze)
    webShape.lineTo(0.120 * strokeScale, -0.05 * strokeScale);                             // szersze rozszerzenie w przeciwciężar
    webShape.quadraticCurveTo(0.125 * strokeScale, -0.190 * strokeScale, 0, -0.200 * strokeScale);       // głębszy dolny łuk przeciwciężaru (większa masa)
    webShape.quadraticCurveTo(-0.125 * strokeScale, -0.190 * strokeScale, -0.120 * strokeScale, -0.05 * strokeScale);
    webShape.lineTo(-0.055 * strokeScale, 0.02 * strokeScale);
    webShape.lineTo(-0.042 * strokeScale, crankRadius);

    const webGeo = new THREE.ExtrudeGeometry(webShape, {
      depth: webThick,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.0035, // wyraźniejsze fazowanie krawędzi (charakterystyczne dla odlewów/odkuwek)
      bevelThickness: 0.0035
    });
    webGeo.translate(0, 0, -webThick / 2);

    // ═══ KOŁO ZĘBATE WAŁU (Timing Gear) ═══
    const crankGear = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 32), this.scene.matDarkSteel);
    crankGear.rotation.x = Math.PI / 2;
    crankGear.position.z = maxZ + 0.05;
    crankGear.userData.name = "Koło zębate wału";
    crankMaster.add(crankGear);

    // ═══ EXPLODE DISTANCE (musi być przed komponentami które go używają) ═══
    const explodeDist = this.scene.explodedFactor * 0.45;

    // ═══ DYNAMICZNE WCZYTYWANIE MODUŁÓW (OSPRZĘT) Z JSON ═══
    const engineLayout = await SceneAssembler.loadLayout('engine_layout.json');
    SceneAssembler.buildModules(engineLayout, this.scene, engineGroup, datum);
    
    // Jeżeli koło pasowe wału zostało dodane (a powinno przez SceneAssembler), 
    // podpinamy je pod wał (crankMaster) żeby się kręciło z nim.
    const builtCrankPulley = engineGroup.children.find(c => c.userData.id === 'crank_pulley_1');
    if (builtCrankPulley) {
      engineGroup.remove(builtCrankPulley);
      crankMaster.add(builtCrankPulley);
    }

    // ═══ Tablice do zbierania pozycji cylindrów (dla uniwersalnych kolektorów) ═══
    this.scene.cylinderPositions = [];

    // Generowanie wykorbień (throws) dla każdego cylindra
    cylinderConfigs.forEach(cfg => {
      const throwG = new THREE.Group();
      throwG.position.z = cfg.z;
      throwG.rotation.z = cfg.crankPinAngle;

      // Czop korbowodowy (Crankpin journal) - w odległości crankRadius
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, pinWidth, 24), this.scene.matSteel);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0, crankRadius, 0); 
      pin.userData.name = "Czop korbowodowy";
      throwG.add(pin);

      // Kanał olejowy w czopie
      const oilHole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), this.scene.matDarkSteel);
      oilHole.position.set(0, crankRadius + 0.025, 0);
      oilHole.userData.name = "Kanał olejowy czopa korbowodowego";
      throwG.add(oilHole);

      // Ramiona wykorbienia (Webs) i przeciwciężary (Counterweights) z przodu i z tyłu czopa
      [-1, 1].forEach(dir => {
        const webZOff = dir * (pinWidth / 2 + webThick / 2);
        const web = new THREE.Mesh(webGeo, this.scene.matDarkSteel);
        web.position.set(0, 0, webZOff);
        web.userData.name = "Ramię wykorbienia i przeciwciężar";
        throwG.add(web);
      });

      crankMaster.add(throwG);
    });

    // ═══ CZOPY GŁÓWNE (Main Journals) NA OSI OBROTU (0, 0) ═══
    // Tworzone wyłącznie pomiędzy wykorbieniami oraz na końcach wału
    const allCylZ = cylinderConfigs.map(c => c.z);
    const minCylZ = Math.min(...allCylZ);
    const maxCylZ = Math.max(...allCylZ);
    const uniqueZ = [...new Set(allCylZ)].sort((a, b) => a - b);

    // 1. Czopy pośrednie pomiędzy sąsiednimi wykorbieniami
    for (let k = 0; k < uniqueZ.length - 1; k++) {
      const zA = uniqueZ[k];
      const zB = uniqueZ[k + 1];
      const jStart = zA + throwHalfWidth;
      const jEnd = zB - throwHalfWidth;
      const jLen = jEnd - jStart;
      if (jLen > 0.004) {
        const midJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, jLen, 24), this.scene.matSteel);
        midJ.rotation.x = Math.PI / 2;
        midJ.position.set(0, 0, (jStart + jEnd) / 2);
        midJ.userData.name = `Czop główny wału (Segment ${k + 1})`;
        crankMaster.add(midJ);
      }
    }

    // 2. Czop główny przedni (od pierwszego wykorbienia do koła zębatego)
    const frontStart = maxCylZ + throwHalfWidth;
    const frontEnd = maxZ + 0.05;
    if (frontEnd > frontStart) {
      const frontJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, frontEnd - frontStart, 24), this.scene.matSteel);
      frontJ.rotation.x = Math.PI / 2;
      frontJ.position.set(0, 0, (frontStart + frontEnd) / 2);
      frontJ.userData.name = "Czop główny przedni wału";
      crankMaster.add(frontJ);
    }

    // 3. Czop główny tylny (od ostatniego wykorbienia do koła zamachowego)
    const rearStart = minZ - 0.01;
    const rearEnd = minCylZ - throwHalfWidth;
    if (rearEnd > rearStart) {
      const rearJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, rearEnd - rearStart, 24), this.scene.matSteel);
      rearJ.rotation.x = Math.PI / 2;
      rearJ.position.set(0, 0, (rearStart + rearEnd) / 2);
      rearJ.userData.name = "Czop główny tylny wału";
      crankMaster.add(rearJ);
    }

    // Kołnierz montażowy koła zamachowego (Flywheel Flange)
    const flywheelFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 32), this.scene.matDarkSteel);
    flywheelFlange.rotation.x = Math.PI / 2;
    flywheelFlange.position.set(0, 0, rearStart);
    flywheelFlange.userData.name = "Kołnierz koła zamachowego";
    crankMaster.add(flywheelFlange);

    engineGroup.add(crankMaster);
    this.scene.crankMaster = crankMaster;

    const banks = {};
    cylinderConfigs.forEach(cfg => {
      // Group by approx bank angle to avoid precision issues
      const bankKey = cfg.bank.toFixed(2);
      if (!banks[bankKey]) banks[bankKey] = [];
      banks[bankKey].push(cfg);
    });

    this.scene.banksData = [];
    const headBase = deckHeight + 0.02 * boreScale + explodeDist * 1.5; 
    const isOHV = this.scene.config.valvetrain === "OHV" || this.scene.config.valvetrain === "valve_ohv";
    const valveBaseY = headBase + 0.084 + 0.025 * boreScale;
    const trueCamY = isOHV ? (rodLength * 0.5 + explodeDist * 0.5) : (valveBaseY + 0.095 * boreScale);
    const camOffsetX = (this.scene.config.valves === 4 ? 0.048 : 0.038) * boreScale;
    
    let firstBankOHV = true;

    Object.keys(banks).forEach(bankAngleStr => {
      const bankAngle = parseFloat(bankAngleStr);
      const cylinders = banks[bankAngleStr];

      // Dla VR: jedna wspólna głowica cross-flow (dolot po lewej inSign=-1, wydech po prawej exSign=1 dla obu rzędów)
      const flipBank = (this.scene.config.layout === 'V' || this.scene.config.layout === 'W' || this.scene.config.layout === 'Boxer') && bankAngle > 0.001;
      const inSign = flipBank ? 1 : -1;
      const exSign = -inSign;

      const bankG = new THREE.Group();
      bankG.rotation.z = bankAngle;
      engineGroup.add(bankG);

      const camBaseIn = new THREE.Group();
      const camBaseEx = new THREE.Group();
      bankG.add(camBaseIn);
      bankG.add(camBaseEx);
      
      const camShaftIn = new THREE.Group();
      const camShaftEx = new THREE.Group();
      camBaseIn.add(camShaftIn);
      camBaseEx.add(camShaftEx);
      
      const bMinZ = Math.min(...cylinders.map(c => c.z)) - (0.05 * boreScale);
      const bMaxZ = maxZ + 0.08; 
      const len = bMaxZ - bMinZ;
      const midZ = (bMinZ + bMaxZ) / 2;
      const gearZ = maxZ + 0.05;

      // Variables to store local X and Y for the OHV pushrods
      let localX = 0;
      let localY = 0;

      if (isOHV) {
          const globalCamX = (this.scene.config.layout === 'Inline' || this.scene.config.layout === 'VR') ? 0.16 * boreScale : 0;
          const globalCamY = (this.scene.config.layout === 'Inline' || this.scene.config.layout === 'VR') ? (rodLength * 0.5 + explodeDist * 0.5) : (rodLength * 0.35 + explodeDist * 0.5);
          
          localX = globalCamX * Math.cos(bankAngle) + globalCamY * Math.sin(bankAngle);
          localY = -globalCamX * Math.sin(bankAngle) + globalCamY * Math.cos(bankAngle);
          
          camBaseEx.position.set(localX, localY, 0);
          camBaseIn.visible = false;
          
          if (firstBankOHV) {
              const centralCamGroup = new THREE.Group();
              centralCamGroup.position.set(globalCamX, globalCamY, 0);
              
              const meshOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.scene.matBronze);
              meshOHV.rotation.x = Math.PI / 2;
              meshOHV.position.z = midZ;
              meshOHV.userData.name = "Wałek rozrządu (OHV)";
              centralCamGroup.add(meshOHV);
              
              const gearOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.scene.matGold);
              gearOHV.rotation.x = Math.PI / 2;
              gearOHV.position.z = gearZ;
              gearOHV.userData.name = "Koło wałka rozrządu (OHV)";
              centralCamGroup.add(gearOHV);
              
              engineGroup.add(centralCamGroup);
              this.scene.centralCamGroupOHV = centralCamGroup;
              this.scene.camshafts.push(centralCamGroup);
          }
          this.scene.camshafts.push(camShaftEx);
      } else {
          camBaseIn.position.set(inSign * camOffsetX, trueCamY, 0);
          camBaseEx.position.set(exSign * camOffsetX, trueCamY, 0);
          
          const meshIn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.scene.matBronze);
          meshIn.rotation.x = Math.PI / 2;
          meshIn.position.z = midZ;
          meshIn.userData.name = "Wałek rozrządu ssący";
          camShaftIn.add(meshIn);

          const meshEx = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.scene.matBronze);
          meshEx.rotation.x = Math.PI / 2;
          meshEx.position.z = midZ;
          meshEx.userData.name = "Wałek rozrządu wydechowy";
          camShaftEx.add(meshEx);

          const gearIn = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.scene.matGold);
          gearIn.rotation.x = Math.PI / 2;
          gearIn.position.z = gearZ;
          gearIn.userData.name = "Koło wałka ssącego";
          camShaftIn.add(gearIn);

          const gearEx = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.scene.matGold);
          gearEx.rotation.x = Math.PI / 2;
          gearEx.position.z = gearZ;
          gearEx.userData.name = "Koło wałka wydechowego";
          camShaftEx.add(gearEx);
          
          this.scene.camshafts.push(camShaftIn, camShaftEx);
      }

      cylinders.forEach(cfg => {
        const cylG = new THREE.Group();
        cylG.position.z = cfg.z;
        cylG.userData.cylId = cfg.id;
        bankG.add(cylG);

        const sleeve = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLength, 16)), this.scene.lineMat);
        sleeve.position.set(0, sleeveCenter + explodeDist, 0);
        sleeve.userData.name = "Tuleja cylindra (Zarys)";
        sleeve.visible = this.scene.config.showWireframes !== false;
        cylG.add(sleeve);

        const headWidth = Math.max(0.28, 2 * sleeveRadius + 0.06);
        const headDepth = zSpacing - 0.02;
        const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(headWidth, 0.16 * boreScale, headDepth)), this.scene.lineMat);
        head.position.set(0, headBase + 0.08 * boreScale, 0);
        if (this.scene.config.layout === 'VR') {
           head.scale.set(1.45, 1, 2.0); // scale Z to bridge gap between offset cylinders
           head.rotation.z = -bankAngle;
           head.position.x = -bankAngle * 0.2; // slight shift to center
        } else if (this.scene.config.layout === 'W') {
           head.scale.set(1.45, 1, 2.0);
           const wVRBaseAngle = bankAngle > 0 ? (72 * Math.PI/180)/2 : -(72 * Math.PI/180)/2;
           head.rotation.z = -(bankAngle - wVRBaseAngle);
        }
        head.userData.name = "Głowica cylindra (Zarys)";
        head.visible = this.scene.config.showWireframes !== false;
        cylG.add(head);

        const valvesList = [];
        const vOffZ = (this.scene.config.valves === 4 ? 0.045 : 0) * boreScale;
        const vOffX = 0.045 * boreScale;
        const vDiscR = (this.scene.config.valves === 4 ? 0.024 : 0.035) * boreScale;

        if (this.scene.config.valves === 4) {
            const vIn1 = this.createValve(this.scene.matSteel, "Ssący 1", vDiscR);
            const vIn2 = this.createValve(this.scene.matSteel, "Ssący 2", vDiscR);
            const vEx1 = this.createValve(this.scene.matSteel, "Wydechowy 1", vDiscR);
            const vEx2 = this.createValve(this.scene.matSteel, "Wydechowy 2", vDiscR);
            const sIn1 = this.createSpringMesh();
            const sIn2 = this.createSpringMesh();
            const sEx1 = this.createSpringMesh();
            const sEx2 = this.createSpringMesh();
            cylG.add(vIn1, vIn2, vEx1, vEx2, sIn1, sIn2, sEx1, sEx2);
            valvesList.push(
                { vg: vIn1, sp: sIn1, type: 'in', offZ: -vOffZ },
                { vg: vIn2, sp: sIn2, type: 'in', offZ: vOffZ },
                { vg: vEx1, sp: sEx1, type: 'ex', offZ: -vOffZ },
                { vg: vEx2, sp: sEx2, type: 'ex', offZ: vOffZ }
            );
        } else {
            const vIn = this.createValve(this.scene.matSteel, "Ssący", vDiscR);
            const vEx = this.createValve(this.scene.matSteel, "Wydechowy", vDiscR);
            const sIn = this.createSpringMesh();
            const sEx = this.createSpringMesh();
            cylG.add(vIn, vEx, sIn, sEx);
            
            if (this.scene.config.valvetrain === 'OHV') {
                // OHV: Zawory w jednej linii wzdłuż wału korbowego (oś Z)
                const vOffZOHV = 0.045 * boreScale;
                valvesList.push(
                    { vg: vIn, sp: sIn, type: 'in', offZ: -vOffZOHV, forceOffX: 0 },
                    { vg: vEx, sp: sEx, type: 'ex', offZ: vOffZOHV, forceOffX: 0 }
                );
            } else {
                // OHC: Zawory po bokach cylindra (oś X)
                valvesList.push(
                    { vg: vIn, sp: sIn, type: 'in', offZ: 0 },
                    { vg: vEx, sp: sEx, type: 'ex', offZ: 0 }
                );
            }
        }

        const sparkPlug = this.createSparkPlug();
        sparkPlug.position.set(0, headBase + 0.16 * boreScale + explodeDist, 0);
        cylG.add(sparkPlug);

        const fireMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0 });
        const fireMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09 * boreScale, 16, 16), fireMat);
        fireMesh.position.set(0, headBase + 0.04 * boreScale + explodeDist, 0); 
        cylG.add(fireMesh);

        // ═══ SFERA SSANIA (Intake Gas) ═══
        const inGasMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0, depthWrite: false });
        const inGas = new THREE.Mesh(new THREE.SphereGeometry(0.06 * boreScale, 12, 12), inGasMat);
        inGas.position.set(inSign * (0.06 * boreScale), headBase + 0.06 * boreScale, 0);
        inGas.userData.name = "Gazy ssące (powietrze)";
        cylG.add(inGas);

        // ═══ SFERA WYDECHU (Exhaust Gas) ═══
        const exGasMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0, depthWrite: false });
        const exGas = new THREE.Mesh(new THREE.SphereGeometry(0.06 * boreScale, 12, 12), exGasMat);
        exGas.position.set(exSign * (0.06 * boreScale), headBase + 0.06 * boreScale, 0);
        exGas.userData.name = "Spaliny (exhaust)";
        cylG.add(exGas);

        // ═══ WTRYSKIWACZ PALIWA (Fuel Injector) ═══
        const injectorG = new THREE.Group();
        const injBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.009, 0.05, 12), this.scene.matDarkSteel
        );
        injBody.userData.name = "Wtryskiwacz paliwa";
        injectorG.add(injBody);
        const injNozzle = new THREE.Mesh(
          new THREE.ConeGeometry(0.009, 0.015, 8), this.scene.matSilver
        );
        injNozzle.position.y = -0.032;
        injNozzle.rotation.x = Math.PI;
        injectorG.add(injNozzle);
        
        // Dynamiczne linie natrysku paliwa (Fuel Spray Streamlines)
        const sprayPoints = [];
        const sprayRays = 8;
        for (let s = 0; s < sprayRays; s++) {
          const sprayAng = (s / sprayRays) * Math.PI * 2;
          const spreadR = 0.02 * boreScale;
          sprayPoints.push(new THREE.Vector3(0, -0.035, 0));
          sprayPoints.push(new THREE.Vector3(
            Math.cos(sprayAng) * spreadR,
            -0.08,
            Math.sin(sprayAng) * spreadR
          ));
        }
        const sprayGeo = new THREE.BufferGeometry().setFromPoints(sprayPoints);
        const sprayMat = new THREE.LineBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0, depthWrite: false });
        const sprayLines = new THREE.LineSegments(sprayGeo, sprayMat);
        sprayLines.userData.name = "Strumień wtrysku paliwa";
        injectorG.add(sprayLines);

        injectorG.position.set(inSign * (0.07 * boreScale), headBase + 0.10 * boreScale, 0);
        injectorG.rotation.z = -inSign * (20 * Math.PI / 180);
        injectorG.userData.name = "Wtryskiwacz";
        cylG.add(injectorG);

        // ═══ OBLICZENIA MATEMATYCZNE TRANSFORMACJI PORTÓW DO UKŁADU SILNIKA ═══
        const localInPortX = inSign * (0.14 * boreScale);
        const localInPortY = headBase + 0.05 * boreScale;
        const localExPortX = exSign * (0.14 * boreScale);
        const localExPortY = headBase + 0.05 * boreScale;

        const inPortEngine = new THREE.Vector3(
          localInPortX * Math.cos(bankAngle) - localInPortY * Math.sin(bankAngle),
          localInPortX * Math.sin(bankAngle) + localInPortY * Math.cos(bankAngle),
          cfg.z
        );

        const exPortEngine = new THREE.Vector3(
          localExPortX * Math.cos(bankAngle) - localExPortY * Math.sin(bankAngle),
          localExPortX * Math.sin(bankAngle) + localExPortY * Math.cos(bankAngle),
          cfg.z
        );

        // Wektory normalne (kierunki wylotu/wlotu kołnierza głowicy)
        const inNormEngine = new THREE.Vector3(
          inSign * Math.cos(bankAngle),
          inSign * Math.sin(bankAngle),
          0
        ).normalize();

        const exNormEngine = new THREE.Vector3(
          exSign * Math.cos(bankAngle),
          exSign * Math.sin(bankAngle),
          0
        ).normalize();

        // Zapisz konfigurację dla uniwersalnego generatora dolotu, wydechu i linii przepływu
        this.scene.cylinderPositions.push({
          id: cfg.id,
          z: cfg.z,
          bank: cfg.bank,
          bankAngle: bankAngle,
          inPort: inPortEngine,
          exPort: exPortEngine,
          inNorm: inNormEngine,
          exNorm: exNormEngine,
          firingAngle: cfg.firingAngle,
          phaseOffset: cfg.phaseOffset,
          sprayLines: sprayLines,
          sprayMat: sprayMat
        });

        const pistonG = this.createPiston(boreRadius, pistonLength);
        cylG.add(pistonG);

        const rodG = this.createConnectingRod(rodLength);
        engineGroup.add(rodG);

        const lobeRotIn = cfg.firingAngle / 2 + Math.PI / 4;
        const lobeRotEx = cfg.firingAngle / 2 + (7 * Math.PI) / 4;

        this.scene.movingCylinders.push({
          id: cfg.id, z: cfg.z, bank: cfg.bank,
          crankPinAngle: cfg.crankPinAngle, phaseOffset: cfg.phaseOffset,
          crankRadius, rodLength, sleeve, head, pistonG, rodG,
          fireMesh, fireMat, sparkPlug,
          inGas, inGasMat, exGas, exGasMat,
          injFlash: sprayLines, injFlashMat: sprayMat
        });

        valvesList.forEach((vData) => {
            const isEx = vData.type === 'ex';
            const valveSign = isEx ? exSign : inSign;
            const xPos = vData.forceOffX !== undefined ? vData.forceOffX : (valveSign * vOffX);
            
            vData.vg.position.set(xPos, valveBaseY, vData.offZ);
            vData.sp.position.set(xPos, valveBaseY - 0.02, vData.offZ);
            
            const camGroup = (isOHV) ? camShaftEx : (isEx ? camShaftEx : camShaftIn);
            const lobeRot = isEx ? lobeRotEx : lobeRotIn;
            
            let lobeZOffset = vData.offZ;
            
            const lobe = this.createCamLobe();
            lobe.position.set(0, 0, cfg.z + lobeZOffset);
            lobe.rotation.z = lobeRot;
            camGroup.add(lobe);
            
            let pr = null;
            let ra = null;
            let prGeo = null;
            let prMesh = null;
            
            if (isOHV) {
                // Rocker arm & Pushrod for OHV
                // Umiejscowienie pushrodów po "wewnętrznej" stronie cylindra (od strony wałka w bloku)
                const pushrodSideSign = (localX >= 0) ? 1 : -1;
                
                ra = this.createRockerArm();
                // Oś dźwigienki nieco bliżej środka, ramię sięga zaworu (valveSign)
                ra.position.set(valveSign * vOffX, headBase + 0.12 * boreScale, cfg.z + lobeZOffset);
                
                // Rotacja dźwigienki, by łączyła zawór (valveSign * vOffX) z pushrodem (pushrodSideSign * 0.07)
                // W createRockerArm, środek to pivot. Lewa/prawa strona to końce.
                // Upraszczamy: po prostu obracamy tak, by wyglądało poprawnie
                ra.rotation.y = (valveSign < 0) ? Math.PI : 0;
                bankG.add(ra);
                
                prGeo = new THREE.CylinderGeometry(0.003, 0.003, 1, 8);
                prMesh = new THREE.Mesh(prGeo, this.scene.matSteel);
                prMesh.userData.name = "Laska popychacza (Pushrod)";
                bankG.add(prMesh);
            }

            this.scene.valvesToDrive.push({
                vg: vData.vg,
                sp: vData.sp,
                valveG: vData.vg,
                spring: vData.sp,
                pushrod: prMesh,
                rocker: ra,
                ra: ra,
                prMesh: prMesh,
                prGeo: prGeo,
                localCamX: localX,
                localCamY: localY,
                camGroup: camGroup,
                lobeRot: lobeRot,
                bankAngle: bankAngle,
                baseY: valveBaseY,
                offsetX: xPos,
                offsetZ: vData.offZ,
                prZ: cfg.z + lobeZOffset,
                isOHV: isOHV
            });
        });
      });

      let bankBelt = null;
      if (isOHV) {
        if (firstBankOHV) {
            const globalCamX = (this.scene.config.layout === 'Inline' || this.scene.config.layout === 'VR') ? 0.16 * boreScale : 0;
            const globalCamY = (this.scene.config.layout === 'Inline' || this.scene.config.layout === 'VR') ? (rodLength * 0.5 + explodeDist * 0.5) : (rodLength * 0.35 + explodeDist * 0.5);
            const beltPath = new THREE.CatmullRomCurve3([
              new THREE.Vector3(0, -0.045, 0),
              new THREE.Vector3(-0.045, 0, 0),
              new THREE.Vector3(-0.045, 0.045, 0),
              new THREE.Vector3(globalCamX - 0.042, globalCamY, 0),
              new THREE.Vector3(globalCamX, globalCamY + 0.042, 0),
              new THREE.Vector3(globalCamX + 0.042, globalCamY, 0),
              new THREE.Vector3(0.045, 0, 0)
            ], true);
            bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), this.scene.matBelt);
            bankBelt.position.set(0, 0, gearZ);
            bankBelt.userData.name = "Pasek rozrządu (OHV)";
            engineGroup.add(bankBelt); // Added globally for OHV
            firstBankOHV = false;
        }
      } else {
        const beltPath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-camOffsetX, 0, 0),
          new THREE.Vector3(-camOffsetX - 0.015, trueCamY / 2, 0),
          new THREE.Vector3(-camOffsetX - 0.042, trueCamY, 0),
          new THREE.Vector3(-camOffsetX, trueCamY + 0.042, 0),
          new THREE.Vector3(camOffsetX, trueCamY + 0.042, 0),
          new THREE.Vector3(camOffsetX + 0.042, trueCamY, 0),
          new THREE.Vector3(camOffsetX + 0.015, trueCamY / 2, 0),
          new THREE.Vector3(camOffsetX, 0, 0)
        ], true);
        bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), this.scene.matBelt);
        bankBelt.position.set(0, 0, gearZ);
        bankBelt.userData.name = "Pasek rozrządu";
        bankG.add(bankBelt); // Added per-bank for DOHC
      }

      this.scene.banksData.push({ bankG, camBaseIn, camBaseEx, bankBelt, bankAngle, inSign, exSign });
    });

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 1. UNIWERSALNY KOLEKTOR SSĄCY (Intake Manifold & Throttle Body) ═══
    // Przebudowano układ powietrza na JSON (AirSystem w engine_layout.json)
    // Obliczamy tylko pozycje dla listew paliwowych i runnerów.
    
    const plenumMidZ = (maxZ + minZ) / 2;
    let plenumX = 0;
    let plenumY = 0;

    if (layout === 'Inline' || layout === 'VR') {
      plenumX = -Math.max(0.18, 0.18 * boreScale + 0.04);
      plenumY = headBase + 0.12 * boreScale;
    } else if (layout === 'V' || layout === 'W') {
      plenumX = 0.0;
      plenumY = headBase * Math.cos(vAngle / 2) + 0.10 * boreScale;
    } else if (layout === 'Boxer') {
      plenumX = 0.0;
      plenumY = (rodLength + crankRadius) * 0.75 + explodeDist * 0.5;
    }

    const intakeG = new THREE.Group();
    engineGroup.add(intakeG);


    // ═══ LISTWY PALIWOWE (Fuel Rails) ═══
    if (layout === 'Inline' || layout === 'VR') {
      const fuelRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.010, engineLength + 0.08, 16), this.scene.matExhaust
      );
      fuelRail.rotation.x = Math.PI / 2;
      fuelRail.position.set(-Math.max(0.13, 0.13 * boreScale + 0.02), headBase + 0.08 * boreScale, plenumMidZ);
      fuelRail.userData.name = "Listwa wtryskowa (Fuel Rail)";
      intakeG.add(fuelRail);
    } else {
      // Dla V / Boxer / W — dwie listwy paliwowe wzdłuż każdego banku
      [-1, 1].forEach((side, bIdx) => {
        const railZ = plenumMidZ;
        const bAng = (layout === 'Boxer') ? (side * Math.PI / 2) : (side * (vAngle * 180 / Math.PI / 2) * Math.PI / 180);
        const inSideSign = (bAng > 0.001) ? 1 : -1;
        const railLocalX = inSideSign * (0.08 * boreScale);
        const railX = railLocalX * Math.cos(bAng) - (headBase + 0.08 * boreScale) * Math.sin(bAng);
        const railY = railLocalX * Math.sin(bAng) + (headBase + 0.08 * boreScale) * Math.cos(bAng);
        const fuelRail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.009, engineLength * 0.7 + 0.06, 16), this.scene.matExhaust
        );
        fuelRail.rotation.x = Math.PI / 2;
        fuelRail.position.set(railX, railY, railZ);
        fuelRail.userData.name = `Listwa wtryskowa (Bank #${bIdx + 1})`;
        intakeG.add(fuelRail);
      });
    }

    // ═══ RUNNERY DOLOTU (Intake Runners) + LINIE PRZEPŁYWU (Streamlines) ═══
    this.scene.cylinderPositions.forEach((cyl, idx) => {
      // Punkt startu z plenum
      let pStart = new THREE.Vector3();
      let pMid1 = new THREE.Vector3();
      let pMid2 = new THREE.Vector3();
      const pEnd = cyl.inPort.clone();

      if (layout === 'Inline' || layout === 'VR') {
        pStart.set(plenumX + 0.02, plenumY - 0.02, cyl.z);
        pMid1.set(plenumX * 0.7, plenumY + 0.04, cyl.z);
        pMid2.set(pEnd.x - 0.04, pEnd.y + 0.04, cyl.z);
      } else if (layout === 'V' || layout === 'W') {
        const sideSign = cyl.inPort.x < 0 ? 1 : -1;
        pStart.set(sideSign * 0.02, plenumY, cyl.z);
        pMid1.set(sideSign * 0.08, plenumY + 0.02, cyl.z);
        pMid2.set(pEnd.x + cyl.inNorm.x * 0.05, pEnd.y + cyl.inNorm.y * 0.05, cyl.z);
      } else if (layout === 'Boxer') {
        const sideSign = cyl.inPort.x < 0 ? -1 : 1;
        pStart.set(sideSign * 0.04, plenumY + 0.02, cyl.z);
        pMid1.set(sideSign * 0.16, plenumY + 0.08, cyl.z);
        pMid2.set(pEnd.x + cyl.inNorm.x * 0.06, pEnd.y + 0.08, cyl.z);
      }

      const runnerCurve = new THREE.CatmullRomCurve3([pStart, pMid1, pMid2, pEnd], false, 'centripetal', 0.2);
      const runnerMesh = new THREE.Mesh(
        new THREE.TubeGeometry(runnerCurve, 20, 0.016, 12, false), this.scene.matIntake
      );
      runnerMesh.userData.name = `Kolektor dolotowy (Kanał #${idx + 1})`;
      intakeG.add(runnerMesh);

      // Dynamiczne linie przepływu powietrza
      const streamDashes = [];
      const numStreams = 3;
      for (let s = 0; s < numStreams; s++) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(runnerCurve.getPoints(30));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x00e5ff,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        intakeG.add(lineMesh);
        streamDashes.push({ lineMesh, lineMat, offset: s / numStreams });
      }

      this.scene.flowStreamlines.push({
        type: 'intake',
        cylId: cyl.id,
        phaseOffset: cyl.phaseOffset,
        streams: streamDashes
      });
    });
    engineGroup.add(intakeG);

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 2. UNIWERSALNY KOLEKTOR WYDECHOWY (Exhaust Manifold & Headers) ═══
    // ════════════════════════════════════════════════════════════════════════
    const exhaustG = new THREE.Group();
    const exhaustX = Math.max(0.32, sleeveRadius + 0.20); // Położenie traktu wydechowego poza obrysem koła zamachowego
    let exhaustMergePoint = new THREE.Vector3(exhaustX, -0.12, minZ - 0.20);

    if (layout === 'Inline' || layout === 'VR') {
      // 4-1 Header po prawej stronie silnika - kolektor zbiorczy na środku silnika (Z = 0)
      const colX = exhaustX, colY = -0.10, colZ = 0.0;
      const collectorPoint = new THREE.Vector3(colX, colY, colZ);
      exhaustMergePoint.set(colX, -0.12, minZ - 0.15);

      // Zbiornik / złącze 4-1 (Pyramid / Merge Collector)
      const collectorMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.040, 0.026, 0.14, 16), this.scene.matDarkSteel
      );
      collectorMesh.rotation.x = Math.PI / 2 - 0.2;
      collectorMesh.position.set(colX, colY, colZ);
      collectorMesh.userData.name = "Kolektor zbiorczy (Centrum Z=0)";
      exhaustG.add(collectorMesh);

      // Rury wydechowe (runners) z poszczególnych cylindrów zbiegające się w punkcie Z = 0
      this.scene.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone();
        // Wyprowadzenie rury po wektorze normalnym na zewnątrz poza obrys bloku
        const p1 = pStart.clone().addScaledVector(cyl.exNorm, 0.08);
        const perpOffset = 0.032 * Math.sin((idx / Math.max(1, this.scene.cylinderPositions.length - 1)) * Math.PI);
        const p2 = new THREE.Vector3(colX + 0.055, pStart.y * 0.35 + colY * 0.65 + perpOffset, pStart.z * 0.4 + colZ * 0.6);
        const pEnd = collectorPoint.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.25);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 24, 0.016, 12, false), this.scene.matExhaust
        );
        headerMesh.userData.name = `Kolektor wydechowy (Rura #${idx + 1})`;
        exhaustG.add(headerMesh);

        // Linie przepływu spalin (Exhaust Streamlines)
        const lineGeo = new THREE.BufferGeometry().setFromPoints(headerCurve.getPoints(24));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xff3b00,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        exhaustG.add(lineMesh);

        this.scene.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });

      // Rura spustowa (Downpipe) od kolektora 4-1 (Z=0) do traktu podwozia - omija bezpiecznie koło zamachowe
      const pt1 = new THREE.Vector3(colX + 0.02, colY - 0.04, (colZ + exhaustMergePoint.z) * 0.5);
      const downpipeCurve = new THREE.CatmullRomCurve3([
        collectorPoint.clone().add(new THREE.Vector3(0, -0.01, -0.06)),
        pt1,
        exhaustMergePoint
      ]);
      this.scene.exhaustOutTangentLocal = new THREE.Vector3().subVectors(exhaustMergePoint, pt1).normalize();
      
      const downpipeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(downpipeCurve, 16, 0.022, 12, false), this.scene.matExhaustPipe
      );
      downpipeMesh.userData.name = "Kolektor (Downpipe 1)";
      exhaustG.add(downpipeMesh);
    } else if (layout === 'V' || layout === 'W') {
      // Dwa kolektory po bokach (Lewy i Prawy) wyprowadzone na zewnątrz głowic i łączące się w Y-pipe
      const maxExX = Math.max(...this.scene.cylinderPositions.map(c => Math.abs(c.exPort.x)), 0.38);
      const colXOffset = maxExX + 0.08; // kolektor bezpiecznie poza obrysem cylindrów i świec
      const colL = new THREE.Vector3(-colXOffset, -0.10, minZ - 0.05);
      const colR = new THREE.Vector3(colXOffset, -0.10, minZ - 0.05);
      exhaustMergePoint.set(exhaustX, -0.12, minZ - 0.20);

      this.scene.cylinderPositions.forEach((cyl, idx) => {
        const isLeft = cyl.exPort.x < 0;
        const targetCol = isLeft ? colL : colR;
        const sideSign = isLeft ? -1 : 1;
        const pStart = cyl.exPort.clone();
        
        // P1 odsuwa się w kierunku wektora normalnego wylotu (na zewnątrz głowicy z dala od świecy)
        const p1 = pStart.clone().addScaledVector(cyl.exNorm, 0.07);
        // P2 schodzi w dół po zewnętrznej stronie silnika ku kolektorowi zbiorczemu
        const p2 = new THREE.Vector3(
          sideSign * (colXOffset + 0.02),
          pStart.y * 0.3 + targetCol.y * 0.7,
          pStart.z * 0.4 + targetCol.z * 0.6
        );
        const pEnd = targetCol.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), this.scene.matExhaust
        );
        headerMesh.userData.name = `Kolektor wydechowy (Rura #${idx + 1})`;
        exhaustG.add(headerMesh);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(headerCurve.getPoints(24));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xff3b00,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        exhaustG.add(lineMesh);

        this.scene.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });

      // Y-Pipe łączący oba banki (tylko jeśli nie jest to true dual exhaust)
      this.scene.colLWorld = colL.clone();
      this.scene.colRWorld = colR.clone();
      const isTrueDual = this.scene.config.exhaustPipes === 'dual'; // true dual dla V/W/Boxer

      if (!isTrueDual) {
        const yLeftCurve = new THREE.CatmullRomCurve3([
          colL,
          new THREE.Vector3(-colXOffset * 0.5, -0.12, minZ - 0.12),
          new THREE.Vector3(0.00, -0.12, minZ - 0.16),
          exhaustMergePoint
        ]);
        const yRightCurve = new THREE.CatmullRomCurve3([
          colR,
          new THREE.Vector3(colXOffset * 0.6, -0.10, minZ - 0.12),
          exhaustMergePoint
        ]);
        const yLeftMesh = new THREE.Mesh(new THREE.TubeGeometry(yLeftCurve, 16, 0.020, 8, false), this.scene.matExhaustPipe);
        const yRightMesh = new THREE.Mesh(new THREE.TubeGeometry(yRightCurve, 16, 0.020, 8, false), this.scene.matExhaustPipe);
        yLeftMesh.userData.name = "Rura Y-Pipe (Lewa)";
        yRightMesh.userData.name = "Rura Y-Pipe (Prawa)";
        exhaustG.add(yLeftMesh, yRightMesh);
      }
    } else if (layout === 'Boxer') {
      // Dla Boxera
      const isTrueDual = this.scene.config.exhaustPipes === 'dual';
      exhaustMergePoint.set(exhaustX, -0.14, minZ - 0.15);
      
      this.scene.colLWorld = new THREE.Vector3(-exhaustX, -0.14, minZ - 0.15);
      this.scene.colRWorld = new THREE.Vector3(exhaustX, -0.14, minZ - 0.15);

      this.scene.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone(); // znajduje się na dole głowicy (y < 0)
        const p1 = pStart.clone().add(new THREE.Vector3(0, -0.06, 0));
        const sideSign = cyl.exPort.x < 0 ? -1 : 1;
        
        const targetCol = (isTrueDual) ? (sideSign < 0 ? this.scene.colLWorld : this.scene.colRWorld) : exhaustMergePoint;
        
        const p2 = (sideSign < 0)
          ? new THREE.Vector3(0.0, -0.16, cyl.z * 0.5 + targetCol.z * 0.5)
          : new THREE.Vector3(0.22, -0.15, cyl.z * 0.5 + targetCol.z * 0.5);
        const pEnd = targetCol.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), this.scene.matExhaust
        );
        headerMesh.userData.name = `Kolektor wydechowy Boxer (Rura #${idx + 1})`;
        exhaustG.add(headerMesh);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(headerCurve.getPoints(24));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xff3b00,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        exhaustG.add(lineMesh);

        this.scene.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });
    }
    engineGroup.add(exhaustG);

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 3. PEŁNY UKŁAD WYDECHOWY DO TYŁU POJAZDU (Single / Dual Exhaust) ══
    // ════════════════════════════════════════════════════════════════════════
    this.scene.carGroup.add(this.scene.engineMountGroup);
    this.scene.engineGroup = engineGroup;
    this.scene.engineZMin = minZ; // Used to place gearbox securely behind engine

    this.scene.engineMountGroup.updateMatrixWorld(true);
    const mergePointWorld = exhaustMergePoint.clone().applyMatrix4(this.scene.engineMountGroup.matrixWorld);
    
    let startPointL = mergePointWorld;
    let startPointR = mergePointWorld;
    if (this.scene.config.exhaustPipes === 'dual' && (layout === 'V' || layout === 'W' || layout === 'Boxer')) {
      if (this.scene.colLWorld) startPointL = this.scene.colLWorld.clone().applyMatrix4(this.scene.engineMountGroup.matrixWorld);
      if (this.scene.colRWorld) startPointR = this.scene.colRWorld.clone().applyMatrix4(this.scene.engineMountGroup.matrixWorld);
    }

    const fullExhaustG = new THREE.Group();
    const isDual = this.scene.config.exhaustPipes === 'dual';

    // Rysowanie traktu wydechowego dla wybranej strony (+1 prawa, -1 lewa)
    const buildExhaustTract = (tractSign, namePrefix, startPointWorld, needsCrossover) => {
      const underbodyX = (this.scene.config.orientation === 'transverse') ? (tractSign * 0.12) : (tractSign * exhaustX);
      const exhaustY = 0.25;
      
      // Przesuwamy elementy bliżej silnika (-0.40 zamiast -0.55)
      const flexStart = new THREE.Vector3(underbodyX, exhaustY, -0.40);
      
      let initialPoint = startPointWorld;

      // Jeśli potrzebny X-Pipe (tylko w inline przy dual, gdzie obie rury idą z jednego kolektora)
      if (needsCrossover) {
        const xCrossoverCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.12, exhaustY, -0.40),
          new THREE.Vector3(0, exhaustY, -0.45),
          flexStart
        ]);
        const xCrossoverMesh = new THREE.Mesh(new THREE.TubeGeometry(xCrossoverCurve, 12, 0.020, 8, false), this.scene.matExhaustPipe);
        xCrossoverMesh.userData.name = "Rura rozdzielająca wydech (Dual X-Pipe)";
        fullExhaustG.add(xCrossoverMesh);
        initialPoint = new THREE.Vector3(0.12, exhaustY, -0.40);
      } else {
        // Dokładny wektor pobrany z poprzedniej rury, aby połączyć je w idealnie jedną, ciągłą rurę (zero załamań 90 stopni)
        const outTangentLocal = this.scene.exhaustOutTangentLocal || new THREE.Vector3(0, -0.2, -1).normalize();
        const outTangentWorld = outTangentLocal.applyQuaternion(this.scene.engineMountGroup.quaternion);
        
        // Pierwszy punkt po wyjściu z kolektora (utrzymuje stały kąt wyjścia)
        const p1 = startPointWorld.clone().add(outTangentWorld.clone().multiplyScalar(0.15));
        
        let curvePoints = [];
        if (this.scene.config.orientation === 'transverse') {
          // Logiczne poprowadzenie rury pod silnikiem ze zdefiniowanym kątem wejścia i wyjścia
          const underEngineZ = this.scene.engineMountGroup ? this.scene.engineMountGroup.position.z : startPointWorld.z;
          const straightMidZ = (underEngineZ - 0.3 + flexStart.z + 0.15) / 2;
          curvePoints = [
            startPointWorld,
            p1,
            new THREE.Vector3(startPointWorld.x * 0.7 + underbodyX * 0.3, exhaustY - 0.05, underEngineZ), // Przejście pod miską
            new THREE.Vector3(underbodyX, exhaustY, underEngineZ - 0.3), // Wyjście za silnik
            new THREE.Vector3(underbodyX, exhaustY, straightMidZ), // Stabilizacja długiego prostego odcinka
            flexStart.clone().add(new THREE.Vector3(0, 0, 0.15)), // Wymuszenie prostego kąta na wejściu
            flexStart
          ];
        } else {
          // Tradycyjne płynne zejście dla silników wzdłużnych
          const pMid = new THREE.Vector3(
              startPointWorld.x * 0.5 + underbodyX * 0.5,
              (startPointWorld.y + exhaustY) * 0.5,
              (startPointWorld.z + flexStart.z) * 0.5
          );
          const straightMidZ = (pMid.z + flexStart.z + 0.15) / 2;
          curvePoints = [
            startPointWorld,
            p1,
            pMid,
            new THREE.Vector3(underbodyX, exhaustY, straightMidZ), // Stabilizacja długiego prostego odcinka
            flexStart.clone().add(new THREE.Vector3(0, 0, 0.15)),
            flexStart
          ];
        }
        // Używamy typu centripetal i małego napięcia, aby rura nie "falowała" (loop-de-loop) na długich odcinkach
        const downpipeCurve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal', 0.2);
        const downpipeMesh = new THREE.Mesh(
          new THREE.TubeGeometry(downpipeCurve, 20, 0.022, 12, false), this.scene.matExhaustPipe
        );
        downpipeMesh.userData.name = `${namePrefix} Rura spustowa kolektora (Downpipe)`;
        fullExhaustG.add(downpipeMesh);
      }

      const flexEnd = new THREE.Vector3(underbodyX, exhaustY, -0.52);
      const flexCurve = new THREE.CatmullRomCurve3([flexStart, flexEnd]);
      const flexMesh = new THREE.Mesh(new THREE.TubeGeometry(flexCurve, 10, 0.024, 12, false), this.scene.matFlexPipe);
      flexMesh.userData.name = `${namePrefix} Złącze elastyczne (Flex Pipe)`;
      fullExhaustG.add(flexMesh);

      // Katalizator (przesunięty bliżej silnika, Z = -0.65)
      const catZ = -0.65;
      const catMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.22, 20), this.scene.matCatalyst
      );
      catMesh.rotation.x = Math.PI / 2;
      catMesh.position.set(underbodyX, exhaustY, catZ);
      catMesh.scale.set(1.3, 1, 0.8);
      catMesh.userData.name = `${namePrefix} Katalizator spalin`;
      fullExhaustG.add(catMesh);

      // Rura łącząca Flex Pipe z Katalizatorem
      const p1Curve = new THREE.LineCurve3(flexEnd, new THREE.Vector3(underbodyX, exhaustY, catZ + 0.11));
      const p1Mesh = new THREE.Mesh(new THREE.TubeGeometry(p1Curve, 4, 0.020, 8, false), this.scene.matExhaustPipe);
      p1Mesh.userData.name = `${namePrefix} Rura przed katalizatorem`;
      fullExhaustG.add(p1Mesh);

      // Tłumik środkowy (przesunięty na Z = -1.05)
      const resZ = -1.05; 
      const resMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.35, 20), this.scene.matMuffler
      );
      resMesh.rotation.x = Math.PI / 2;
      resMesh.position.set(underbodyX, exhaustY, resZ);
      resMesh.userData.name = `${namePrefix} Tłumik środkowy (Resonator)`;
      fullExhaustG.add(resMesh);

      // Rura łącząca Katalizator z Tłumikiem środkowym
      const p2Curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(underbodyX, exhaustY, catZ - 0.11),
        new THREE.Vector3(underbodyX, exhaustY, resZ + 0.175)
      ]);
      const p2Mesh = new THREE.Mesh(new THREE.TubeGeometry(p2Curve, 8, 0.020, 8, false), this.scene.matExhaustPipe);
      p2Mesh.userData.name = `${namePrefix} Rura środkowa wydechu`;
      fullExhaustG.add(p2Mesh);

      // Tłumik końcowy (Rear Muffler)
      const rearZ = VehicleDimensions.wheelbaseRearZ;
      const rearMufflerZ = rearZ - 0.40; // -1.75
      const mufflerX = tractSign * 0.38;
      
      const rearMuffler = new THREE.Mesh(
        new THREE.BoxGeometry(0.30, 0.16, 0.42), this.scene.matMuffler
      );
      rearMuffler.position.set(mufflerX, exhaustY, rearMufflerZ);
      rearMuffler.userData.name = `${namePrefix} Tłumik końcowy (Rear Silencer)`;
      fullExhaustG.add(rearMuffler);

      // Rura podwozia: Tłumik środkowy -> Tłumik końcowy
      const p3Curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(underbodyX, exhaustY, resZ - 0.175),
        new THREE.Vector3(underbodyX + (mufflerX - underbodyX) * 0.3, exhaustY, rearZ - 0.08),
        new THREE.Vector3(underbodyX + (mufflerX - underbodyX) * 0.7, exhaustY, rearZ - 0.15),
        new THREE.Vector3(mufflerX, exhaustY, rearMufflerZ + 0.21)
      ], false, 'centripetal', 0.2);
      const p3Mesh = new THREE.Mesh(new THREE.TubeGeometry(p3Curve, 20, 0.020, 8, false), this.scene.matExhaustPipe);
      p3Mesh.userData.name = `${namePrefix} Rura podwoziowa`;
      fullExhaustG.add(p3Mesh);

      // Chromowana końcówka wydechu
      const tipZ = rearZ - 0.70;
      const tailpipeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.30, 24), this.scene.matChrome
      );
      tailpipeMesh.rotation.x = Math.PI / 2;
      tailpipeMesh.position.set(mufflerX, exhaustY, tipZ);
      tailpipeMesh.userData.name = `${namePrefix} Końcówka wydechu (Tailpipe)`;
      fullExhaustG.add(tailpipeMesh);

      const p4Curve = new THREE.LineCurve3(
        new THREE.Vector3(mufflerX, exhaustY, rearMufflerZ - 0.21),
        new THREE.Vector3(mufflerX, exhaustY, tipZ + 0.15)
      );
      const p4Mesh = new THREE.Mesh(new THREE.TubeGeometry(p4Curve, 4, 0.028, 8, false), this.scene.matExhaustPipe);
      p4Mesh.userData.name = `${namePrefix} Rura końcówki wydechu`;
      fullExhaustG.add(p4Mesh);

      // Dynamiczna linia przepływu spalin
      const fullExhaustCurve = new THREE.CatmullRomCurve3([
        initialPoint,
        flexStart,
        flexEnd,
        new THREE.Vector3(underbodyX, exhaustY, catZ),
        new THREE.Vector3(underbodyX, exhaustY, resZ),
        new THREE.Vector3(underbodyX + (mufflerX - underbodyX) * 0.5, exhaustY, rearZ - 0.15),
        new THREE.Vector3(mufflerX, exhaustY, rearMufflerZ),
        new THREE.Vector3(mufflerX, exhaustY, tipZ)
      ], false, 'centripetal', 0.2);

      const mainExhaustLineGeo = new THREE.BufferGeometry().setFromPoints(fullExhaustCurve.getPoints(60));
      const mainExhaustLine = new THREE.Line(mainExhaustLineGeo, this.scene.matStreamlineMainExhaust);
      fullExhaustG.add(mainExhaustLine);
      this.scene.exhaustMainStreamlines.push({ lineMesh: mainExhaustLine, curve: fullExhaustCurve });
    };

    const isTrueDualLayout = isDual && (layout === 'V' || layout === 'W' || layout === 'Boxer');

    // Zbuduj prawy trakt wydechowy (zawsze)
    buildExhaustTract(1, isDual ? "Prawy" : "", startPointR, false);

    // Zbuduj lewy trakt wydechowy (jeśli dual exhaust)
    if (isDual) {
      buildExhaustTract(-1, "Lewy", startPointL, !isTrueDualLayout);
    }

    this.scene.carGroup.add(fullExhaustG);

    // ════════════════════════════════════════════════════════════════════════
  }

  createValve(material, name, vDiscR) {
    return createValve(this.scene, material, name, vDiscR);
  }

  createSpringMesh() {
    return createSpringMesh(this.scene);
  }

  createRockerArm() {
    return createRockerArm(this.scene);
  }

  createCamLobe() {
    return createCamLobe(this.scene);
  }

  getCamRadius(angle) {
    return getCamRadius(angle);
  }
}
