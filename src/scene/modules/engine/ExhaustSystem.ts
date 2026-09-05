import * as THREE from 'three';
import { VehicleDimensions } from '../../VehicleConfig.js';
export class ExhaustSystem {
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
// ═══ 3. PEŁNY UKŁAD WYDECHOWY DO TYŁU POJAZDU (Single / Dual Exhaust) ══
    // ════════════════════════════════════════════════════════════════════════

    scene.engineMountGroup.updateMatrixWorld(true);
    const mergePointWorld = sceneContext.exhaustMergePoint.clone().applyMatrix4(scene.engineMountGroup.matrixWorld);
    
    let startPointL = mergePointWorld;
    let startPointR = mergePointWorld;
    if (scene.config.exhaustPipes === 'dual' && (layout === 'V' || layout === 'W' || layout === 'Boxer')) {
      if (scene.colLWorld) startPointL = scene.colLWorld.clone().applyMatrix4(scene.engineMountGroup.matrixWorld);
      if (scene.colRWorld) startPointR = scene.colRWorld.clone().applyMatrix4(scene.engineMountGroup.matrixWorld);
    }

    const fullExhaustG = new THREE.Group();
    const isDual = scene.config.exhaustPipes === 'dual';

    // Rysowanie traktu wydechowego dla wybranej strony (+1 prawa, -1 lewa)
    const buildExhaustTract = (tractSign, namePrefix, startPointWorld, needsCrossover) => {
      const underbodyX = (scene.config.orientation === 'transverse') ? (tractSign * 0.12) : (tractSign * sceneContext.exhaustX);
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
        const xCrossoverMesh = new THREE.Mesh(new THREE.TubeGeometry(xCrossoverCurve, 12, 0.020, 8, false), scene.matExhaustPipe);
        xCrossoverMesh.userData.name = "Rura rozdzielająca wydech (Dual X-Pipe)";
        fullExhaustG.add(xCrossoverMesh);
        initialPoint = new THREE.Vector3(0.12, exhaustY, -0.40);
      } else {
        // Dokładny wektor pobrany z poprzedniej rury, aby połączyć je w idealnie jedną, ciągłą rurę (zero załamań 90 stopni)
        const outTangentLocal = scene.exhaustOutTangentLocal || new THREE.Vector3(0, -0.2, -1).normalize();
        const outTangentWorld = outTangentLocal.applyQuaternion(scene.engineMountGroup.quaternion);
        
        // Pierwszy punkt po wyjściu z kolektora (utrzymuje stały kąt wyjścia)
        const p1 = startPointWorld.clone().add(outTangentWorld.clone().multiplyScalar(0.15));
        
        let curvePoints = [];
        if (scene.config.orientation === 'transverse') {
          // Logiczne poprowadzenie rury pod silnikiem ze zdefiniowanym kątem wejścia i wyjścia
          const underEngineZ = scene.engineMountGroup ? scene.engineMountGroup.position.z : startPointWorld.z;
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
          new THREE.TubeGeometry(downpipeCurve, 20, 0.022, 12, false), scene.matExhaustPipe
        );
        downpipeMesh.userData.name = `${namePrefix} Rura spustowa kolektora (Downpipe)`;
        fullExhaustG.add(downpipeMesh);
      }

      const flexEnd = new THREE.Vector3(underbodyX, exhaustY, -0.52);
      const flexCurve = new THREE.CatmullRomCurve3([flexStart, flexEnd]);
      const flexMesh = new THREE.Mesh(new THREE.TubeGeometry(flexCurve, 10, 0.024, 12, false), scene.matFlexPipe);
      flexMesh.userData.name = `${namePrefix} Złącze elastyczne (Flex Pipe)`;
      fullExhaustG.add(flexMesh);

      // Katalizator (przesunięty bliżej silnika, Z = -0.65)
      const catZ = -0.65;
      const catMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.22, 20), scene.matCatalyst
      );
      catMesh.rotation.x = Math.PI / 2;
      catMesh.position.set(underbodyX, exhaustY, catZ);
      catMesh.scale.set(1.3, 1, 0.8);
      catMesh.userData.name = `${namePrefix} Katalizator spalin`;
      fullExhaustG.add(catMesh);

      // Rura łącząca Flex Pipe z Katalizatorem
      const p1Curve = new THREE.LineCurve3(flexEnd, new THREE.Vector3(underbodyX, exhaustY, catZ + 0.11));
      const p1Mesh = new THREE.Mesh(new THREE.TubeGeometry(p1Curve, 4, 0.020, 8, false), scene.matExhaustPipe);
      p1Mesh.userData.name = `${namePrefix} Rura przed katalizatorem`;
      fullExhaustG.add(p1Mesh);

      // Tłumik środkowy (przesunięty na Z = -1.05)
      const resZ = -1.05; 
      const resMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.35, 20), scene.matMuffler
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
      const p2Mesh = new THREE.Mesh(new THREE.TubeGeometry(p2Curve, 8, 0.020, 8, false), scene.matExhaustPipe);
      p2Mesh.userData.name = `${namePrefix} Rura środkowa wydechu`;
      fullExhaustG.add(p2Mesh);

      // Tłumik końcowy (Rear Muffler)
      const rearZ = VehicleDimensions.wheelbaseRearZ;
      const rearMufflerZ = rearZ - 0.40; // -1.75
      const mufflerX = tractSign * 0.38;
      
      const rearMuffler = new THREE.Mesh(
        new THREE.BoxGeometry(0.30, 0.16, 0.42), scene.matMuffler
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
      const p3Mesh = new THREE.Mesh(new THREE.TubeGeometry(p3Curve, 20, 0.020, 8, false), scene.matExhaustPipe);
      p3Mesh.userData.name = `${namePrefix} Rura podwoziowa`;
      fullExhaustG.add(p3Mesh);

      // Chromowana końcówka wydechu
      const tipZ = rearZ - 0.70;
      const tailpipeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.30, 24), scene.matChrome
      );
      tailpipeMesh.rotation.x = Math.PI / 2;
      tailpipeMesh.position.set(mufflerX, exhaustY, tipZ);
      tailpipeMesh.userData.name = `${namePrefix} Końcówka wydechu (Tailpipe)`;
      fullExhaustG.add(tailpipeMesh);

      const p4Curve = new THREE.LineCurve3(
        new THREE.Vector3(mufflerX, exhaustY, rearMufflerZ - 0.21),
        new THREE.Vector3(mufflerX, exhaustY, tipZ + 0.15)
      );
      const p4Mesh = new THREE.Mesh(new THREE.TubeGeometry(p4Curve, 4, 0.028, 8, false), scene.matExhaustPipe);
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
      const mainExhaustLine = new THREE.Line(mainExhaustLineGeo, scene.matStreamlineMainExhaust);
      fullExhaustG.add(mainExhaustLine);
      scene.exhaustMainStreamlines.push({ lineMesh: mainExhaustLine, curve: fullExhaustCurve });
    };

    const isTrueDualLayout = isDual && (layout === 'V' || layout === 'W' || layout === 'Boxer');

    // Zbuduj prawy trakt wydechowy (zawsze)
    buildExhaustTract(1, isDual ? "Prawy" : "", startPointR, false);

    // Zbuduj lewy trakt wydechowy (jeśli dual exhaust)
    if (isDual) {
      buildExhaustTract(-1, "Lewy", startPointL, !isTrueDualLayout);
    }

    scene.carGroup.add(fullExhaustG);


    return null; // added to carGroup inside
  }
}
