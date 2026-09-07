import * as THREE from 'three';
import { resolveFiringSequence, resolveCrankPinAngles, analyzeEngineBalance } from '../../crankshaft_solver.js';

export function createCylConfig(config, id, z, bank, firingAngleDeg, crankPinAngle) {
    const firingAngle = (firingAngleDeg * Math.PI) / 180;
    const is2Stroke = config.stroke === 2;
    const cyclePi = is2Stroke ? 2 : 4;
    const phaseOffset = (2 * Math.PI - firingAngle + cyclePi * Math.PI) % (cyclePi * Math.PI);
    return { id, z, bank, crankPinAngle, phaseOffset, firingAngle };
}

export function computeEngineDatum(scene) {
    const config = scene.config;
    const layout = config.layout;
    const cylCount = config.cylinders;
    const vAngle = config.vAngle * Math.PI / 180;
    
    const boreMm = config.boreMm || 84.0;
    const strokeMm = config.strokeMm || 90.0;
    const boreScale = boreMm / 84.0;
    const strokeScale = strokeMm / 90.0;
    const boreRadius = 0.105 * boreScale;
    const sleeveRadius = boreRadius + 0.008 * boreScale;
    const crankRadius = 0.16 * strokeScale;
    const rodLength = 0.48 * strokeScale;
    const pistonLength = Math.max(0.12, boreRadius * 1.5);
    const pistonCrownH = 0.035 + pistonLength / 2.0;
    const sleeveCenter = rodLength + pistonCrownH * 0.5;
    const deckHeight = rodLength + crankRadius + pistonCrownH;
    const sleeveLength = Math.max(0.35, (crankRadius * 2) + pistonCrownH + 0.08 * boreScale);

    const minWallClearance = 0.024 * boreScale;
    const minRequiredDist = 2 * sleeveRadius + minWallClearance;
    let zSpacing = Math.max(0.18, minRequiredDist);

    const vrAngleRad = 10.6 * Math.PI / 180;
    // Zgodnie z zasadami upakowania silnika VR:
    // Odległość DIAGONALNA (w 3D) między osiami cylindrów na poziomie pokładu głowicy musi wynosić
    // średnicę zewnętrzną tulei plus minimalny luz.
    const minCenterDist = (2 * sleeveRadius) + (0.015 * boreScale);
    
    // Zamiast wymuszać "zygzak 90-stopni", który sztucznie wydłużał silnik na osi Z,
    // pakujemy cylindry maksymalnie ciasno, tak jak w prawdziwym VW VR6.
    // Ustawiamy odstęp wzdłużny (dZ) na ułamek średnicy otworu (cylindry mocno na siebie zachodzą w osi Z).
    let vrStaggerZ = boreRadius * 1.65; // ok. 69mm dla otworu 84mm
    
    // Obliczamy wymaganą odległość na osi X na SAMYM DOLE tulei (gdzie cylindry są najbliżej siebie)
    // Z Pitagorasa: dX_bottom^2 + dZ^2 = minCenterDist^2
    const dX_bottom = Math.sqrt((minCenterDist * minCenterDist) - (vrStaggerZ * vrStaggerZ));
    
    // Taper (zwężenie na osi X) między głowicą a dołem tulei wynikające z kąta rozwarcia:
    const taper = sleeveLength * 2 * Math.tan(vrAngleRad / 2);
    
    // Odległość poprzeczna (dX) na poziomie głowicy musi być większa o taper, aby dół się nie przecinał
    const target_dX = dX_bottom + taper;
    
    // Obliczamy offset osiowy wału (desaxeX) od tyłu
    // Z uwagi na kąt rozwarcia (np. 10.6 st.), cylindry oddalają się od siebie ku górze.
    // Offset na wale musi to uwzględniać.
    const deckOffset = 2 * deckHeight * Math.tan(vrAngleRad / 2);
    const computed_desaxeX_VR = (target_dX - deckOffset) / 2.0;

    let vStaggerZ = zSpacing * 0.45;
    let wVRStaggerZ = vrStaggerZ;
    // Dla silnika W przesunięcie w osi Z między blokami VR to szerokość jednej korby
    let wBankOffsetZ = 0.055; 

    if (layout === "VR") {
      zSpacing = vrStaggerZ * 2.0;
    } else if (layout === "V") {
      const dx = 2 * sleeveCenter * Math.sin(vAngle / 2);
      if (dx < minRequiredDist) {
        const minRequiredDz = Math.sqrt(Math.max(0.012, minRequiredDist * minRequiredDist - dx * dx));
        vStaggerZ = Math.max(zSpacing * 0.45, minRequiredDz);
        zSpacing = Math.max(zSpacing, vStaggerZ * 2.0);
      }
    } else if (layout === "W") {
      wVRStaggerZ = vrStaggerZ;
      wBankOffsetZ = Math.max(0.055, zSpacing * 0.22); // Width of one connecting rod
      zSpacing = vrStaggerZ * 2.0;
    }

    const startZ = -(cylCount - 1) * zSpacing / 2;

    const bankAngles = [];
    for (let i = 0; i < cylCount; i++) {
      let bank = 0;
      if (layout === "V" || layout === "VR") {
        const actualAngle = layout === "VR" ? 10.6 * Math.PI / 180 : vAngle;
        bank = (i % 2 === 0) ? -actualAngle / 2 : actualAngle / 2;
      } else if (layout === "W") {
        const vAngleW = 72 * Math.PI / 180;
        const vrAngle = 10.6 * Math.PI / 180;
        const isRightVR = i % 2 !== 0;
        const vrIndex = Math.floor(i / 2);
        const isVRBack = vrIndex % 2 !== 0;
        
        if (!isRightVR && !isVRBack) bank = -vAngleW/2 - vrAngle/2;       // Bank 1: Left VR, Front
        else if (!isRightVR && isVRBack) bank = -vAngleW/2 + vrAngle/2;   // Bank 2: Left VR, Back
        else if (isRightVR && !isVRBack) bank = vAngleW/2 - vrAngle/2;    // Bank 3: Right VR, Front
        else if (isRightVR && isVRBack) bank = vAngleW/2 + vrAngle/2;     // Bank 4: Right VR, Back
      } else if (layout === "Boxer") {
        bank = (i % 2 === 0) ? -Math.PI / 2 : Math.PI / 2;
      }
      bankAngles.push(bank);
    }

    const firingAnglesDeg = resolveFiringSequence(config);
    const crankPinAngles = resolveCrankPinAngles(config, bankAngles);

    let cylinderConfigs = [];
    for (let i = 0; i < cylCount; i++) {
      const bank = bankAngles[i];
      let z = startZ + i * zSpacing;

      if (layout === "V" || layout === "VR" || layout === "Boxer") {
        const pairIdx = Math.floor(i / 2);
        const baseZ = -(Math.ceil(cylCount / 2) - 1) * zSpacing / 2 + pairIdx * zSpacing;
        const offsetZ = layout === "VR" ? vrStaggerZ : layout === "V" ? vStaggerZ : zSpacing * 0.45;
        z = (i % 2 === 0) ? baseZ : baseZ + offsetZ;
      } else if (layout === "W") {
        const isRightVR = i % 2 !== 0;
        const pinIndex = Math.floor(i / 2);
        
        // Obliczamy Z dla danego pinu, centrując cały silnik na Z=0
        const totalPins = cylCount / 2;
        const baseZ = -(totalPins - 1) * wVRStaggerZ / 2 + pinIndex * wVRStaggerZ;
        
        z = baseZ;
        if (isRightVR) z += wBankOffsetZ;
      }

      const firing = firingAnglesDeg[i];
      const crankPin = crankPinAngles[i];
      z = -z; // Odwracamy oś Z, aby cylinder #1 był z przodu (maxZ - rozrząd), a ostatni z tyłu (minZ - koło zamachowe)
      // MATEMATYKA DESAXE (OFFSETU OSIOWEGO) DLA VR I W
      // ------------------------------------------------
      // Silnik VR ma cylindry przesunięte względem osi wału, aby zmieściły się w jednym bloku
      // zachowując wąski kąt (np. 10.6 stopnia). 
      // Obliczamy lokalny offset (localDesaxeX) w płaszczyźnie poziomej danego rzędu (banku).
      let localDesaxeX = 0;
      let localDesaxeY = 0;
      if (layout === "VR") {
          // Dla VR, bank < 0 daje u.x = -sin(ujemny) > 0, czyli cylinder pochyla się w PRAWO.
          // Aby cylindry się rozchodziły od wału (V-angle), ten co pochyla się w prawo 
          // musi mieć dodatni offset (w prawo). Dlatego bankSign = bank < 0 ? 1 : -1.
          const bankSign = bank < 0 ? 1 : -1;
          localDesaxeX = bankSign * computed_desaxeX_VR; 
          localDesaxeY = 0; 
      } else if (layout === "W") {
          // Silnik W składa się z dwóch bloków VR rozchylonych o kąt wVRBaseAngle (np. 72 stopnie).
          // Aby prawidłowo policzyć offset wewnątrz danego bloku VR, musimy ustalić "lokalny" kąt
          // cylindra względem środka jego własnego bloku VR.
          const wVRBaseAngle = bank > 0 ? (72 * Math.PI / 180)/2 : -(72 * Math.PI / 180)/2;
          const localVrAngle = bank - wVRBaseAngle;
          
          // Podobnie jak dla VR, lokalny kąt ujemny oznacza pochylenie "w prawo" w układzie bloku.
          const bankSign = localVrAngle < 0 ? 1 : -1;
          localDesaxeX = bankSign * computed_desaxeX_VR;
          localDesaxeY = 0;
      }
      
      const cfg = createCylConfig(config, i + 1, z, bank, firing, crankPin);
      
      // Zapisujemy wartości lokalne, będą użyte w ValvetrainAndCylinders.ts do 
      // przesunięcia siatek 3D cylindra ZANIM zostaną obrócone o kąt bankAngle.
      (cfg as any).localDesaxeX = localDesaxeX;
      (cfg as any).localDesaxeY = localDesaxeY;

      // PRZEKSZTAŁCENIE DO WSPÓŁRZĘDNYCH GLOBALNYCH (WORLD SPACE)
      // ---------------------------------------------------------
      // globalDesaxe określa bezwzględne położenie osi cylindra na poziomie wału.
      // Dla VR, kąt bazowy bloku to 0, więc global = local.
      // Dla W, musimy obrócić wektor localDesaxe o kąt całego bloku VR (wVRBaseAngle).
      // Obrót wektora 2D: x' = x*cos(a) - y*sin(a), y' = x*sin(a) + y*cos(a)
      let globalDesaxeX = localDesaxeX;
      let globalDesaxeY = localDesaxeY;
      if (layout === "W") {
          const wVRBaseAngle = bank > 0 ? (72 * Math.PI / 180)/2 : -(72 * Math.PI / 180)/2;
          globalDesaxeX = localDesaxeX * Math.cos(wVRBaseAngle) - localDesaxeY * Math.sin(wVRBaseAngle);
          globalDesaxeY = localDesaxeX * Math.sin(wVRBaseAngle) + localDesaxeY * Math.cos(wVRBaseAngle);
      }

      // cfg.a0 = Początek osi cylindra (globalnie)
      // cfg.u  = Wektor kierunkowy cylindra (globalnie, odchylony o całkowity kąt 'bank')
      // cfg.m  = Środek tulei (globalnie) używany do bounding boxów i detekcji kolizji
      (cfg as any).a0 = new THREE.Vector3(globalDesaxeX, globalDesaxeY, z);
      (cfg as any).u = new THREE.Vector3(-Math.sin(bank), Math.cos(bank), 0);
      (cfg as any).n = new THREE.Vector3(Math.cos(bank), Math.sin(bank), 0);
      (cfg as any).m = (cfg as any).a0.clone().add((cfg as any).u.clone().multiplyScalar(sleeveCenter));

      cylinderConfigs.push(cfg);
    }

    const cx = cylinderConfigs.reduce((sum, c) => sum + c.m.x, 0) / cylCount;
    const cy = cylinderConfigs.reduce((sum, c) => sum + c.m.y, 0) / cylCount;
    const cz = cylinderConfigs.reduce((sum, c) => sum + c.m.z, 0) / cylCount;
    const centroid = new THREE.Vector3(cx, cy, cz);

    const maxZ = cylinderConfigs.length > 0 ? Math.max(...cylinderConfigs.map(c => c.z)) + 0.15 : 0.15;
    const minZ = cylinderConfigs.length > 0 ? Math.min(...cylinderConfigs.map(c => c.z)) - 0.15 : -0.15;
    const engineLength = maxZ - minZ;

    scene.currentBalanceReport = analyzeEngineBalance(cylinderConfigs, config);

    return { 
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength, pistonLength 
    };
}

