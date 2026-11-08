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
    const manifoldType = scene.config.exhaustManifoldType || 'cast_iron';

    const exhaustG = new THREE.Group();
    const exhaustX = Math.max(0.32, sleeveRadius + 0.20);
    let exhaustMergePoint = new THREE.Vector3(exhaustX, -0.12, minZ - 0.20);

    const isTrueDual = scene.config.exhaustPipes === 'dual' && (layout === 'V' || layout === 'W' || layout === 'Boxer');

    const createRunner = (curve: THREE.Curve<THREE.Vector3>, radius: number, name: string, material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 12, false), material);
        mesh.userData.name = name;
        exhaustG.add(mesh);
        return mesh;
    };

    const addStreamline = (curve: THREE.Curve<THREE.Vector3>, cylId: string, phaseOffset: number) => {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
        const lineMat = new THREE.LineBasicMaterial({ color: 0xff3b00, transparent: true, opacity: 0, depthWrite: false });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        exhaustG.add(lineMesh);
        scene.flowStreamlines.push({ type: 'exhaust', cylId, phaseOffset, lineMesh, lineMat });
    };

    if (layout === 'Inline' || layout === 'VR') {
      const colX = exhaustX, colY = -0.10, colZ = 0.0;
      const collectorPoint = new THREE.Vector3(colX, colY, colZ);
      const mergeZ = isTransverse ? colZ : (minZ - 0.15);
      exhaustMergePoint.set(colX, -0.12, mergeZ);

      if (manifoldType === 'cast_iron') {
        const logZStart = Math.max(...scene.cylinderPositions.map((c: any) => c.z)) + 0.05;
        const logZEnd = Math.min(...scene.cylinderPositions.map((c: any) => c.z)) - 0.05;
        const avgExPortY = scene.cylinderPositions.reduce((sum: number, c: any) => sum + c.exPort.y, 0) / Math.max(1, scene.cylinderPositions.length);
        const avgExPortX = scene.cylinderPositions.reduce((sum: number, c: any) => sum + c.exPort.x, 0) / Math.max(1, scene.cylinderPositions.length);
        const exNormX = scene.cylinderPositions[0]?.exNorm?.x || (exhaustX >= 0 ? 1 : -1);
        const logY = avgExPortY - 0.02;
        const logX = avgExPortX + exNormX * 0.12;
        
        // Glowna rura żeliwna (Log)
        const logCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(logX, logY, logZStart),
          new THREE.Vector3(logX, logY, logZEnd)
        ]);
        createRunner(logCurve, 0.035, "Kolektor wydechowy żeliwny zbiorczy", scene.matExhaust);
        
        // Złącze na dole schodzące do kolektora/downpipe
        const dropCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(logX, logY, colZ),
          new THREE.Vector3(logX + (colX - logX) * 0.5, logY * 0.4 + colY * 0.6, colZ),
          collectorPoint
        ]);
        createRunner(dropCurve, 0.035, "Kolektor wydechowy żeliwne złącze spustowe", scene.matExhaust);

        scene.cylinderPositions.forEach((cyl: any, idx: number) => {
          const pStart = cyl.exPort.clone();
          const pEnd = new THREE.Vector3(logX, logY, cyl.z);
          const curve = new THREE.CatmullRomCurve3([pStart, pEnd]);
          createRunner(curve, 0.02, `Kanał wydechowy żeliwny (Cyl #${idx+1})`, scene.matExhaust);
          addStreamline(curve, cyl.id, cyl.phaseOffset);
        });
      } else { // Tubular / UEL
        const collectorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.026, 0.14, 16), scene.matExhaust);
        collectorMesh.rotation.x = Math.PI / 2 - 0.2;
        collectorMesh.position.set(colX, colY, colZ);
        collectorMesh.userData.name = `Kolektor zbiorczy typu ${cylCount}-1`;
        exhaustG.add(collectorMesh);

        scene.cylinderPositions.forEach((cyl: any, idx: number) => {
          const pStart = cyl.exPort.clone();
          const p1 = pStart.clone().addScaledVector(cyl.exNorm, 0.15);
          
          let uelDistortion = 0;
          if (manifoldType === 'uel') {
              uelDistortion = (idx % 2 === 0) ? 0.15 : -0.05; // Unequal routing
          }
          const perpOffset = 0.032 * Math.sin((idx / Math.max(1, scene.cylinderPositions.length - 1)) * Math.PI) + uelDistortion;
          
          const p2 = new THREE.Vector3(colX + 0.055, pStart.y * 0.35 + colY * 0.65 + perpOffset, pStart.z * 0.4 + colZ * 0.6 + uelDistortion);
          const pEnd = collectorPoint.clone();

          const curve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.25);
          createRunner(curve, 0.016, `Kolektor rurowy sportowy ${cylCount}-1 (Rura #${idx+1})`, scene.matExhaust);
          addStreamline(curve, cyl.id, cyl.phaseOffset);
        });
      }

      const pt1 = new THREE.Vector3(colX + 0.02, colY - 0.04, (colZ + exhaustMergePoint.z) * 0.5);
      const downpipeCurve = new THREE.CatmullRomCurve3([collectorPoint.clone(), pt1, exhaustMergePoint]);
      scene.exhaustOutTangentLocal = new THREE.Vector3().subVectors(exhaustMergePoint, pt1).normalize();
      createRunner(downpipeCurve, 0.022, "Kolektor (Downpipe)", scene.matExhaust);

    } else if (layout === 'V' || layout === 'W') {
      const maxExX = Math.max(...scene.cylinderPositions.map((c: any) => Math.abs(c.exPort.x)), 0.38);
      const colXOffset = maxExX + 0.08;
      const colL = new THREE.Vector3(-colXOffset, -0.10, minZ - 0.05);
      const colR = new THREE.Vector3(colXOffset, -0.10, minZ - 0.05);
      exhaustMergePoint.set(0, -0.12, minZ - 0.20);
      scene.colLWorld = colL.clone();
      scene.colRWorld = colR.clone();

      if (manifoldType === 'cast_iron') {
          // Log style for V engines
          const logZStart = Math.max(...scene.cylinderPositions.map((c: any) => c.z)) + 0.05;
          const logZEnd = minZ - 0.05;
          const leftCyls = scene.cylinderPositions.filter((c: any) => c.exPort.x < 0);
          const rightCyls = scene.cylinderPositions.filter((c: any) => c.exPort.x >= 0);
          const avgYL = leftCyls.length ? leftCyls.reduce((s: number, c: any) => s + c.exPort.y, 0) / leftCyls.length : (colL.y + 0.35);
          const avgYR = rightCyls.length ? rightCyls.reduce((s: number, c: any) => s + c.exPort.y, 0) / rightCyls.length : (colR.y + 0.35);
          const avgXL = leftCyls.length ? leftCyls.reduce((s: number, c: any) => s + c.exPort.x, 0) / leftCyls.length : -colXOffset;
          const avgXR = rightCyls.length ? rightCyls.reduce((s: number, c: any) => s + c.exPort.x, 0) / rightCyls.length : colXOffset;
          const logYL = avgYL - 0.02, logYR = avgYR - 0.02;
          const logXL = avgXL - 0.08, logXR = avgXR + 0.08;

          const logLCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(logXL, logYL, logZStart),
            new THREE.Vector3(logXL, logYL, logZEnd),
            new THREE.Vector3(logXL * 0.7 + colL.x * 0.3, logYL * 0.5 + colL.y * 0.5, (logZEnd + colL.z) * 0.5),
            colL
          ]);
          const logRCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(logXR, logYR, logZStart),
            new THREE.Vector3(logXR, logYR, logZEnd),
            new THREE.Vector3(logXR * 0.7 + colR.x * 0.3, logYR * 0.5 + colR.y * 0.5, (logZEnd + colR.z) * 0.5),
            colR
          ]);
          
          createRunner(logLCurve, 0.035, "Kolektor wydechowy żeliwny (Lewy)", scene.matExhaust);
          createRunner(logRCurve, 0.035, "Kolektor wydechowy żeliwny (Prawy)", scene.matExhaust);

          scene.cylinderPositions.forEach((cyl: any, idx: number) => {
              const isLeft = cyl.exPort.x < 0;
              const pStart = cyl.exPort.clone();
              const pEnd = new THREE.Vector3(isLeft ? logXL : logXR, isLeft ? logYL : logYR, cyl.z);
              const curve = new THREE.CatmullRomCurve3([pStart, pEnd]);
              createRunner(curve, 0.02, `Kanał wydechowy żeliwny (Cyl #${idx+1})`, scene.matExhaust);
              addStreamline(curve, cyl.id, cyl.phaseOffset);
          });
      } else { // Tubular / UEL
          scene.cylinderPositions.forEach((cyl: any, idx: number) => {
            const isLeft = cyl.exPort.x < 0;
            const targetCol = isLeft ? colL : colR;
            const sideSign = isLeft ? -1 : 1;
            const pStart = cyl.exPort.clone();
            const p1 = pStart.clone().addScaledVector(cyl.exNorm, 0.07);
            
            let uelDistortion = 0;
            if (manifoldType === 'uel') {
                uelDistortion = (idx % 2 === 0) ? 0.12 : -0.05; 
            }

            const p2 = new THREE.Vector3(
              sideSign * (colXOffset + 0.02 + uelDistortion),
              pStart.y * 0.3 + targetCol.y * 0.7 + (uelDistortion * 0.5),
              pStart.z * 0.4 + targetCol.z * 0.6
            );
            const pEnd = targetCol.clone();

            const curve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.2);
            createRunner(curve, 0.015, `Kolektor rurowy (Rura #${idx+1})`, scene.matExhaust);
            addStreamline(curve, cyl.id, cyl.phaseOffset);
          });
      }

      if (!isTrueDual) {
        const yLeftCurve = new THREE.CatmullRomCurve3([colL, new THREE.Vector3(-colXOffset * 0.5, -0.12, minZ - 0.14), exhaustMergePoint]);
        const yRightCurve = new THREE.CatmullRomCurve3([colR, new THREE.Vector3(colXOffset * 0.5, -0.12, minZ - 0.14), exhaustMergePoint]);
        createRunner(yLeftCurve, 0.020, "Rura Y-Pipe (Lewa)", scene.matExhaust);
        createRunner(yRightCurve, 0.020, "Rura Y-Pipe (Prawa)", scene.matExhaust);
      }
      scene.exhaustOutTangentLocal = new THREE.Vector3(0, 0, -1).normalize();

    } else if (layout === 'Boxer') {
      exhaustMergePoint.set(0, -0.26, minZ - 0.22);
      scene.colLWorld = new THREE.Vector3(-exhaustX, -0.26, minZ - 0.22);
      scene.colRWorld = new THREE.Vector3(exhaustX, -0.26, minZ - 0.22);

      if (manifoldType === 'cast_iron') {
          // Zeliwny dla Boxera
          const logZStart = Math.max(...scene.cylinderPositions.map((c: any) => c.z)) + 0.05;
          const logZEnd = minZ - 0.05;
          const logY = -0.16;
          const logXL = -0.24, logXR = 0.24;

          const targetL = isTrueDual ? scene.colLWorld : exhaustMergePoint;
          const targetR = isTrueDual ? scene.colRWorld : exhaustMergePoint;

          const logLCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(logXL, logY, logZStart),
            new THREE.Vector3(logXL, logY, logZEnd),
            new THREE.Vector3(logXL, -0.26, minZ - 0.12),
            new THREE.Vector3(targetL.x * 0.5 + logXL * 0.5, -0.26, (minZ - 0.12 + targetL.z) * 0.5),
            targetL
          ]);
          const logRCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(logXR, logY, logZStart),
            new THREE.Vector3(logXR, logY, logZEnd),
            new THREE.Vector3(logXR, -0.26, minZ - 0.12),
            new THREE.Vector3(targetR.x * 0.5 + logXR * 0.5, -0.26, (minZ - 0.12 + targetR.z) * 0.5),
            targetR
          ]);
          
          createRunner(logLCurve, 0.035, "Kolektor wydechowy żeliwny Boxer (Lewy)", scene.matExhaust);
          createRunner(logRCurve, 0.035, "Kolektor wydechowy żeliwny Boxer (Prawy)", scene.matExhaust);

          scene.cylinderPositions.forEach((cyl: any, idx: number) => {
              const isLeft = cyl.exPort.x < 0;
              const pStart = cyl.exPort.clone();
              const pEnd = new THREE.Vector3(isLeft ? logXL : logXR, logY, cyl.z);
              const curve = new THREE.CatmullRomCurve3([pStart, pEnd]);
              createRunner(curve, 0.02, `Kanał wydechowy żeliwny (Cyl #${idx+1})`, scene.matExhaust);
              addStreamline(curve, cyl.id, cyl.phaseOffset);
          });
      } else { // ELH / UEL dla Boxera
          scene.cylinderPositions.forEach((cyl: any, idx: number) => {
            const pStart = cyl.exPort.clone(); 
            const p1 = pStart.clone().add(new THREE.Vector3(0, -0.06, 0));
            const sideSign = cyl.exPort.x < 0 ? -1 : 1;
            const targetCol = (isTrueDual) ? (sideSign < 0 ? scene.colLWorld : scene.colRWorld) : exhaustMergePoint;
            
            let p2;
            if (manifoldType === 'uel') {
                // Klasyczny bulgot Subaru - bardzo dlugie rury dla jednej z par (cyl 1 i 3)
                // Zakladamy, ze cyl 1, 3 sa po jednej stronie, a 2, 4 po drugiej (ale zalezy od ID)
                // Aby upewnic sie, dodajmy nierowne p2 wzgledem osi z i x
                if (cyl.bank < 0) {
                    // Zawijaja z przodu silnika dookola
                    p2 = new THREE.Vector3(sideSign * 0.35, -0.22, cyl.z * 1.5 + 0.1);
                } else {
                    // Ida prosto i krotko
                    p2 = new THREE.Vector3(sideSign * 0.10, -0.15, cyl.z * 0.5 + targetCol.z * 0.5);
                }
            } else {
                // Tubular (ELH) - rowne krzywizny
                p2 = new THREE.Vector3(sideSign * 0.15, -0.15, cyl.z * 0.5 + targetCol.z * 0.5);
            }

            const pEnd = targetCol.clone();
            const curve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'centripetal', 0.2);
            const typeStr = manifoldType === 'uel' ? 'Nierównoodległościowy (UEL)' : 'Równoodległościowy (ELH)';
            createRunner(curve, 0.015, `Kolektor rurowy ${typeStr} (Rura #${idx+1})`, scene.matExhaust);
            addStreamline(curve, cyl.id, cyl.phaseOffset);
          });
      }
      scene.exhaustOutTangentLocal = new THREE.Vector3(0, 0, -1).normalize();
    }
    
    engineGroup.add(exhaustG);
    sceneContext.exhaustMergePoint = exhaustMergePoint;
    sceneContext.exhaustX = exhaustX;
    return null;
  }
}
