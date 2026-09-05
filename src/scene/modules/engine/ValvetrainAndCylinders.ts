import * as THREE from 'three';
import { createConnectingRod, createPiston, createSparkPlug } from '../../engine/Crank';
import { createValve, createSpringMesh, createRockerArm, createCamLobe, getCamRadius } from '../../engine/Valvetrain';
export class ValvetrainAndCylinders {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group) {
    const scene = sceneContext;
    const {
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength, pistonLength
    } = datum;
    const explodeDist = scene.explodedFactor * 0.45;
    const layout = scene.config.layout;
    const cylCount = scene.config.cylinders;
    const vAngle = scene.config.vAngle * Math.PI / 180;
    const isTransverse = scene.config.orientation === 'transverse';
    scene.cylinderPositions = [];
const banks = {};
    cylinderConfigs.forEach(cfg => {
      // Group by approx bank angle to avoid precision issues
      const bankKey = cfg.bank.toFixed(2);
      if (!banks[bankKey]) banks[bankKey] = [];
      banks[bankKey].push(cfg);
    });

    scene.banksData = [];
    const headBase = deckHeight + 0.02 * boreScale + explodeDist * 1.5; 
    const isOHV = scene.config.valvetrain === "OHV" || scene.config.valvetrain === "valve_ohv";
    const valveBaseY = headBase + 0.084 + 0.025 * boreScale;
    const trueCamY = isOHV ? (rodLength * 0.5 + explodeDist * 0.5) : (valveBaseY + 0.095 * boreScale);
    const camOffsetX = (scene.config.valves === 4 ? 0.048 : 0.038) * boreScale;
    
    let firstBankOHV = true;