export function createDatumLabel(text, color = '#ffffff', bgColor = 'rgba(15, 23, 42, 0.85)') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.stroke();

    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.28, 0.07, 1);
    sprite.userData.isDatumLabel = true;
    return sprite;
}

export function buildDatumVisuals(scene, engineGroup, datum) {
    scene.datumGroup = new THREE.Group();
    scene.datumGroup.visible = scene.config.showDatum;

    datum.cylinderConfigs.forEach(cfg => {
      const topPt = (cfg as any).a0.clone().add((cfg as any).u.clone().multiplyScalar(1.2));
      const pts = [(cfg as any).a0, topPt];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, scene.matDatumLine);
      scene.datumGroup.add(line);

      const node = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 16), scene.matDatumNode);
      node.position.copy((cfg as any).m);
      node.userData.name = `Punkt środka Cyl #${cfg.id}`;
      scene.datumGroup.add(node);

      const cylLabel = createDatumLabel(`Oś Cyl #${cfg.id}`, '#f59e0b');
      cylLabel.position.copy(topPt).add(new THREE.Vector3(0, 0.04, 0));
      scene.datumGroup.add(cylLabel);
    });

    const oMarker = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), scene.matDatumOrigin);
    oMarker.position.copy(datum.centroid);
    oMarker.userData.name = "Centrum geometryczne silnika (Centroid)";
    scene.datumGroup.add(oMarker);

    const centroidLabel = createDatumLabel(`📍 CENTRUM SILNIKA`, '#ff007f');
    centroidLabel.position.copy(datum.centroid).add(new THREE.Vector3(0, 0.08, 0));
    scene.datumGroup.add(centroidLabel);

    const size = 0.45;
    const endX = datum.centroid.clone().add(new THREE.Vector3(size, 0, 0));
    const endY = datum.centroid.clone().add(new THREE.Vector3(0, size, 0));
    const endZ = datum.centroid.clone().add(new THREE.Vector3(0, 0, size));

    const xLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endX]), scene.matDatumAxisX);
    const yLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endY]), scene.matDatumAxisY);
    const zLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endZ]), scene.matDatumAxisZ);
    scene.datumGroup.add(xLine, yLine, zLine);

    const lblX = createDatumLabel(`+X (Poprzeczna)`, '#ef4444');
    lblX.position.copy(endX).add(new THREE.Vector3(0.08, 0, 0));

    const lblY = createDatumLabel(`+Y (Pionowa)`, '#10b981');
    lblY.position.copy(endY).add(new THREE.Vector3(0, 0.05, 0));

    const lblZ = createDatumLabel(`+Z (Wzdłużna / Wał)`, '#3b82f6');
    lblZ.position.copy(endZ).add(new THREE.Vector3(0, 0, 0.08));

    scene.datumGroup.add(lblX, lblY, lblZ);

    engineGroup.add(scene.datumGroup);

    const boltGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8);
    const boltCount = datum.cylinderConfigs.length * 4; // 4 bolts per cylinder
    const boltInstanced = new THREE.InstancedMesh(boltGeo, scene.matDarkSteel, boltCount);
    boltInstanced.userData.name = "Śruby bloku silnika (InstancedMesh)";
    
    let boltIdx = 0;
    const dummy = new THREE.Object3D();
    
    const bx = datum.sleeveRadius + 0.02 * datum.boreScale;
    const bz = datum.sleeveRadius + 0.02 * datum.boreScale;
    
    datum.cylinderConfigs.forEach(cfg => {
      const deckPos = (cfg as any).a0.clone().add((cfg as any).u.clone().multiplyScalar(datum.deckHeight));
      
      const offsets = [
        [bx, bz], [-bx, bz],
        [bx, -bz], [-bx, -bz]
      ];
      
      offsets.forEach(off => {
          dummy.position.copy(deckPos);
          // Apply X offset along the normal vector 'n', and Z offset along the global Z axis
          dummy.position.add((cfg as any).n.clone().multiplyScalar(off[0]));
          dummy.position.z += off[1];
          
          dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), (cfg as any).u);
          dummy.updateMatrix();
          boltInstanced.setMatrixAt(boltIdx++, dummy.matrix);
      });
    });
    
    engineGroup.add(boltInstanced);

}
