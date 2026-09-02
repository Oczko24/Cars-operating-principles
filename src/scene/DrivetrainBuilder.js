import * as THREE from 'three';
import { VehicleDimensions } from './VehicleConfig.js';

export class DrivetrainBuilder {
  constructor(scene) {
    this.scene = scene;
  }


buildDrivetrainAssembly() {
  const isTransverse = this.scene.config.orientation === 'transverse';
  const layout = this.scene.config.drivetrainLayout || "RWD";
  const gbScaleZ = isTransverse ? 0.45 : 1.0; // Shorten the gearbox significantly for transverse

  // 1. SPRZĘGŁO i SKRZYNIA BIEGÓW (przytwierdzone do silnika)
  const transGroup = new THREE.Group();

  // Sprzęgło
  const clutchGroup = new THREE.Group();
  clutchGroup.position.set(0, 0, this.scene.engineZMin - 0.05);

  const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), this.scene.matDarkSteel);
  flywheel.rotation.x = Math.PI / 2;
  flywheel.userData.name = "Koło Zamachowe";
  clutchGroup.add(flywheel);

  const frictionDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 32), this.scene.matBronze);
  frictionDisk.rotation.x = Math.PI / 2;
  frictionDisk.position.z = -0.03;
  frictionDisk.userData.name = "Tarcza Sprzęgła (Cierna)";
  clutchGroup.add(frictionDisk);

  const pressurePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32), this.scene.matSteel);
  pressurePlate.rotation.x = Math.PI / 2;
  pressurePlate.position.z = -0.06;
  pressurePlate.userData.name = "Docisk Sprzęgła";
  clutchGroup.add(pressurePlate);

  if (this.scene.config.clutchType === 'dual') {
    const frictionDisk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32), this.scene.matBronze);
    frictionDisk2.rotation.x = Math.PI / 2;
    frictionDisk2.position.z = -0.09;
    frictionDisk2.userData.name = "Druga Tarcza Sprzęgła (DCT)";
    clutchGroup.add(frictionDisk2);
  }

  this.scene.flywheelMesh = flywheel;
  this.scene.pressurePlateMesh = pressurePlate;
  this.scene.frictionDiskMesh = frictionDisk;
  transGroup.add(clutchGroup);

  // Skrzynia Biegów
  const gearbox = new THREE.Group();
  gearbox.position.set(0, 0, this.scene.engineZMin - 0.15);
  // Remove the magical squishing. For transverse, we'll wrap it in a case or just keep it realistic length.
  // Real transaxles have gears stacked side-by-side or parallel. We'll leave the length but offset it.
  

  // Wałek wejściowy (Input Shaft)
  const inputGroup = new THREE.Group();
  inputGroup.position.z = 0.15;
  const inShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 16), this.scene.matSteel);
  inShaft.rotation.x = Math.PI / 2;
  inputGroup.add(inShaft);
  const inGear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), this.scene.matGold);
  inGear.rotation.x = Math.PI / 2;
  inGear.position.z = -0.04;
  inGear.userData.name = "Zębatka Napędowa Wałka Sprzęgłowego";
  inputGroup.add(inGear);
  gearbox.add(inputGroup);
  this.scene.gbInputGroup = inputGroup;

  // Wałek pośredni (Countershaft / Layshaft)
  const counterGroup = new THREE.Group();
  counterGroup.position.y = -0.14;
  counterGroup.position.z = -0.15;
  const counterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 16), this.scene.matDarkSteel);
  counterShaft.rotation.x = Math.PI / 2;
  counterGroup.add(counterShaft);

  const cGears = [
    { r: 0.08, z: 0.26 },
    { r: 0.04, z: 0.12 },
    { r: 0.06, z: 0.02 },
    { r: 0.08, z: -0.08 },
    { r: 0.10, z: -0.18 },
    { r: 0.04, z: -0.28 }
  ];
  cGears.forEach((g) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02, 24), this.scene.matSteel);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = g.z;
    counterGroup.add(mesh);
  });
  gearbox.add(counterGroup);
  this.scene.gbCounterGroup = counterGroup;

  // Wałek główny wyjściowy (Main Output Shaft)
  const outputGroup = new THREE.Group();
  outputGroup.position.z = -0.25;
  const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 16), this.scene.matDarkSteel);
  outShaft.rotation.x = Math.PI / 2;
  outputGroup.add(outShaft);

  const oGears = [
    { r: 0.10, z: 0.22, name: "Bieg 1" },
    { r: 0.08, z: 0.12, name: "Bieg 2" },
    { r: 0.06, z: 0.02, name: "Bieg 3" },
    { r: 0.04, z: -0.08, name: "Bieg 5" },
    { r: 0.10, z: -0.18, name: "Bieg R" }
  ];
  this.scene.gbOutGears = [];
  oGears.forEach(g => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02, 24), this.scene.matBronze);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = g.z;
    mesh.userData.name = "Zębatka " + g.name;
    outputGroup.add(mesh);
    this.scene.gbOutGears.push(mesh);
  });

  const syncMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
  const sync1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), syncMat);
  sync1.rotation.x = Math.PI / 2;
  sync1.position.z = 0.17;
  outputGroup.add(sync1);
  this.scene.gbSync12 = sync1;

  const sync2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), syncMat);
  sync2.rotation.x = Math.PI / 2;
  sync2.position.z = 0.07;
  outputGroup.add(sync2);
  this.scene.gbSync34 = sync2;

  gearbox.add(outputGroup);
  this.scene.gbOutputGroup = outputGroup;

  // Obudowa skrzyni biegów (Zarys)
  const gbCasingGeo = new THREE.BoxGeometry(0.35, 0.35, 0.65);
  const gbCasing = new THREE.LineSegments(new THREE.EdgesGeometry(gbCasingGeo), this.scene.crankcaseLineMat);
  gbCasing.position.set(0, -0.05, -0.15);
  gbCasing.userData.name = "Obudowa Skrzyni Biegów";
  gearbox.add(gbCasing);

  transGroup.add(gearbox);

  this.scene.engineMountGroup.add(transGroup);

  // 2. HELPER TWORZENIA DYFERENCJAŁU
  const createDiff = (zPos, xPos, isFront) => {
    const diffGroup = new THREE.Group();
    diffGroup.position.set(xPos, VehicleDimensions.diffY, zPos);

    const diffCasing = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(0.22, 16, 16)),
      this.scene.crankcaseLineMat
    );
    diffCasing.userData.name = "Obudowa Dyferencjału (Zarys)";
    diffGroup.add(diffCasing);

    const pinionGear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.12, 16), this.scene.matGold);
    pinionGear.rotation.x = Math.PI / 2;
    pinionGear.position.z = isFront ? -0.14 : 0.14;
    pinionGear.userData.name = "Wałek Atakujący (Pinion)";
    diffGroup.add(pinionGear);
    if (!isFront || layout === "FWD") this.scene.pinionMesh = pinionGear;

    const ringGear = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32), this.scene.matBronze);
    ringGear.rotation.z = Math.PI / 2;
    ringGear.position.x = -0.06;
    ringGear.userData.name = "Koło Talerzowe (Ring Gear)";
    diffGroup.add(ringGear);
    if (!isFront || layout === "FWD") this.scene.ringGearMesh = ringGear;

    const carrier = new THREE.Group();
    carrier.position.x = -0.03;

    const carrierBox = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.22), this.scene.matDarkSteel);
    carrier.add(carrierBox);

    const spiderTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.04, 16), this.scene.matSteel);
    spiderTop.position.y = 0.07;
    spiderTop.userData.name = "Satelita Górny (Krzyżak)";
    carrier.add(spiderTop);

    const spiderBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.04, 16), this.scene.matSteel);
    spiderBottom.rotation.x = Math.PI;
    spiderBottom.position.y = -0.07;
    spiderBottom.userData.name = "Satelita Dolny (Krzyżak)";
    carrier.add(spiderBottom);

    if (this.scene.config.diffType === 'lsd_mech') {
      const lsdPlates = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16), this.scene.matDarkSteel);
      lsdPlates.rotation.z = Math.PI / 2;
      lsdPlates.userData.name = "Płytki Cierne (LSD 1.5 Way)";
      carrier.add(lsdPlates);
    } else if (this.scene.config.diffType === 'locker') {
      const lockerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 16), this.scene.matGold);
      lockerPin.rotation.z = Math.PI / 2;
      lockerPin.userData.name = "Blokada 100% (Sprzęgło Kłowe)";
      carrier.add(lockerPin);
    }

    diffGroup.add(carrier);
    if (!isFront || layout === "FWD") this.scene.diffCarrier = carrier;

    // Półosie napędowe
    const leftAxle = new THREE.Group();
    const rightAxle = new THREE.Group();

    const sideGearL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.04, 16), this.scene.matGold);
    sideGearL.rotation.z = -Math.PI / 2;
    sideGearL.position.x = -0.03;
    sideGearL.userData.name = "Koło Koronowe Lewe";
    leftAxle.add(sideGearL);

    const sideGearR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.04, 16), this.scene.matGold);
    sideGearR.rotation.z = Math.PI / 2;
    sideGearR.position.x = 0.03;
    sideGearR.userData.name = "Koło Koronowe Prawe";
    rightAxle.add(sideGearR);

    // Długość półosi obliczana od pozycji dyferencjału do kół
    const leftShaftLen = Math.abs(xPos - (-VehicleDimensions.trackWidthHalf));
    const axleShaftL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, leftShaftLen, 16), this.scene.matSteel);
    axleShaftL.rotation.z = Math.PI / 2;
    axleShaftL.position.x = -leftShaftLen / 2;
    axleShaftL.userData.name = "Półoś Lewa";
    leftAxle.add(axleShaftL);

    const rightShaftLen = Math.abs(xPos - VehicleDimensions.trackWidthHalf);
    const axleShaftR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, rightShaftLen, 16), this.scene.matSteel);
    axleShaftR.rotation.z = Math.PI / 2;
    axleShaftR.position.x = rightShaftLen / 2;
    axleShaftR.userData.name = "Półoś Prawa";
    rightAxle.add(axleShaftR);

    diffGroup.add(leftAxle);
    diffGroup.add(rightAxle);

    if (!isFront || layout === "FWD") {
      this.scene.leftAxleG = leftAxle;
      this.scene.rightAxleG = rightAxle;
    }

    this.scene.carGroup.add(diffGroup);
    return diffGroup;
  };

  // 3. ROZMIESZCZENIE UKŁADU NAPĘDOWEGO
  const diffZFront = VehicleDimensions.wheelbaseFrontZ;
  const diffZRear = VehicleDimensions.wheelbaseRearZ;

  this.scene.engineMountGroup.updateMatrixWorld(true);
  const gbOutLocal = new THREE.Vector3(0, 0, this.scene.engineZMin - 0.5);
  const gbOutWorld = gbOutLocal.clone().applyMatrix4(this.scene.engineMountGroup.matrixWorld);

  if (layout === "FWD") {
    createDiff(diffZFront, isTransverse ? 0.18 : 0.0, true);
    this.scene.propShaftMesh = null;
  } else if (layout === "RWD") {
    const rearDiff = createDiff(diffZRear, 0.0, false);
    
    // For transverse RWD (very rare, e.g. some mid-engine), prop shaft comes from center of car roughly
    const ptuStart = isTransverse ? new THREE.Vector3(0, VehicleDimensions.diffY, diffZFront) : gbOutWorld;
    const diffInWorld = new THREE.Vector3(0, VehicleDimensions.diffY, diffZRear + 0.14);
    const dist = ptuStart.distanceTo(diffInWorld);

    const propGroup = new THREE.Group();
    propGroup.position.copy(new THREE.Vector3().addVectors(ptuStart, diffInWorld).multiplyScalar(0.5));
    propGroup.lookAt(diffInWorld);

    const propGeo = new THREE.CylinderGeometry(0.035, 0.035, dist, 16);
    propGeo.rotateX(Math.PI / 2);
    const propShaft = new THREE.Mesh(propGeo, this.scene.matSteel);
    propShaft.userData.name = "Wał Napędowy (Prop shaft)";
    propGroup.add(propShaft);
    this.scene.carGroup.add(propGroup);
    this.scene.propShaftMesh = propShaft;
  } else if (layout === "AWD" || layout === "4x4") {
    const frontDiff = createDiff(diffZFront, isTransverse ? 0.18 : 0.0, true);
    const rearDiff = createDiff(diffZRear, 0.0, false);

    // Skrzynia rozdzielcza (Transfer Case / PTU)
    const tcBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.28), this.scene.matDarkSteel);
    if (isTransverse) {
        // PTU attached to front diff
        tcBox.position.set(0.18, VehicleDimensions.diffY, diffZFront - 0.20);
    } else {
        tcBox.position.copy(gbOutWorld);
        tcBox.position.z -= 0.14;
    }
    tcBox.userData.name = "Skrzynia rozdzielcza (Transfer Case / PTU)";
    this.scene.carGroup.add(tcBox);

    // Tylny wał napędowy
    const tcRearOut = tcBox.position.clone();
    tcRearOut.z -= 0.14;
    const rearDiffIn = new THREE.Vector3(0, VehicleDimensions.diffY, diffZRear + 0.14);
    const distRear = tcRearOut.distanceTo(rearDiffIn);

    const rearPropGroup = new THREE.Group();
    rearPropGroup.position.copy(new THREE.Vector3().addVectors(tcRearOut, rearDiffIn).multiplyScalar(0.5));
    rearPropGroup.lookAt(rearDiffIn);
    const rearPropGeo = new THREE.CylinderGeometry(0.035, 0.035, distRear, 16);
    rearPropGeo.rotateX(Math.PI / 2);
    const rearPropShaft = new THREE.Mesh(rearPropGeo, this.scene.matSteel);
    rearPropShaft.userData.name = "Tylny wał napędowy";
    rearPropGroup.add(rearPropShaft);
    this.scene.carGroup.add(rearPropGroup);
    this.scene.propShaftMesh = rearPropShaft;

    // Przedni wał napędowy (Tylko dla wzdłużnych z oddzielnym reduktorem)
    if (!isTransverse) {
        const tcFrontOut = tcBox.position.clone();
        tcFrontOut.x += 0.10;
        tcFrontOut.z += 0.14;
        const frontDiffIn = new THREE.Vector3(0, VehicleDimensions.diffY, diffZFront - 0.14);
        const distFront = tcFrontOut.distanceTo(frontDiffIn);

        const frontPropGroup = new THREE.Group();
        frontPropGroup.position.copy(new THREE.Vector3().addVectors(tcFrontOut, frontDiffIn).multiplyScalar(0.5));
        frontPropGroup.lookAt(frontDiffIn);
        const frontPropGeo = new THREE.CylinderGeometry(0.028, 0.028, distFront, 16);
        frontPropGeo.rotateX(Math.PI / 2);
        const frontPropShaft = new THREE.Mesh(frontPropGeo, this.scene.matSteel);
        frontPropShaft.userData.name = "Przedni wał napędowy";
        frontPropGroup.add(frontPropShaft);
        this.scene.carGroup.add(frontPropGroup);
    }
  }
}

}
