import * as THREE from 'three';
import { VehicleDimensions } from './VehicleConfig.js';

export class DrivetrainBuilder {
  [key: string]: any;

  constructor(scene) {
    this.scene = scene;
  }


buildDrivetrainAssembly() {
  this.scene.drivetrainGroup = new THREE.Group();
  this.scene.carGroup.add(this.scene.drivetrainGroup);

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

  const preset = this.scene.config.gearboxPreset;
  
  if (preset === 'cvt_multitronic') {
    this.buildCvtGearbox(gearbox);
  } else if (preset === 'zf_8hp') {
    this.buildAutomaticGearbox(gearbox);
  } else if (isTransverse) {
    this.buildTransverseManualGearbox(gearbox);
  } else {
    this.buildManualGearbox(gearbox);
  }

  transGroup.add(gearbox);
  this.scene.engineMountGroup.add(transGroup);
  this.scene.transGroup = transGroup;

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

    this.scene.drivetrainGroup.add(diffGroup);
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
    this.scene.drivetrainGroup.add(propGroup);
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
    this.scene.drivetrainGroup.add(tcBox);

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
    this.scene.drivetrainGroup.add(rearPropGroup);
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
        this.scene.drivetrainGroup.add(frontPropGroup);
    }
  }
  // Patch
}

  buildManualGearbox(gearbox: THREE.Group) {
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
  }

  buildCvtGearbox(gearbox: THREE.Group) {
    this.scene.gbOutGears = null;
    this.scene.gbSync12 = null;
    this.scene.gbSync34 = null;
    this.scene.gbCounterGroup = null;

    // 1. Zespół wałka pierwotnego (Primary Input Shaft & Sheaves)
    const primaryGroup = new THREE.Group();
    primaryGroup.position.set(0, 0, 0.0);

    const inShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 24), this.scene.matSteel);
    inShaft.rotation.x = Math.PI / 2;
    inShaft.userData.name = "Wałek Pierwotny CVT (Wejściowy)";
    primaryGroup.add(inShaft);

    // Stożek stały (tylny)
    const conePrimFixed = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.038, 0.045, 32), this.scene.matSteel);
    conePrimFixed.rotation.x = Math.PI / 2;
    conePrimFixed.position.z = -0.035;
    conePrimFixed.userData.name = "Stożek Stały Koła Czynnego (CVT)";
    primaryGroup.add(conePrimFixed);

    // Stożek przesuwny (przedni / hydrauliczny)
    const conePrimMovable = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.125, 0.045, 32), this.scene.matSteel);
    conePrimMovable.rotation.x = Math.PI / 2;
    conePrimMovable.position.z = 0.035;
    conePrimMovable.userData.name = "Stożek Przesuwny Koła Czynnego (CVT)";
    primaryGroup.add(conePrimMovable);

    // Siłownik hydrauliczny
    const primHydraulic = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.065, 24), this.scene.matDarkSteel);
    primHydraulic.rotation.x = Math.PI / 2;
    primHydraulic.position.z = 0.09;
    primHydraulic.userData.name = "Siłownik Hydrauliczny Koła Czynnego (CVT)";
    primaryGroup.add(primHydraulic);

    gearbox.add(primaryGroup);
    this.scene.gbInputGroup = primaryGroup;
    this.scene.cvtConePrimMovable = conePrimMovable;

    // 2. Zespół wałka wtórnego (Secondary Output Shaft & Sheaves)
    const secondaryGroup = new THREE.Group();
    secondaryGroup.position.set(0, -0.15, -0.22);

    const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.48, 24), this.scene.matSteel);
    outShaft.rotation.x = Math.PI / 2;
    outShaft.userData.name = "Wałek Wtórny CVT (Wyjściowy)";
    secondaryGroup.add(outShaft);

    // Stożek przesuwny wtórny
    const coneSecMovable = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.038, 0.045, 32), this.scene.matSteel);
    coneSecMovable.rotation.x = Math.PI / 2;
    coneSecMovable.position.z = -0.035;
    coneSecMovable.userData.name = "Stożek Przesuwny Koła Biernego (CVT)";
    secondaryGroup.add(coneSecMovable);

    // Stożek stały wtórny
    const coneSecFixed = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.125, 0.045, 32), this.scene.matSteel);
    coneSecFixed.rotation.x = Math.PI / 2;
    coneSecFixed.position.z = 0.035;
    coneSecFixed.userData.name = "Stożek Stały Koła Biernego (CVT)";
    secondaryGroup.add(coneSecFixed);

    // Sprężyna dociskowa
    const secSpring = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.075, 24), this.scene.matBronze);
    secSpring.rotation.x = Math.PI / 2;
    secSpring.position.z = -0.10;
    secSpring.userData.name = "Sprężyna Dociskowa Wariatora Wtórnego";
    secondaryGroup.add(secSpring);

    gearbox.add(secondaryGroup);
    this.scene.gbOutputGroup = secondaryGroup;
    this.scene.cvtConeSecMovable = coneSecMovable;

    // 3. Stalowy pas Van Doorne'a
    const p1 = primaryGroup.position;
    const p2 = secondaryGroup.position;
    const beltPts = [
      new THREE.Vector3(0, p1.y + 0.08, p1.z),
      new THREE.Vector3(0, p1.y + 0.05, p1.z + 0.065),
      new THREE.Vector3(0, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2 + 0.07),
      new THREE.Vector3(0, p2.y + 0.04, p2.z + 0.065),
      new THREE.Vector3(0, p2.y - 0.08, p2.z),
      new THREE.Vector3(0, p2.y - 0.04, p2.z - 0.065),
      new THREE.Vector3(0, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2 - 0.07),
      new THREE.Vector3(0, p1.y - 0.05, p1.z - 0.065)
    ];
    const beltCurve = new THREE.CatmullRomCurve3(beltPts, true);
    const beltGeo = new THREE.TubeGeometry(beltCurve, 48, 0.015, 8, true);
    const beltMesh = new THREE.Mesh(beltGeo, this.scene.matSteel);
    beltMesh.userData.name = "Stalowy Pas Pchany CVT (Van Doorne)";
    gearbox.add(beltMesh);
    this.scene.cvtBeltMesh = beltMesh;

    // 4. Obudowa skrzyni CVT
    const gbCasingGeo = new THREE.BoxGeometry(0.32, 0.42, 0.58);
    const gbCasing = new THREE.LineSegments(new THREE.EdgesGeometry(gbCasingGeo), this.scene.crankcaseLineMat);
    gbCasing.position.set(0, -0.075, -0.05);
    gbCasing.userData.name = "Obudowa Skrzyni CVT";
    gearbox.add(gbCasing);
  }
  // Patch
  buildAutomaticGearbox(gearbox: THREE.Group) {
    // 1. Konwerter momentu obrotowego (Torque Converter)
    const tcGroup = new THREE.Group();
    tcGroup.position.z = 0.08;
    const tcMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32), this.scene.matDarkSteel);
    tcMesh.rotation.x = Math.PI / 2;
    tcMesh.userData.name = "Konwerter Momentu Obrotowego (Torque Converter)";
    tcGroup.add(tcMesh);
    
    // Wirnik pompy, turbina, stojan (oznaczone pierścieniami)
    const impeller = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.015, 16, 32), this.scene.matGold);
    impeller.rotation.x = Math.PI / 2;
    impeller.position.z = 0.02;
    impeller.userData.name = "Wirnik pompy (Impeller)";
    tcGroup.add(impeller);

    const turbine = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 16, 32), this.scene.matSteel);
    turbine.rotation.x = Math.PI / 2;
    turbine.position.z = -0.02;
    turbine.userData.name = "Turbina (Turbine)";
    tcGroup.add(turbine);

    gearbox.add(tcGroup);
    
    // Oś wejściowa do przekładni planetarnych
    const inShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 16), this.scene.matSteel);
    inShaft.rotation.x = Math.PI / 2;
    inShaft.position.z = -0.15;
    inShaft.userData.name = "Wałek wejściowy automatu";
    gearbox.add(inShaft);
    this.scene.gbInputGroup = inShaft; // do animacji obrotu
    this.scene.gbCounterGroup = null;

    // 2. Przekładnie planetarne (Planetarne sety 1, 2, 3)
    const planGroup = new THREE.Group();
    planGroup.position.z = -0.20;
    
    const sets = [
      { z: 0.15, r: 0.10, col: this.scene.matGold, name: "Przekładnia Planetarna 1" },
      { z: 0.00, r: 0.11, col: this.scene.matSteel, name: "Przekładnia Planetarna 2" },
      { z: -0.15, r: 0.10, col: this.scene.matDarkSteel, name: "Przekładnia Planetarna 3" }
    ];

    sets.forEach(s => {
      // Ring gear (Koło koronowe)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(s.r, 0.02, 16, 32), s.col);
      ring.rotation.x = Math.PI / 2;
      ring.position.z = s.z;
      ring.userData.name = s.name + " (Koło Koronowe)";
      planGroup.add(ring);

      // Sun gear (Koło słoneczne)
      const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 24), s.col);
      sun.rotation.x = Math.PI / 2;
      sun.position.z = s.z;
      sun.userData.name = s.name + " (Koło Słoneczne)";
      planGroup.add(sun);
      
      // Planet gears (Satelity)
      for(let i=0; i<3; i++) {
        const angle = i * (Math.PI * 2) / 3;
        const pR = (s.r + 0.03) / 2;
        const planet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.038, 16), this.scene.matSteel);
        planet.rotation.x = Math.PI / 2;
        planet.position.set(Math.cos(angle) * pR, Math.sin(angle) * pR, s.z);
        planet.userData.name = s.name + " (Satelita)";
        planGroup.add(planet);
      }
    });
    
    gearbox.add(planGroup);

    // 3. Zestaw sprzęgieł i hamulców (Pakiety tarcz)
    const clutchPack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 32), this.scene.matDarkSteel);
    clutchPack1.rotation.x = Math.PI / 2;
    clutchPack1.position.z = -0.05;
    clutchPack1.userData.name = "Pakiet Sprzęgieł / Hamulców (A/B)";
    gearbox.add(clutchPack1);
    
    const clutchPack2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 32), this.scene.matDarkSteel);
    clutchPack2.rotation.x = Math.PI / 2;
    clutchPack2.position.z = -0.40;
    clutchPack2.userData.name = "Pakiet Sprzęgieł / Hamulców (C/D)";
    gearbox.add(clutchPack2);

    // Wałek wyjściowy
    const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 16), this.scene.matSteel);
    outShaft.rotation.x = Math.PI / 2;
    outShaft.position.z = 0; // Relative to gbOutputGroup
    outShaft.userData.name = "Wałek Wyjściowy Skrzyni Automatycznej";
    this.scene.gbOutputGroup = new THREE.Group();
    this.scene.gbOutputGroup.position.z = -0.55;
    this.scene.gbOutputGroup.add(outShaft);
    gearbox.add(this.scene.gbOutputGroup);
    
    // Obudowa
    const gbCasingGeo = new THREE.BoxGeometry(0.32, 0.32, 0.85);
    const gbCasing = new THREE.LineSegments(new THREE.EdgesGeometry(gbCasingGeo), this.scene.crankcaseLineMat);
    gbCasing.position.set(0, 0, -0.22);
    gbCasing.userData.name = "Obudowa Skrzyni Automatycznej";
    gearbox.add(gbCasing);
  }

  buildTransverseManualGearbox(gearbox: THREE.Group) {
    // Skrzynia poprzeczna (Transaxle) 
    // Z-axis to oś wzdłuż bloku silnika (czyli w poprzek auta)
    
    const inputGroup = new THREE.Group();
    inputGroup.position.z = 0.10;
    
    // Wałek wejściowy krótki
    const inShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.25, 16), this.scene.matSteel);
    inShaft.rotation.x = Math.PI / 2;
    inShaft.position.z = -0.05;
    inputGroup.add(inShaft);
    
    const iGears = [
      { r: 0.03, z: 0.02, gear: '1' },
      { r: 0.04, z: -0.02, gear: '2' },
      { r: 0.05, z: -0.06, gear: '3' },
      { r: 0.06, z: -0.10, gear: '4' },
      { r: 0.07, z: -0.14, gear: '5' }
    ];
    
    this.scene.gbInGears = [];
    iGears.forEach(g => {
      const gMesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02, 24), this.scene.matGold);
      gMesh.rotation.x = Math.PI / 2;
      gMesh.position.z = g.z;
      gMesh.userData.name = `Koło zębate (Wejście, Bieg ${g.gear})`;
      inputGroup.add(gMesh);
      this.scene.gbInGears.push(gMesh);
    });
    
    gearbox.add(inputGroup);
    this.scene.gbInputGroup = inputGroup;
    
    // Wałek wyjściowy (Countershaft, połączony bezpośrednio z Final Drive)
    const counterGroup = new THREE.Group();
    // Przesunięty do tyłu i w dół (w osi X i Y)
    counterGroup.position.x = -0.12;
    counterGroup.position.y = -0.08;
    counterGroup.position.z = 0.10;
    
    const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.35, 16), this.scene.matDarkSteel);
    outShaft.rotation.x = Math.PI / 2;
    outShaft.position.z = -0.10;
    counterGroup.add(outShaft);
    
    this.scene.gbOutGears = [];
    iGears.forEach(g => {
      const outR = 0.10 - g.r; // stały rozstaw
      const gMesh = new THREE.Mesh(new THREE.CylinderGeometry(outR, outR, 0.02, 24), this.scene.matSteel);
      gMesh.rotation.x = Math.PI / 2;
      gMesh.position.z = g.z;
      gMesh.userData.name = `Koło zębate (Wyjście, Bieg ${g.gear})`;
      counterGroup.add(gMesh);
      this.scene.gbOutGears.push(gMesh);
    });
    
    // Zębnik przekładni głównej (Final Drive Pinion) na końcu wałka wyjściowego
    const pinion = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), this.scene.matGold);
    pinion.rotation.x = Math.PI / 2;
    pinion.position.z = -0.22;
    pinion.userData.name = "Zębnik Przekładni Głównej (Pinion)";
    counterGroup.add(pinion);
    
    gearbox.add(counterGroup);
    this.scene.gbCounterGroup = counterGroup;
    this.scene.gbOutputGroup = counterGroup; // w Transaxle wałek wyjściowy z biegami napędza koła!
    
    // Synchra 
    this.scene.gbSync12 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 24), this.scene.matRed);
    this.scene.gbSync12.rotation.x = Math.PI / 2;
    this.scene.gbSync12.position.z = 0.0;
    counterGroup.add(this.scene.gbSync12);
    
    this.scene.gbSync34 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 24), this.scene.matRed);
    this.scene.gbSync34.rotation.x = Math.PI / 2;
    this.scene.gbSync34.position.z = -0.08;
    counterGroup.add(this.scene.gbSync34);
    
    this.scene.gbSync56 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 24), this.scene.matRed);
    this.scene.gbSync56.rotation.x = Math.PI / 2;
    this.scene.gbSync56.position.z = -0.14;
    counterGroup.add(this.scene.gbSync56);

    // Obudowa Skrzyni (Krótsza i szersza)
    const gbCasingGeo = new THREE.BoxGeometry(0.25, 0.25, 0.35);
    const gbCasing = new THREE.LineSegments(new THREE.EdgesGeometry(gbCasingGeo), this.scene.crankcaseLineMat);
    gbCasing.position.set(-0.06, -0.04, 0.05);
    gbCasing.userData.name = "Obudowa Skrzyni Biegów (Transaxle)";
    gearbox.add(gbCasing);
  }
}