    Object.keys(banks).forEach(bankAngleStr => {
      const bankAngle = parseFloat(bankAngleStr);
      const cylinders = banks[bankAngleStr];

      // Dla VR: jedna wspólna głowica cross-flow (dolot po lewej inSign=-1, wydech po prawej exSign=1 dla obu rzędów)
      const flipBank = (scene.config.layout === 'V' || scene.config.layout === 'W' || scene.config.layout === 'Boxer') && bankAngle > 0.001;
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
          const globalCamX = (scene.config.layout === 'Inline' || scene.config.layout === 'VR') ? 0.16 * boreScale : 0;
          const globalCamY = (scene.config.layout === 'Inline' || scene.config.layout === 'VR') ? (rodLength * 0.5 + explodeDist * 0.5) : (rodLength * 0.35 + explodeDist * 0.5);
          
          localX = globalCamX * Math.cos(bankAngle) + globalCamY * Math.sin(bankAngle);
          localY = -globalCamX * Math.sin(bankAngle) + globalCamY * Math.cos(bankAngle);
          
          camBaseEx.position.set(localX, localY, 0);
          camBaseIn.visible = false;
          
          if (firstBankOHV) {
              const centralCamGroup = new THREE.Group();
              centralCamGroup.position.set(globalCamX, globalCamY, 0);
              
              const meshOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), scene.matBronze);
              meshOHV.rotation.x = Math.PI / 2;
              meshOHV.position.z = midZ;
              meshOHV.userData.name = "Wałek rozrządu (OHV)";
              centralCamGroup.add(meshOHV);
              
              const gearOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), scene.matGold);
              gearOHV.rotation.x = Math.PI / 2;
              gearOHV.position.z = gearZ;
              gearOHV.userData.name = "Koło wałka rozrządu (OHV)";
              centralCamGroup.add(gearOHV);
              
              engineGroup.add(centralCamGroup);
              scene.centralCamGroupOHV = centralCamGroup;
              scene.camshafts.push(centralCamGroup);
          }
          scene.camshafts.push(camShaftEx);
      } else {
          camBaseIn.position.set(inSign * camOffsetX, trueCamY, 0);
          camBaseEx.position.set(exSign * camOffsetX, trueCamY, 0);
          
          const meshIn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), scene.matBronze);
          meshIn.rotation.x = Math.PI / 2;
          meshIn.position.z = midZ;
          meshIn.userData.name = "Wałek rozrządu ssący";
          camShaftIn.add(meshIn);

          const meshEx = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), scene.matBronze);
          meshEx.rotation.x = Math.PI / 2;
          meshEx.position.z = midZ;
          meshEx.userData.name = "Wałek rozrządu wydechowy";
          camShaftEx.add(meshEx);

          const gearIn = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), scene.matGold);
          gearIn.rotation.x = Math.PI / 2;
          gearIn.position.z = gearZ;
          gearIn.userData.name = "Koło wałka ssącego";
          camShaftIn.add(gearIn);

          const gearEx = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), scene.matGold);
          gearEx.rotation.x = Math.PI / 2;
          gearEx.position.z = gearZ;
          gearEx.userData.name = "Koło wałka wydechowego";
          camShaftEx.add(gearEx);
          
          scene.camshafts.push(camShaftIn, camShaftEx);
      }

      cylinders.forEach(cfg => {
        const cylG = new THREE.Group();
        cylG.position.z = cfg.z;
        cylG.userData.cylId = cfg.id;
        bankG.add(cylG);

        const sleeve = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLength, 16)), scene.lineMat);
        sleeve.position.set(0, sleeveCenter + explodeDist, 0);
        sleeve.userData.name = "Tuleja cylindra (Zarys)";
        sleeve.visible = scene.config.showWireframes !== false;
        cylG.add(sleeve);

        const headWidth = Math.max(0.28, 2 * sleeveRadius + 0.06);
        const headDepth = zSpacing - 0.02;
        const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(headWidth, 0.16 * boreScale, headDepth)), scene.lineMat);
        head.position.set(0, headBase + 0.08 * boreScale, 0);
        if (scene.config.layout === 'VR') {
           head.scale.set(1.45, 1, 2.0); // scale Z to bridge gap between offset cylinders
           head.rotation.z = -bankAngle;
           head.position.x = -bankAngle * 0.2; // slight shift to center
        } else if (scene.config.layout === 'W') {
           head.scale.set(1.45, 1, 2.0);
           const wVRBaseAngle = bankAngle > 0 ? (72 * Math.PI/180)/2 : -(72 * Math.PI/180)/2;
           head.rotation.z = -(bankAngle - wVRBaseAngle);
        }
        head.userData.name = "Głowica cylindra (Zarys)";
        head.visible = scene.config.showWireframes !== false;
        cylG.add(head);

        const valvesList = [];
        const vOffZ = (scene.config.valves === 4 ? 0.045 : 0) * boreScale;
        const vOffX = 0.045 * boreScale;
        const vDiscR = (scene.config.valves === 4 ? 0.024 : 0.035) * boreScale;

        if (scene.config.valves === 4) {
            const vIn1 = createValve(scene, scene.matSteel, "Ssący 1", vDiscR);
            const vIn2 = createValve(scene, scene.matSteel, "Ssący 2", vDiscR);
            const vEx1 = createValve(scene, scene.matSteel, "Wydechowy 1", vDiscR);
            const vEx2 = createValve(scene, scene.matSteel, "Wydechowy 2", vDiscR);
            const sIn1 = createSpringMesh(scene);
            const sIn2 = createSpringMesh(scene);
            const sEx1 = createSpringMesh(scene);
            const sEx2 = createSpringMesh(scene);
            cylG.add(vIn1, vIn2, vEx1, vEx2, sIn1, sIn2, sEx1, sEx2);
            valvesList.push(
                { vg: vIn1, sp: sIn1, type: 'in', offZ: -vOffZ },
                { vg: vIn2, sp: sIn2, type: 'in', offZ: vOffZ },
                { vg: vEx1, sp: sEx1, type: 'ex', offZ: -vOffZ },
                { vg: vEx2, sp: sEx2, type: 'ex', offZ: vOffZ }
            );
        } else {
            const vIn = createValve(scene, scene.matSteel, "Ssący", vDiscR);
            const vEx = createValve(scene, scene.matSteel, "Wydechowy", vDiscR);
            const sIn = createSpringMesh(scene);
            const sEx = createSpringMesh(scene);
            cylG.add(vIn, vEx, sIn, sEx);
            
            if (scene.config.valvetrain === 'OHV') {
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

        const sparkPlug = createSparkPlug(scene);
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
          new THREE.CylinderGeometry(0.007, 0.009, 0.05, 12), scene.matDarkSteel
        );
        injBody.userData.name = "Wtryskiwacz paliwa";
        injectorG.add(injBody);
        const injNozzle = new THREE.Mesh(
          new THREE.ConeGeometry(0.009, 0.015, 8), scene.matSilver
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
        scene.cylinderPositions.push({
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

        const pistonG = createPiston(scene, boreRadius, pistonLength);
        cylG.add(pistonG);

        const rodG = createConnectingRod(scene, rodLength);
        engineGroup.add(rodG);

        const lobeRotIn = cfg.firingAngle / 2 + Math.PI / 4;
        const lobeRotEx = cfg.firingAngle / 2 + (7 * Math.PI) / 4;

        scene.movingCylinders.push({
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
            
            const lobe = createCamLobe(scene);
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
                
                ra = createRockerArm(scene);
                // Oś dźwigienki nieco bliżej środka, ramię sięga zaworu (valveSign)
                ra.position.set(valveSign * vOffX, headBase + 0.12 * boreScale, cfg.z + lobeZOffset);
                
                // Rotacja dźwigienki, by łączyła zawór (valveSign * vOffX) z pushrodem (pushrodSideSign * 0.07)
                // W createRockerArm, środek to pivot. Lewa/prawa strona to końce.
                // Upraszczamy: po prostu obracamy tak, by wyglądało poprawnie
                ra.rotation.y = (valveSign < 0) ? Math.PI : 0;
                bankG.add(ra);
                
                prGeo = new THREE.CylinderGeometry(0.003, 0.003, 1, 8);
                prMesh = new THREE.Mesh(prGeo, scene.matSteel);
                prMesh.userData.name = "Laska popychacza (Pushrod)";
                bankG.add(prMesh);
            }

            scene.valvesToDrive.push({
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
            const globalCamX = (scene.config.layout === 'Inline' || scene.config.layout === 'VR') ? 0.16 * boreScale : 0;
            const globalCamY = (scene.config.layout === 'Inline' || scene.config.layout === 'VR') ? (rodLength * 0.5 + explodeDist * 0.5) : (rodLength * 0.35 + explodeDist * 0.5);
            const beltPath = new THREE.CatmullRomCurve3([
              new THREE.Vector3(0, -0.045, 0),
              new THREE.Vector3(-0.045, 0, 0),
              new THREE.Vector3(-0.045, 0.045, 0),
              new THREE.Vector3(globalCamX - 0.042, globalCamY, 0),
              new THREE.Vector3(globalCamX, globalCamY + 0.042, 0),
              new THREE.Vector3(globalCamX + 0.042, globalCamY, 0),
              new THREE.Vector3(0.045, 0, 0)
            ], true);
            bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), scene.matBelt);
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
        bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), scene.matBelt);
        bankBelt.position.set(0, 0, gearZ);
        bankBelt.userData.name = "Pasek rozrządu";
        bankG.add(bankBelt); // Added per-bank for DOHC
      }

      scene.banksData.push({ bankG, camBaseIn, camBaseEx, bankBelt, bankAngle, inSign, exSign });
    });

    // ════════════════════════════════════════════════════════════════════════
    
    sceneContext.headBase = headBase;
    return null; // banks added inside
  }
}
