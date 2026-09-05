import * as THREE from 'three';
export class IntakeManifold {
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
// ═══ 1. UNIWERSALNY KOLEKTOR SSĄCY (Intake Manifold & Throttle Body) ═══
    // Przebudowano układ powietrza na JSON (AirSystem w engine_layout.json)
    // Obliczamy tylko pozycje dla listew paliwowych i runnerów.
    
    const plenumMidZ = (maxZ + minZ) / 2;
    let plenumX = 0;
    let plenumY = 0;

    if (layout === 'Inline' || layout === 'VR') {
      plenumX = -Math.max(0.18, 0.18 * boreScale + 0.04);
      plenumY = sceneContext.headBase + 0.12 * boreScale;
    } else if (layout === 'V' || layout === 'W') {
      plenumX = 0.0;
      plenumY = sceneContext.headBase * Math.cos(vAngle / 2) + 0.10 * boreScale;
    } else if (layout === 'Boxer') {
      plenumX = 0.0;
      plenumY = (rodLength + crankRadius) * 0.75 + explodeDist * 0.5;
    }

    const intakeG = new THREE.Group();
    engineGroup.add(intakeG);


    // ═══ LISTWY PALIWOWE (Fuel Rails) ═══
    if (layout === 'Inline' || layout === 'VR') {
      const fuelRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.010, engineLength + 0.08, 16), scene.matExhaust
      );
      fuelRail.rotation.x = Math.PI / 2;
      fuelRail.position.set(-Math.max(0.13, 0.13 * boreScale + 0.02), sceneContext.headBase + 0.08 * boreScale, plenumMidZ);
      fuelRail.userData.name = "Listwa wtryskowa (Fuel Rail)";
      intakeG.add(fuelRail);
    } else {
      // Dla V / Boxer / W — dwie listwy paliwowe wzdłuż każdego banku
      [-1, 1].forEach((side, bIdx) => {
        const railZ = plenumMidZ;
        const bAng = (layout === 'Boxer') ? (side * Math.PI / 2) : (side * (vAngle * 180 / Math.PI / 2) * Math.PI / 180);
        const inSideSign = (bAng > 0.001) ? 1 : -1;
        const railLocalX = inSideSign * (0.08 * boreScale);
        const railX = railLocalX * Math.cos(bAng) - (sceneContext.headBase + 0.08 * boreScale) * Math.sin(bAng);
        const railY = railLocalX * Math.sin(bAng) + (sceneContext.headBase + 0.08 * boreScale) * Math.cos(bAng);
        const fuelRail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.009, engineLength * 0.7 + 0.06, 16), scene.matExhaust
        );
        fuelRail.rotation.x = Math.PI / 2;
        fuelRail.position.set(railX, railY, railZ);
        fuelRail.userData.name = `Listwa wtryskowa (Bank #${bIdx + 1})`;
        intakeG.add(fuelRail);
      });
    }

    // ═══ RUNNERY DOLOTU (Intake Runners) + LINIE PRZEPŁYWU (Streamlines) ═══
    scene.cylinderPositions.forEach((cyl, idx) => {
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
        new THREE.TubeGeometry(runnerCurve, 20, 0.016, 12, false), scene.matIntake
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

      scene.flowStreamlines.push({
        type: 'intake',
        cylId: cyl.id,
        phaseOffset: cyl.phaseOffset,
        streams: streamDashes
      });
    });
    engineGroup.add(intakeG);

    // ════════════════════════════════════════════════════════════════════════
    
    return null; // Intake added inside
  }
}
