import * as THREE from 'three';

export class RadiatorSystem {
  build(scene: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any): THREE.Object3D | null {
    const layout = scene.config.layout;
    const isSport = scene.config.intakeType === 'sport';
    const isTransverse = scene.config.orientation === 'transverse';
    
    const radG = new THREE.Group();
    const coreW = (layout === 'Boxer') ? 0.95 : 0.85;
    const coreH = 0.55, coreD = 0.055;
    const carRadZ = (scene.config.placement === 'front') ? 2.30 : (scene.config.placement === 'mid' ? -0.50 : -2.40);
    const carRadY = 0.65;

    // Rdzeń chłodnicy
    const radCore = new THREE.Mesh(
      new THREE.BoxGeometry(coreW, coreH, coreD), scene.matDarkSteel
    );
    radCore.userData.name = "Rdzeń chłodnicy";
    radG.add(radCore);

    // Lamele chłodnicy
    const finCount = 28;
    const finPitch = coreW / (finCount + 1);
    for (let i = 1; i <= finCount; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, coreH * 0.88, coreD * 1.3), scene.matSilver
      );
      fin.position.x = -coreW / 2 + i * finPitch;
      fin.userData.name = "Lamela chłodnicy";
      radG.add(fin);
    }

    // Zbiorniki górny i dolny
    const tankGeo = new THREE.BoxGeometry(coreW + 0.04, 0.055, 0.08);
    const topTank = new THREE.Mesh(tankGeo, scene.matDarkSteel);
    topTank.position.y = coreH / 2 + 0.025;
    topTank.userData.name = "Zbiornik górny chłodnicy";

    const bottomTank = new THREE.Mesh(tankGeo.clone(), scene.matDarkSteel);
    bottomTank.position.y = -coreH / 2 - 0.025;
    bottomTank.userData.name = "Zbiornik dolny chłodnicy";
    radG.add(topTank, bottomTank);

    // Króćce chłodnicy
    const topInlet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 16), scene.matDarkSteel);
    topInlet.rotation.x = Math.PI / 2;
    topInlet.position.set(0.25, coreH / 2 + 0.025, -0.04);
    radG.add(topInlet);

    const botOutlet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 16), scene.matDarkSteel);
    botOutlet.rotation.x = Math.PI / 2;
    botOutlet.position.set(-0.25, -coreH / 2 - 0.025, -0.04);
    radG.add(botOutlet);

    // Wentylator chłodnicy zamontowany z tyłu rdzenia
    const fanShroud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.03, 24), scene.matRubber
    );
    fanShroud.rotation.x = Math.PI / 2;
    fanShroud.position.set(0, 0, -0.035);
    fanShroud.userData.name = "Obudowa wentylatora";
    radG.add(fanShroud);

    const fanMotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), scene.matDarkSteel
    );
    fanMotor.rotation.x = Math.PI / 2;
    fanMotor.position.set(0, 0, -0.05);
    fanMotor.userData.name = "Silnik wentylatora (Radiator Fan Motor)";
    radG.add(fanMotor);

    const radFanGroup = new THREE.Group();
    radFanGroup.position.set(0, 0, -0.04);
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.20, 0.01), scene.matRubber
      );
      blade.position.y = 0.10;
      blade.rotation.x = 0.2;
      const pivot = new THREE.Group();
      pivot.rotation.z = (Math.PI * 2 / 7) * i;
      pivot.add(blade);
      radFanGroup.add(pivot);
    }
    radFanGroup.userData.name = "Wiatrak chłodnicy (Radiator Fan)";
    scene.radFanGroup = radFanGroup;
    radG.add(radFanGroup);

    radG.position.set(0, carRadY, carRadZ);
    radG.userData.name = "Chłodnica";
    scene.carGroup.add(radG);

    // ════════════════════════════════════════════════════════════════════════
    // ═══ CHWYTAK POWIETRZA ZAMONTOWANY NA SZTYWNO NAD CHŁODNICĄ (RAM-AIR) ══
    // ════════════════════════════════════════════════════════════════════════
    const scoopG = new THREE.Group();
    const scoopW = 0.32, scoopH = 0.052, scoopD = 0.08;
    const scoopY = coreH / 2 + 0.0525 + scoopH / 2 + 0.015;
    const scoopX = -0.35; // Wspólne z AirSystem
    const scoopZ = 0.00;

    const scoopOuter = new THREE.Mesh(
      new THREE.BoxGeometry(scoopW, scoopH, scoopD), scene.matDarkSteel
    );
    scoopOuter.position.set(scoopX, scoopY, scoopZ);
    scoopOuter.userData.name = "Szeroki chwytak powietrza (Ram-Air Scoop nad chłodnicą)";
    scoopG.add(scoopOuter);

    const scoopMouth = new THREE.Mesh(
      new THREE.BoxGeometry(scoopW * 0.92, scoopH * 0.75, 0.02), scene.matSteel
    );
    scoopMouth.position.set(scoopX, scoopY, scoopZ + scoopD * 0.45);
    scoopMouth.userData.name = "Gardziel wlotowa czerpni powietrza";
    scoopG.add(scoopMouth);

    [-0.08, 0, 0.08].forEach((offset, idx) => {
      const vane = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, scoopH * 0.8, scoopD * 0.8), scene.matSilver
      );
      vane.position.set(scoopX + offset, scoopY, scoopZ);
      vane.userData.name = `Kierownica powietrza #${idx + 1}`;
      scoopG.add(vane);
    });

    [-0.11, 0.11].forEach((offset) => {
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.035, 0.02), scene.matSteel
      );
      bracket.position.set(scoopX + offset, coreH / 2 + 0.025, scoopZ);
      bracket.userData.name = "Uchwyt mocowania chwytaka do chłodnicy";
      scoopG.add(bracket);
    });
    radG.add(scoopG);

    // ═══ KANAŁ DOLOTOWY: CHWYTAK NAD CHŁODNICĄ → AIRBOX / KOMORA STOŻKA ═══
    scene.engineMountGroup.updateMatrixWorld(true);
    const scoopBackWorld = new THREE.Vector3(scoopX, carRadY + scoopY, carRadZ - scoopD * 0.5);

    const filterCenterWorld = new THREE.Vector3();
    if (scene.intakeFilterMesh) {
      scene.intakeFilterMesh.getWorldPosition(filterCenterWorld);
    } else {
      filterCenterWorld.set(-0.18, carRadY, 0.40);
    }

    const targetZ = isSport ? (filterCenterWorld.z + 0.18) : (filterCenterWorld.z + 0.12);
    const filterInletWorld = new THREE.Vector3(filterCenterWorld.x, filterCenterWorld.y, targetZ);

    const midDuctY = Math.max(scoopBackWorld.y, filterInletWorld.y) + 0.03;
    const midDuctWorld = new THREE.Vector3(
      (scoopBackWorld.x + filterInletWorld.x) / 2,
      midDuctY,
      (scoopBackWorld.z + filterInletWorld.z) / 2
    );

    const coldAirDuctCurve = new THREE.CatmullRomCurve3([
      scoopBackWorld,
      midDuctWorld,
      filterInletWorld
    ], false, 'centripetal', 0.2);

    const coldAirDuctMesh = new THREE.Mesh(
      new THREE.TubeGeometry(coldAirDuctCurve, 20, 0.036, 14, false), scene.matDarkSteel
    );
    coldAirDuctMesh.userData.name = isSport
      ? "Kanał dolotu zimnego powietrza (Chwytak → Nadmuch na stożek)"
      : "Kanał dolotu zimnego powietrza (Chwytak → Puszka Airbox)";
    scene.carGroup.add(coldAirDuctMesh);

    if (isSport) {
      const trumpet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.052, 0.04, 20), scene.matSilver
      );
      trumpet.rotation.x = Math.PI / 2;
      trumpet.position.copy(filterInletWorld);
      trumpet.userData.name = "Trąbka nadmuchu zimnego powietrza na stożek";
      scene.carGroup.add(trumpet);
    } else {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.040, 0.040, 0.03, 16), scene.matRubber
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.copy(filterInletWorld);
      collar.userData.name = "Kołnierz wlotowy puszki filtra";
      scene.carGroup.add(collar);
    }

    // ═══ WĘŻE CHŁODNICY ═══
    const maxZ = datum.maxZ;
    // Pozycja termostatu (górny wąż) na szczycie z przodu silnika
    const thermostatPosLocal = new THREE.Vector3(
      0.0,
      datum.deckHeight + 0.10 * datum.boreScale,
      maxZ + 0.10
    );
    const thermoInWorld = thermostatPosLocal.clone().applyMatrix4(scene.engineMountGroup.matrixWorld);

    const radTopInWorld = new THREE.Vector3(0.25, carRadY + coreH / 2 + 0.025, carRadZ - 0.04);
    const midTopZ = (thermoInWorld.z + radTopInWorld.z) / 2;
    
    const topHoseCurve = new THREE.CatmullRomCurve3([
      thermoInWorld,
      new THREE.Vector3(thermoInWorld.x, thermoInWorld.y, midTopZ + 0.1),
      new THREE.Vector3(radTopInWorld.x * 0.5, thermoInWorld.y - 0.05, midTopZ),
      radTopInWorld
    ], false, 'centripetal', 0.1);

    const topHoseMesh = new THREE.Mesh(new THREE.TubeGeometry(topHoseCurve, 16, 0.022, 12, false), scene.matRubber);
    topHoseMesh.userData.name = "Górny wąż chłodnicy (Gorący płyn do chłodnicy)";
    scene.carGroup.add(topHoseMesh);

    const radBotOutWorld = new THREE.Vector3(-0.25, carRadY - coreH / 2 - 0.025, carRadZ - 0.04);
    const waterPumpLocal = new THREE.Vector3(0, 0.14, maxZ + 0.08); // Dopasowane do JSON WaterPump
    const waterPumpWorld = waterPumpLocal.clone().applyMatrix4(scene.engineMountGroup.matrixWorld);
    
    const midBotZ = (radBotOutWorld.z + waterPumpWorld.z) / 2;

    const botHoseCurve = new THREE.CatmullRomCurve3([
      radBotOutWorld,
      new THREE.Vector3(radBotOutWorld.x, radBotOutWorld.y, midBotZ - 0.1),
      new THREE.Vector3(waterPumpWorld.x * 0.5, waterPumpWorld.y - 0.05, midBotZ),
      waterPumpWorld
    ], false, 'centripetal', 0.1);

    const botHoseMesh = new THREE.Mesh(new THREE.TubeGeometry(botHoseCurve, 16, 0.022, 12, false), scene.matRubber);
    botHoseMesh.userData.name = "Dolny wąż chłodnicy (Schłodzony płyn do pompy wody)";
    scene.carGroup.add(botHoseMesh);

    return null; // Zwracamy null, ponieważ przypięliśmy elementy ręcznie do carGroup
  }
}
