import * as THREE from 'three';
import { VehicleDimensions } from './VehicleConfig.js';

export function buildDrivetrainAssembly() {
  const isTransverse = this.config.orientation === 'transverse';
  const layout = this.config.drivetrainLayout || "RWD";
  const gbScaleZ = isTransverse ? 0.45 : 1.0; // Shorten the gearbox significantly for transverse

  // 1. SPRZĘGŁO i SKRZYNIA BIEGÓW (przytwierdzone do silnika)
  const transGroup = new THREE.Group();

  // Sprzęgło
  const clutchGroup = new THREE.Group();
  clutchGroup.position.set(0, 0, this.engineZMin - 0.05);

  const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), this.matDarkSteel);
  flywheel.rotation.x = Math.PI / 2;
  flywheel.userData.name = "Koło Zamachowe";
  clutchGroup.add(flywheel);

  const frictionDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 32), this.matBronze);
  frictionDisk.rotation.x = Math.PI / 2;
  frictionDisk.position.z = -0.03;
  frictionDisk.userData.name = "Tarcza Sprzęgła (Cierna)";
  clutchGroup.add(frictionDisk);

  const pressurePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32), this.matSteel);
  pressurePlate.rotation.x = Math.PI / 2;
  pressurePlate.position.z = -0.06;
  pressurePlate.userData.name = "Docisk Sprzęgła";
  clutchGroup.add(pressurePlate);

  if (this.config.clutchType === 'dual') {
    const frictionDisk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32), this.matBronze);
    frictionDisk2.rotation.x = Math.PI / 2;
    frictionDisk2.position.z = -0.09;
    frictionDisk2.userData.name = "Druga Tarcza Sprzęgła (DCT)";
    clutchGroup.add(frictionDisk2);
  }

  this.flywheelMesh = flywheel;
  this.pressurePlateMesh = pressurePlate;
  this.frictionDiskMesh = frictionDisk;
  transGroup.add(clutchGroup);

  // Skrzynia Biegów (Manualna wielowałowa)
  const gearbox = new THREE.Group();
  // Dla poprzecznego silnika, dzwon skrzyni jest bliżej
  gearbox.position.set(0, 0, this.engineZMin - 0.15 - (0.25 * gbScaleZ));
  gearbox.scale.set(1, 1, gbScaleZ); // Magiczna linijka skracająca wnętrzności

  // Wałek wejściowy (Input Shaft)
  const inputGroup = new THREE.Group();
  inputGroup.position.z = 0.15;
  const inShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 16), this.matSteel);
  inShaft.rotation.x = Math.PI / 2;
  inputGroup.add(inShaft);
  const inGear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), this.matGold);
  inGear.rotation.x = Math.PI / 2;
  inGear.position.z = -0.04;
  inGear.userData.name = "Zębatka Napędowa Wałka Sprzęgłowego";
  inputGroup.add(inGear);
  gearbox.add(inputGroup);
  this.gbInputGroup = inputGroup;

  // Wałek pośredni (Countershaft / Layshaft)
  const counterGroup = new THREE.Group();
  counterGroup.position.y = -0.14;
  counterGroup.position.z = -0.15;
  const counterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 16), this.matDarkSteel);
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
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02 / gbScaleZ, 24), this.matSteel);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = g.z;
    counterGroup.add(mesh);
  });
  gearbox.add(counterGroup);
  this.gbCounterGroup = counterGroup;

  // Wałek główny wyjściowy (Main Output Shaft)
  const outputGroup = new THREE.Group();
  outputGroup.position.z = -0.25;
  const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 16), this.matDarkSteel);
  outShaft.rotation.x = Math.PI / 2;
  outputGroup.add(outShaft);

  const oGears = [
    { r: 0.10, z: 0.22, name: "Bieg 1" },
    { r: 0.08, z: 0.12, name: "Bieg 2" },
    { r: 0.06, z: 0.02, name: "Bieg 3" },
    { r: 0.04, z: -0.08, name: "Bieg 5" },
    { r: 0.10, z: -0.18, name: "Bieg R" }
  ];
  this.gbOutGears = [];
  oGears.forEach(g => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02 / gbScaleZ, 24), this.matBronze);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = g.z;
    mesh.userData.name = "Zębatka " + g.name;
    outputGroup.add(mesh);
    this.gbOutGears.push(mesh);
  });

  const syncMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
  const sync1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03 / gbScaleZ, 16), syncMat);
  sync1.rotation.x = Math.PI / 2;
  sync1.position.z = 0.17;
  outputGroup.add(sync1);
  this.gbSync12 = sync1;

  const sync2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03 / gbScaleZ, 16), syncMat);
  sync2.rotation.x = Math.PI / 2;
  sync2.position.z = 0.07;
  outputGroup.add(sync2);
  this.gbSync34 = sync2;

  gearbox.add(outputGroup);
  this.gbOutputGroup = outputGroup;
  transGroup.add(gearbox);

  this.engineMountGroup.add(transGroup);

  // 2. HELPER TWORZENIA DYFERENCJAŁU
  const createDiff = (zPos, xPos, isFront) => {
    const diffGroup = new THREE.Group();
    diffGroup.position.set(xPos, VehicleDimensions.diffY, zPos);

    const diffCasing = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(0.22, 16, 16)),
      this.crankcaseLineMat
    );
    diffCasing.userData.name = "Obudowa Dyferencjału (Zarys)";
    diffGroup.add(diffCasing);

    const pinionGear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.12, 16), this.matGold);
    pinionGear.rotation.x = Math.PI / 2;
    pinionGear.position.z = isFront ? -0.14 : 0.14;
    pinionGear.userData.name = "Wałek Atakujący (Pinion)";
    diffGroup.add(pinionGear);
    if (!isFront || layout === "FWD") this.pinionMesh = pinionGear;

    const ringGear = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32), this.matBronze);
    ringGear.rotation.z = Math.PI / 2;
    ringGear.position.x = -0.06;
    ringGear.userData.name = "Koło Talerzowe (Ring Gear)";
    diffGroup.add(ringGear);
    if (!isFront || layout === "FWD") this.ringGearMesh = ringGear;

    const carrier = new THREE.Group();
    carrier.position.x = -0.03;

    const carrierBox = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.22), this.matDarkSteel);
    carrier.add(carrierBox);

    const spiderTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.04, 16), this.matSteel);
    spiderTop.position.y = 0.07;
    spiderTop.userData.name = "Satelita Górny (Krzyżak)";
    carrier.add(spiderTop);

    const spiderBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.04, 16), this.matSteel);
    spiderBottom.rotation.x = Math.PI;
    spiderBottom.position.y = -0.07;
    spiderBottom.userData.name = "Satelita Dolny (Krzyżak)";
    carrier.add(spiderBottom);

    if (this.config.diffType === 'lsd_mech') {
      const lsdPlates = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16), this.matDarkSteel);
      lsdPlates.rotation.z = Math.PI / 2;
      lsdPlates.userData.name = "Płytki Cierne (LSD 1.5 Way)";
      carrier.add(lsdPlates);
    } else if (this.config.diffType === 'locker') {
      const lockerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 16), this.matGold);
      lockerPin.rotation.z = Math.PI / 2;
      lockerPin.userData.name = "Blokada 100% (Sprzęgło Kłowe)";
      carrier.add(lockerPin);
    }

    diffGroup.add(carrier);
    if (!isFront || layout === "FWD") this.diffCarrier = carrier;

    // Półosie napędowe
    const leftAxle = new THREE.Group();
    const rightAxle = new THREE.Group();

    const sideGearL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.04, 16), this.matGold);
    sideGearL.rotation.z = -Math.PI / 2;
    sideGearL.position.x = -0.03;
    sideGearL.userData.name = "Koło Koronowe Lewe";
    leftAxle.add(sideGearL);

    const sideGearR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.04, 16), this.matGold);
    sideGearR.rotation.z = Math.PI / 2;
    sideGearR.position.x = 0.03;
    sideGearR.userData.name = "Koło Koronowe Prawe";
    rightAxle.add(sideGearR);

    // Długość półosi obliczana od pozycji dyferencjału do kół
    const leftShaftLen = Math.abs(xPos - (-VehicleDimensions.trackWidthHalf));
    const axleShaftL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, leftShaftLen, 16), this.matSteel);
    axleShaftL.rotation.z = Math.PI / 2;
    axleShaftL.position.x = -leftShaftLen / 2;
    axleShaftL.userData.name = "Półoś Lewa";
    leftAxle.add(axleShaftL);

    const rightShaftLen = Math.abs(xPos - VehicleDimensions.trackWidthHalf);
    const axleShaftR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, rightShaftLen, 16), this.matSteel);
    axleShaftR.rotation.z = Math.PI / 2;
    axleShaftR.position.x = rightShaftLen / 2;
    axleShaftR.userData.name = "Półoś Prawa";
    rightAxle.add(axleShaftR);

    diffGroup.add(leftAxle);
    diffGroup.add(rightAxle);

    if (!isFront || layout === "FWD") {
      this.leftAxleG = leftAxle;
      this.rightAxleG = rightAxle;
    }

    this.carGroup.add(diffGroup);
    return diffGroup;
  };

  // 3. ROZMIESZCZENIE UKŁADU NAPĘDOWEGO
  const diffZFront = VehicleDimensions.wheelbaseFrontZ;
  const diffZRear = VehicleDimensions.wheelbaseRearZ;

  this.engineMountGroup.updateMatrixWorld(true);
  const gbOutLocal = new THREE.Vector3(0, 0, this.engineZMin - 0.15 - (0.60 * gbScaleZ));
  const gbOutWorld = gbOutLocal.clone().applyMatrix4(this.engineMountGroup.matrixWorld);

  if (layout === "FWD") {
    createDiff(diffZFront, isTransverse ? 0.18 : 0.0, true);
    this.propShaftMesh = null;
  } else if (layout === "RWD") {
    const rearDiff = createDiff(diffZRear, 0.0, false);
    rearDiff.updateMatrixWorld(true);

    const diffInWorld = new THREE.Vector3(0, VehicleDimensions.diffY, diffZRear + 0.14);
    const dist = gbOutWorld.distanceTo(diffInWorld);

    const propGroup = new THREE.Group();
    propGroup.position.copy(new THREE.Vector3().addVectors(gbOutWorld, diffInWorld).multiplyScalar(0.5));
    propGroup.lookAt(diffInWorld);

    const propGeo = new THREE.CylinderGeometry(0.035, 0.035, dist, 16);
    propGeo.rotateX(Math.PI / 2);
    const propShaft = new THREE.Mesh(propGeo, this.matSteel);
    propShaft.userData.name = "Wał Napędowy (Prop shaft)";
    propGroup.add(propShaft);
    this.carGroup.add(propGroup);
    this.propShaftMesh = propShaft;
  } else if (layout === "AWD" || layout === "4x4") {
    const frontDiff = createDiff(diffZFront, isTransverse ? 0.18 : 0.0, true);
    const rearDiff = createDiff(diffZRear, 0.0, false);
    frontDiff.updateMatrixWorld(true);
    rearDiff.updateMatrixWorld(true);

    // Skrzynia rozdzielcza (Transfer Case)
    const tcBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.28), this.matDarkSteel);
    tcBox.position.copy(gbOutWorld);
    tcBox.position.z -= 0.14;
    tcBox.userData.name = "Skrzynia rozdzielcza (Transfer Case)";
    this.carGroup.add(tcBox);

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
    const rearPropShaft = new THREE.Mesh(rearPropGeo, this.matSteel);
    rearPropShaft.userData.name = "Tylny wał napędowy";
    rearPropGroup.add(rearPropShaft);
    this.carGroup.add(rearPropGroup);
    this.propShaftMesh = rearPropShaft;

    // Przedni wał napędowy
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
    const frontPropShaft = new THREE.Mesh(frontPropGeo, this.matSteel);
    frontPropShaft.userData.name = "Przedni wał napędowy";
    frontPropGroup.add(frontPropShaft);
    this.carGroup.add(frontPropGroup);
  }
}
