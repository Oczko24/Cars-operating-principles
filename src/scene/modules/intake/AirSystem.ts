import * as THREE from 'three';

export class AirSystem {
  build(scene: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any): THREE.Object3D {
    const intakeG = new THREE.Group();
    const { maxZ, minZ, engineLength, boreScale, crankRadius, rodLength, deckHeight } = datum;
    const explodeDist = scene.explodedFactor * 0.45;
    const headBase = deckHeight + 0.02 * boreScale + explodeDist * 1.5;
    const layout = scene.config.layout;
    const isTransverse = scene.config.orientation === 'transverse';
    const isSport = scene.config.intakeType === 'sport';

    const plenumMidZ = (maxZ + minZ) / 2;
    const plenumLen = Math.max(0.20, engineLength * 0.72);
    const vAngle = (scene.config.vAngle || 0) * Math.PI / 180;

    let plenumX = 0;
    let plenumY = 0;
    let plenumR = 0.045 * boreScale;

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

    const plenumMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(plenumR, plenumR, plenumLen, 20), scene.matSilver
    );
    plenumMesh.rotation.x = Math.PI / 2;
    plenumMesh.position.set(plenumX, plenumY, plenumMidZ);
    plenumMesh.userData.name = "Plenum dolotu (Komora wyrównawcza)";
    intakeG.add(plenumMesh);

    const tbG = new THREE.Group();
    const tbPosZ = maxZ + 0.06;
    tbG.position.set(plenumX, plenumY, tbPosZ);

