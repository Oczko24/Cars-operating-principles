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
      let bankKey = cfg.bank.toFixed(2);
      let baseBank = cfg.bank;
      
      if (layout === 'VR') {
          bankKey = '0.00';
          baseBank = 0;
      } else if (layout === 'W') {
          baseBank = cfg.bank < 0 ? -(72 * Math.PI / 180)/2 : (72 * Math.PI / 180)/2;
          bankKey = baseBank.toFixed(2);
      }
      
      if (!banks[bankKey]) banks[bankKey] = { baseBank, cylinders: [] };
      banks[bankKey].cylinders.push(cfg);
    });

    scene.banksData = [];
    const headBase = deckHeight + 0.02 * boreScale + explodeDist * 1.5; 
    const isOHV = scene.config.valvetrain === "OHV" || scene.config.valvetrain === "valve_ohv";
    const valveBaseY = headBase + 0.084 + 0.025 * boreScale;
    const isVR = scene.config.layout === 'VR' || scene.config.layout === 'W';
    // W VR podnosimy wałek jeszcze wyżej (0.115 + 0.025), by dźwigienki mogły przejść nad szklankami.
    // Dla zwykłych silników wystarczy 0.095 + 0.025.
    const trueCamY = isOHV ? (rodLength * 0.5 + explodeDist * 0.5) : (valveBaseY + ((isVR && scene.config.valves >= 4) ? 0.140 : 0.120) * boreScale);
    const camOffsetX = (scene.config.valves >= 4 ? 0.042 : 0.046) * boreScale;
    
    let firstBankOHV = true;

    Object.keys(banks).forEach(bankKey => {
      const bankAngle = banks[bankKey].baseBank;
      const cylinders = banks[bankKey].cylinders;
      if (!Array.isArray(cylinders)) return;

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

        const localCylAngle = cfg.bank - bankAngle;
        const localDesaxeX = (scene.config.layout === "VR" || scene.config.layout === "W") ? -(localCylAngle > 0 ? 1 : -1) * 0.12 * boreScale : 0;
        const localDesaxeY = 0;

        const cylPartsG = new THREE.Group();
        cylPartsG.position.set(localDesaxeX, localDesaxeY, 0);
        cylPartsG.rotation.z = localCylAngle;
        cylG.add(cylPartsG);

        const sleeve = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLength, 16)), scene.lineMat);
        sleeve.position.set(0, sleeveCenter + explodeDist, 0);
        sleeve.userData.name = "Tuleja cylindra (Zarys)";
        sleeve.visible = scene.config.showWireframes !== false;
        cylPartsG.add(sleeve);

        let head = null;
        if (scene.config.layout !== 'VR' && scene.config.layout !== 'W') {
            const headWidth = Math.max(0.28, 2 * sleeveRadius + 0.06);
            const headDepth = zSpacing - 0.02;
            head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(headWidth, 0.16 * boreScale, headDepth)), scene.lineMat);
            head.position.set(0, headBase + 0.08 * boreScale, 0);
            head.userData.name = "Głowica cylindra (Zarys)";
            head.visible = scene.config.showWireframes !== false;
            cylG.add(head);
        }

        const valvesList = [];
        const vOffX = 0.045 * boreScale;
        let vDiscR_in = 0;
        let vDiscR_ex = 0;
        let vOffZ_in = 0;
        let vOffZ_ex = 0;
        let vOffZ_in_outer = 0;

        if (scene.config.valves === 5) {
            vDiscR_in = 0.022 * boreScale;
            vDiscR_ex = 0.028 * boreScale;
            vOffZ_in_outer = 0.046 * boreScale;
            vOffZ_ex = 0.036 * boreScale;
            
            const vIn1 = createValve(scene, scene.matSteel, "Ssący 1", vDiscR_in);
            const vIn2 = createValve(scene, scene.matSteel, "Ssący 2", vDiscR_in);
            const vIn3 = createValve(scene, scene.matSteel, "Ssący 3", vDiscR_in);
            const vEx1 = createValve(scene, scene.matSteel, "Wydechowy 1", vDiscR_ex);
            const vEx2 = createValve(scene, scene.matSteel, "Wydechowy 2", vDiscR_ex);
            const sIn1 = createSpringMesh(scene);
            const sIn2 = createSpringMesh(scene);
            const sIn3 = createSpringMesh(scene);
            const sEx1 = createSpringMesh(scene);
            const sEx2 = createSpringMesh(scene);
            cylG.add(vIn1, vIn2, vIn3, vEx1, vEx2, sIn1, sIn2, sIn3, sEx1, sEx2);
            
            if (scene.config.layout === 'VR' || scene.config.layout === 'W') {
                const isRightRow = cfg.bank > 0;
                const localCylAngle = cfg.bank - bankAngle;
                const localDesaxeX = (scene.config.layout === "VR" || scene.config.layout === "W") ? -(localCylAngle > 0 ? 1 : -1) * 0.12 * boreScale : 0;
                const deckX = localDesaxeX - deckHeight * Math.sin(localCylAngle);
                
                const vxOff = 0.028 * boreScale;
                valvesList.push(
                    { vg: vIn1, sp: sIn1, type: 'in', offZ: -vOffZ_in_outer, forceOffX: deckX - vxOff },
                    { vg: vIn2, sp: sIn2, type: 'in', offZ: 0, forceOffX: deckX - vxOff },
                    { vg: vIn3, sp: sIn3, type: 'in', offZ: vOffZ_in_outer, forceOffX: deckX - vxOff },
                    { vg: vEx1, sp: sEx1, type: 'ex', offZ: -vOffZ_ex, forceOffX: deckX + vxOff },
                    { vg: vEx2, sp: sEx2, type: 'ex', offZ: vOffZ_ex, forceOffX: deckX + vxOff }
                );
            } else {
                valvesList.push(
                    { vg: vIn1, sp: sIn1, type: 'in', offZ: -vOffZ_in_outer },
                    { vg: vIn2, sp: sIn2, type: 'in', offZ: 0 },
                    { vg: vIn3, sp: sIn3, type: 'in', offZ: vOffZ_in_outer },
                    { vg: vEx1, sp: sEx1, type: 'ex', offZ: -vOffZ_ex },
                    { vg: vEx2, sp: sEx2, type: 'ex', offZ: vOffZ_ex }
                );
            }
        } else if (scene.config.valves === 4) {
            vDiscR_in = 0.035 * boreScale;
            vDiscR_ex = 0.030 * boreScale;
            vOffZ_in = 0.038 * boreScale;
            vOffZ_ex = 0.038 * boreScale;
            
            const vIn1 = createValve(scene, scene.matSteel, "Ssący 1", vDiscR_in);
            const vIn2 = createValve(scene, scene.matSteel, "Ssący 2", vDiscR_in);
            const vEx1 = createValve(scene, scene.matSteel, "Wydechowy 1", vDiscR_ex);
            const vEx2 = createValve(scene, scene.matSteel, "Wydechowy 2", vDiscR_ex);
            const sIn1 = createSpringMesh(scene);
            const sIn2 = createSpringMesh(scene);
            const sEx1 = createSpringMesh(scene);
            const sEx2 = createSpringMesh(scene);
            cylG.add(vIn1, vIn2, vEx1, vEx2, sIn1, sIn2, sEx1, sEx2);
            
            if (scene.config.layout === 'VR' || scene.config.layout === 'W') {
                const isRightRow = cfg.bank > 0;
                const localCylAngle = cfg.bank - bankAngle;
                const localDesaxeX = (scene.config.layout === "VR" || scene.config.layout === "W") ? -(localCylAngle > 0 ? 1 : -1) * 0.12 * boreScale : 0;
                const deckX = localDesaxeX - deckHeight * Math.sin(localCylAngle);
                
                const vxOff = 0.035 * boreScale; 
                valvesList.push(
                    { vg: vIn1, sp: sIn1, type: 'in', offZ: -vOffZ_in, forceOffX: deckX - vxOff },
                    { vg: vIn2, sp: sIn2, type: 'in', offZ: vOffZ_in, forceOffX: deckX - vxOff },
                    { vg: vEx1, sp: sEx1, type: 'ex', offZ: -vOffZ_ex, forceOffX: deckX + vxOff },
                    { vg: vEx2, sp: sEx2, type: 'ex', offZ: vOffZ_ex, forceOffX: deckX + vxOff }
                );
            } else {
                valvesList.push(
                    { vg: vIn1, sp: sIn1, type: 'in', offZ: -vOffZ_in },
                    { vg: vIn2, sp: sIn2, type: 'in', offZ: vOffZ_in },
                    { vg: vEx1, sp: sEx1, type: 'ex', offZ: -vOffZ_ex },
                    { vg: vEx2, sp: sEx2, type: 'ex', offZ: vOffZ_ex }
                );
            }
        } else {
            vDiscR_in = 0.044 * boreScale;
            vDiscR_ex = 0.038 * boreScale;
            
            const vIn = createValve(scene, scene.matSteel, "Ssący", vDiscR_in);
            const vEx = createValve(scene, scene.matSteel, "Wydechowy", vDiscR_ex);
            const sIn = createSpringMesh(scene);
            const sEx = createSpringMesh(scene);
            cylG.add(vIn, vEx, sIn, sEx);
            
            if (scene.config.valvetrain === 'OHV') {
                const vOffZOHV = 0.045 * boreScale;
                valvesList.push(
                    { vg: vIn, sp: sIn, type: 'in', offZ: -vOffZOHV, forceOffX: 0 },
                    { vg: vEx, sp: sEx, type: 'ex', offZ: vOffZOHV, forceOffX: 0 }
                );
            } else if (scene.config.layout === 'VR' || scene.config.layout === 'W') {
                const vOffZInline = 0.043 * boreScale; 
                const localCylAngle = cfg.bank - bankAngle;
                const localDesaxeX = -(localCylAngle > 0 ? 1 : -1) * 0.12 * boreScale;
                const deckX = localDesaxeX - deckHeight * Math.sin(localCylAngle);
                
                const isRightRow = cfg.bank > 0;
                valvesList.push(
                    { vg: vIn, sp: sIn, type: 'in', offZ: -vOffZInline, forceOffX: deckX, forceCam: isRightRow ? 'in' : 'ex' },
                    { vg: vEx, sp: sEx, type: 'ex', offZ: vOffZInline, forceOffX: deckX, forceCam: isRightRow ? 'in' : 'ex' }
                );
            } else {
                valvesList.push(
                    { vg: vIn, sp: sIn, type: 'in', offZ: 0 },
                    { vg: vEx, sp: sEx, type: 'ex', offZ: 0 }
                );
            }
        }

        const sparkPlug = createSparkPlug(scene);
        sparkPlug.position.set(0, headBase + 0.16 * boreScale + explodeDist, 0);
        cylPartsG.add(sparkPlug);

        const fireMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0 });
        const fireMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09 * boreScale, 16, 16), fireMat);
        fireMesh.position.set(0, headBase + 0.04 * boreScale + explodeDist, 0); 
        cylPartsG.add(fireMesh);

        // ═══ SFERA SSANIA (Intake Gas) ═══
        const inGasMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0, depthWrite: false });
        const inGas = new THREE.Mesh(new THREE.SphereGeometry(0.06 * boreScale, 12, 12), inGasMat);
        inGas.position.set(inSign * (0.06 * boreScale), headBase + 0.06 * boreScale, 0);
        inGas.userData.name = "Gazy ssące (powietrze)";
        cylPartsG.add(inGas);

        // ═══ SFERA WYDECHU (Exhaust Gas) ═══
        const exGasMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0, depthWrite: false });
        const exGas = new THREE.Mesh(new THREE.SphereGeometry(0.06 * boreScale, 12, 12), exGasMat);
        exGas.position.set(exSign * (0.06 * boreScale), headBase + 0.06 * boreScale, 0);
        exGas.userData.name = "Spaliny (exhaust)";
        cylPartsG.add(exGas);

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

        injectorG.position.set(inSign * (0.07 * boreScale), headBase + 0.12 * boreScale, 0);
        injectorG.rotation.z = -inSign * (20 * Math.PI / 180);
        injectorG.userData.name = "Wtryskiwacz";
        cylPartsG.add(injectorG);

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
        cylPartsG.add(pistonG);

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
            const xPos = vData.forceOffX !== undefined ? vData.forceOffX : (valveSign * camOffsetX);
            
            vData.vg.position.set(xPos, valveBaseY, vData.offZ);
            vData.sp.position.set(xPos, valveBaseY - 0.02, vData.offZ);
            
            const camGroup = (isOHV) ? camShaftEx : (vData.forceCam ? (vData.forceCam === 'ex' ? camShaftEx : camShaftIn) : (isEx ? camShaftEx : camShaftIn));
            const lobeRot = isEx ? lobeRotEx : lobeRotIn;
            
            let lobeZOffset = vData.offZ;
            
            const lobe = createCamLobe(scene);
            lobe.position.set(0, 0, cfg.z + lobeZOffset);
            lobe.rotation.z = lobeRot;
            camGroup.add(lobe);
            
            // W VR dodajemy popychacze (rocker arms) łączące zawory z oddalonym wałkiem (dotyczy też 2 zaworów!)
            if (scene.config.layout === 'VR' || scene.config.layout === 'W') {
                const targetCamX = vData.forceCam ? (vData.forceCam === 'ex' ? camOffsetX : -camOffsetX) : (isEx ? camOffsetX : -camOffsetX);
                const distanceX = targetCamX - xPos;
                if (Math.abs(distanceX) > 0.005) {
                    const bridgeGeo = new THREE.BoxGeometry(Math.abs(distanceX) + 0.02, 0.008, 0.010);
                    const bridge = new THREE.Mesh(bridgeGeo, scene.matGold);
                    // Przesuwamy w osi Z mijankowo (intake w jedną, exhaust w drugą) by się nie przecinały!
                    const bridgeZOff = isEx ? 0.007 : -0.007;
                    // Mostek jest podniesiony do 0.115, by ominąć szklanki sąsiednich zaworów (szklanka jest na 0.095)
                    bridge.position.set(distanceX / 2, 0.115 * boreScale, bridgeZOff); 
                    bridge.userData.name = "Dźwigienka zaworowa (Rocker)";
                    vData.vg.add(bridge);

                    // Dodajemy mały dystans pionowy, żeby połączyć szklankę z podniesionym mostkiem
                    const spacerGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.02 * boreScale, 16);
                    const spacer = new THREE.Mesh(spacerGeo, scene.matGold);
                    spacer.position.set(0, 0.105 * boreScale, bridgeZOff);
                    spacer.userData.name = "Dystans dźwigienki";
                    vData.vg.add(spacer);
                }
            }
            
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

      if (scene.config.layout === 'VR' || scene.config.layout === 'W') {
          // Głowica
          const headWidth = Math.max(0.48, 2 * sleeveRadius * 2 + 0.1);
          const headDepth = len + 0.02; // len is bMaxZ - bMinZ
          const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(headWidth, 0.16 * boreScale, headDepth)), scene.lineMat);
          head.position.set(0, headBase + 0.08 * boreScale, midZ);
          head.userData.name = "Głowica cylindra (Zarys wspólny)";
          head.visible = scene.config.showWireframes !== false;
          bankG.add(head);

          // Blok silnika (od korby do głowicy)
          const blockHeight = deckHeight;
          const blockMesh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(headWidth * 0.95, blockHeight, headDepth)), scene.lineMat);
          blockMesh.position.set(0, blockHeight / 2 + explodeDist, midZ);
          blockMesh.userData.name = "Blok silnika (Zarys wspólny)";
          blockMesh.visible = scene.config.showWireframes !== false;
          bankG.add(blockMesh);
      }

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
