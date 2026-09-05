import * as THREE from 'three';
export class ExhaustManifold {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group) {
    const scene = sceneContext;
    const {
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength
    } = datum;
    const explodeDist = scene.explodedFactor * 0.45;
    const layout = scene.config.layout;
    const cylCount = scene.config.cylinders;
    const vAngle = scene.config.vAngle * Math.PI / 180;
    const isTransverse = scene.config.orientation === 'transverse';
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
        new THREE.CylinderGeometry(0.040, 0.026, 0.14, 16), scene.matDarkSteel
      );
      collectorMesh.rotation.x = Math.PI / 2 - 0.2;
      collectorMesh.position.set(colX, colY, colZ);
      collectorMesh.userData.name = "Kolektor zbiorczy (Centrum Z=0)";
      exhaustG.add(collectorMesh);

      // Rury wydechowe (runners) z poszczególnych cylindrów zbiegające się w punkcie Z = 0
      scene.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone();
        // Wyprowadzenie rury po wektorze normalnym na zewnątrz poza obrys bloku
        const p1 = pStart.clone().addScaledVector(cyl.exNorm, 0.08);
        const perpOffset = 0.032 * Math.sin((idx / Math.max(1, scene.cylinderPositions.length - 1)) * Math.PI);
        const p2 = new THREE.Vector3(colX + 0.055, pStart.y * 0.35 + colY * 0.65 + perpOffset, pStart.z * 0.4 + colZ * 0.6);
        const pEnd = collectorPoint.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.25);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 24, 0.016, 12, false), scene.matExhaust
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

        scene.flowStreamlines.push({
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
      scene.exhaustOutTangentLocal = new THREE.Vector3().subVectors(exhaustMergePoint, pt1).normalize();
      
      const downpipeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(downpipeCurve, 16, 0.022, 12, false), scene.matExhaustPipe
      );
      downpipeMesh.userData.name = "Kolektor (Downpipe 1)";
      exhaustG.add(downpipeMesh);
    } else if (layout === 'V' || layout === 'W') {
      // Dwa kolektory po bokach (Lewy i Prawy) wyprowadzone na zewnątrz głowic i łączące się w Y-pipe
      const maxExX = Math.max(...scene.cylinderPositions.map(c => Math.abs(c.exPort.x)), 0.38);
      const colXOffset = maxExX + 0.08; // kolektor bezpiecznie poza obrysem cylindrów i świec
      const colL = new THREE.Vector3(-colXOffset, -0.10, minZ - 0.05);
      const colR = new THREE.Vector3(colXOffset, -0.10, minZ - 0.05);
      exhaustMergePoint.set(exhaustX, -0.12, minZ - 0.20);

      scene.cylinderPositions.forEach((cyl, idx) => {
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
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), scene.matExhaust
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

        scene.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });

      // Y-Pipe łączący oba banki (tylko jeśli nie jest to true dual exhaust)
      scene.colLWorld = colL.clone();
      scene.colRWorld = colR.clone();
      const isTrueDual = scene.config.exhaustPipes === 'dual'; // true dual dla V/W/Boxer

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
        const yLeftMesh = new THREE.Mesh(new THREE.TubeGeometry(yLeftCurve, 16, 0.020, 8, false), scene.matExhaustPipe);
        const yRightMesh = new THREE.Mesh(new THREE.TubeGeometry(yRightCurve, 16, 0.020, 8, false), scene.matExhaustPipe);
        yLeftMesh.userData.name = "Rura Y-Pipe (Lewa)";
        yRightMesh.userData.name = "Rura Y-Pipe (Prawa)";
        exhaustG.add(yLeftMesh, yRightMesh);
      }
    } else if (layout === 'Boxer') {
      // Dla Boxera
      const isTrueDual = scene.config.exhaustPipes === 'dual';
      exhaustMergePoint.set(exhaustX, -0.14, minZ - 0.15);
      
      scene.colLWorld = new THREE.Vector3(-exhaustX, -0.14, minZ - 0.15);
      scene.colRWorld = new THREE.Vector3(exhaustX, -0.14, minZ - 0.15);

      scene.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone(); // znajduje się na dole głowicy (y < 0)
        const p1 = pStart.clone().add(new THREE.Vector3(0, -0.06, 0));
        const sideSign = cyl.exPort.x < 0 ? -1 : 1;
        
        const targetCol = (isTrueDual) ? (sideSign < 0 ? scene.colLWorld : scene.colRWorld) : exhaustMergePoint;
        
        const p2 = (sideSign < 0)
          ? new THREE.Vector3(0.0, -0.16, cyl.z * 0.5 + targetCol.z * 0.5)
          : new THREE.Vector3(0.22, -0.15, cyl.z * 0.5 + targetCol.z * 0.5);
        const pEnd = targetCol.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), scene.matExhaust
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

        scene.flowStreamlines.push({
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
    
    sceneContext.exhaustMergePoint = exhaustMergePoint;
    sceneContext.exhaustX = exhaustX;
    return null; // added inside
  }
}