    const tbBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.07, 24), scene.matSilver
    );
    tbBody.rotation.x = Math.PI / 2;
    tbBody.userData.name = "Przepustnica (Throttle Body)";
    tbG.add(tbBody);

    const flapG = new THREE.Group();
    const flap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.039, 0.039, 0.003, 20), scene.matBronze
    );
    flap.rotation.x = Math.PI / 2;
    flap.userData.name = "Klapa motylkowa";
    flapG.add(flap);
    const flapAxis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.09, 8), scene.matSteel
    );
    flapAxis.rotation.z = Math.PI / 2;
    flapAxis.userData.name = "Oś klapy przepustnicy";
    flapG.add(flapAxis);
    tbG.add(flapG);
    scene.throttleFlapG = flapG;

    // Pobierz config filtra z JSON zależnie od ułożenia silnika
    let filterPos = new THREE.Vector3();
    let filterRot = new THREE.Euler();
    
    const fPosKey = isTransverse ? 'filterPosTransverse' : 'filterPosLongitudinal';
    const fRotKey = isTransverse ? 'filterRotTransverse' : 'filterRotLongitudinal';
    
    if (layoutProps[fPosKey]) {
       filterPos.set(layoutProps[fPosKey][0], layoutProps[fPosKey][1], layoutProps[fPosKey][2]);
    }
    if (layoutProps[fRotKey]) {
       filterRot.set(layoutProps[fRotKey][0] * Math.PI/180, layoutProps[fRotKey][1] * Math.PI/180, layoutProps[fRotKey][2] * Math.PI/180);
    }
    
    // Oblicz prawdziwe Z filtra (tak jak w SceneAssemblerze użyto maxZ dla akcesoriów)
    filterPos.z += maxZ; 
    
    // ---------------------------------------------------------
    // MATEMATYCZNE OBLICZENIE WYSOKOŚCI (Y)
    // ---------------------------------------------------------
    // headBase jest już zdefiniowane uwzględniając explodeDist
    const totalCylinderLength = headBase + 0.22 * boreScale; // blok + uszczelka + głowica + pokrywa
    
    let engineTopY = 0;
    if (layout === 'Inline' || layout === 'VR') {
      const angle = layout === 'VR' ? (15 * Math.PI / 180 / 2) : 0;
      engineTopY = totalCylinderLength * Math.cos(angle);
    } else if (layout === 'V' || layout === 'W') {
      engineTopY = totalCylinderLength * Math.cos(vAngle / 2);
    } else if (layout === 'Boxer') {
      engineTopY = (rodLength + crankRadius) * 0.75 + 0.15 * boreScale; 
    }
    
    // Użytkownik poprosił o obniżenie o połowę wielkości stożka
    // (żeby to górna krawędź zrównywała się z głowicą, a nie środek)
    const filterHalfSize = isSport ? 0.125 : 0.08; 
    filterPos.y = engineTopY - filterHalfSize;

    // Rura dolotowa miedzy przepustnicą a filtrem
    const ptA = new THREE.Vector3(0, 0, 0.04);
    
    // Przeliczanie pozycji filtra na układ lokalny tbG:
    const filterLocalPos = filterPos.clone().sub(tbG.position);
    
    let p1, p2, p3;
    if (isTransverse) {
      p1 = new THREE.Vector3(0.00, filterLocalPos.y * 0.2 + 0.05, 0.20);
      p2 = new THREE.Vector3(filterLocalPos.x / 2, filterLocalPos.y * 0.7, filterLocalPos.z * 0.8);
      p3 = filterLocalPos.clone();
      // Cofnięcie dla sportowego filtra aby nie wchodził w stożek
      if (isSport) p3.x -= 0.05; 
    } else {
      p1 = new THREE.Vector3(0, filterLocalPos.y * 0.2, 0.12);
      p2 = new THREE.Vector3(filterLocalPos.x * 0.8, filterLocalPos.y * 0.7, filterLocalPos.z * 0.5);
      p3 = filterLocalPos.clone();
      if (isSport) p3.z -= 0.05;
    }
    
    const intakePipeCurve = new THREE.CatmullRomCurve3([ptA, p1, p2, p3], false, 'centripetal', 0.2);
    const intakePipe = new THREE.Mesh(
      new THREE.TubeGeometry(intakePipeCurve, 16, 0.038, 12, false), scene.matRubber
    );
    intakePipe.userData.name = "Rura dolotowa (Przepustnica → Filtr)";
    tbG.add(intakePipe);
    
    let intakeFilter;
    if (isSport) {
      const coneLength = 0.24;
      intakeFilter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.040, 0.125, coneLength, 24), scene.matIntake
      );
      intakeFilter.userData.name = "Filtr powietrza stożkowy (Sportowy)";
       
      const shieldG = new THREE.Group();
      shieldG.userData.name = "Komora osłony termicznej filtra (Heat Shield)";
      const shThick = 0.003;
      const filterP = filterLocalPos;
      
      if (isTransverse) {
        const innerWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, shThick), scene.matSilver);
        innerWall.position.set(filterP.x, filterP.y, filterP.z - 0.13); 
        innerWall.userData.name = "Ściana boczna osłony termicznej (Od silnika)";
        shieldG.add(innerWall);

        const rearWall = new THREE.Mesh(new THREE.BoxGeometry(shThick, 0.20, 0.28), scene.matSilver);
        rearWall.position.set(filterP.x - 0.13, filterP.y, filterP.z);
        rearWall.userData.name = "Ściana tylna osłony termicznej (Od kabiny)";
        shieldG.add(rearWall);

        const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, shThick, 0.28), scene.matSilver);
        bottomWall.position.set(filterP.x, filterP.y - 0.135, filterP.z);
        bottomWall.userData.name = "Dno osłony termicznej";
        shieldG.add(bottomWall);
      } else {
        const rearWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, shThick), scene.matSilver);
        rearWall.position.set(filterP.x, filterP.y, filterP.z - 0.13);
        rearWall.userData.name = "Ściana tylna osłony termicznej (Od silnika)";
        shieldG.add(rearWall);

        const innerWall = new THREE.Mesh(new THREE.BoxGeometry(shThick, 0.20, 0.26), scene.matSilver);
        innerWall.position.set(filterP.x + 0.12, filterP.y, filterP.z);
        innerWall.userData.name = "Ściana boczna osłony termicznej (Od głowic V)";
        shieldG.add(innerWall);

        const outerWall = new THREE.Mesh(new THREE.BoxGeometry(shThick, 0.15, 0.26), scene.matSilver);
        outerWall.position.set(filterP.x - 0.12, filterP.y - 0.025, filterP.z);
        outerWall.userData.name = "Ściana boczna osłony termicznej (Nadkole)";
        shieldG.add(outerWall);

        const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, shThick, 0.26), scene.matSilver);
        bottomWall.position.set(filterP.x, filterP.y - 0.135, filterP.z);
        bottomWall.userData.name = "Dno osłony termicznej";
        shieldG.add(bottomWall);
      }
      tbG.add(shieldG);
    } else {
      const boxW = 0.22, boxH = 0.16, boxD = 0.22;
      intakeFilter = new THREE.Mesh(
        new THREE.BoxGeometry(boxW, boxH, boxD), scene.matDarkSteel
      );
      intakeFilter.userData.name = "Puszka filtra powietrza (Cywilny Airbox)";
    }
    
    intakeFilter.position.copy(filterLocalPos);
    intakeFilter.rotation.copy(filterRot);
    scene.intakeFilterMesh = intakeFilter;
    tbG.add(intakeFilter);

    intakeG.add(tbG);
    return intakeG;
  }
}
