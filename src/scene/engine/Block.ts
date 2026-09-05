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

    let vrStaggerZ = zSpacing * 0.50;
    let vStaggerZ = zSpacing * 0.45;
    let wVRStaggerZ = zSpacing * 0.50;
    let wBankOffsetZ = Math.max(0.065, zSpacing * 0.28);

    if (layout === "VR") {
      const vrAngleRad = 15 * Math.PI / 180;
      const dx = 2 * sleeveCenter * Math.sin(vrAngleRad / 2);
      const minRequiredDz = Math.sqrt(Math.max(0.012, minRequiredDist * minRequiredDist - dx * dx));
      vrStaggerZ = Math.max(zSpacing * 0.50, minRequiredDz);
      zSpacing = vrStaggerZ * 2.0;
    } else if (layout === "V") {
      const dx = 2 * sleeveCenter * Math.sin(vAngle / 2);
      if (dx < minRequiredDist) {
        const minRequiredDz = Math.sqrt(Math.max(0.012, minRequiredDist * minRequiredDist - dx * dx));
        vStaggerZ = Math.max(zSpacing * 0.45, minRequiredDz);
        zSpacing = Math.max(zSpacing, vStaggerZ * 2.0);
      }
    } else if (layout === "W") {
      const vrAngleRad = 15 * Math.PI / 180;
      const dxVR = 2 * sleeveCenter * Math.sin(vrAngleRad / 2);
      const minRequiredDzVR = Math.sqrt(Math.max(0.012, minRequiredDist * minRequiredDist - dxVR * dxVR));
      wVRStaggerZ = Math.max(zSpacing * 0.50, minRequiredDzVR);
      wBankOffsetZ = Math.max(0.065, zSpacing * 0.30);
      zSpacing = Math.max(zSpacing * 1.4, (wVRStaggerZ + wBankOffsetZ) * 1.8);
    }

    const startZ = -(cylCount - 1) * zSpacing / 2;

    const bankAngles = [];
    for (let i = 0; i < cylCount; i++) {
      let bank = 0;
      if (layout === "V" || layout === "VR") {
        const actualAngle = layout === "VR" ? 15 * Math.PI / 180 : vAngle;
        bank = (i % 2 === 0) ? -actualAngle / 2 : actualAngle / 2;
      } else if (layout === "W") {
        const vAngleW = 72 * Math.PI / 180;
        const vrAngle = 15 * Math.PI / 180;
        if (i % 4 === 0) bank = -vAngleW/2 - vrAngle/2;
        else if (i % 4 === 1) bank = -vAngleW/2 + vrAngle/2;
        else if (i % 4 === 2) bank = vAngleW/2 - vrAngle/2;
        else if (i % 4 === 3) bank = vAngleW/2 + vrAngle/2;
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
        const bayIdx = Math.floor(i / 4);
        const baseZ = -(Math.ceil(cylCount / 4) - 1) * zSpacing / 2 + bayIdx * zSpacing;
        const mod4 = i % 4;
        if (mod4 === 0) z = baseZ;
        else if (mod4 === 1) z = baseZ + wVRStaggerZ;
        else if (mod4 === 2) z = baseZ + wBankOffsetZ;
        else if (mod4 === 3) z = baseZ + wVRStaggerZ + wBankOffsetZ;
      }

      const firing = firingAnglesDeg[i];
      const crankPin = crankPinAngles[i];
      z = -z; // Odwracamy oś Z, aby cylinder #1 był z przodu (maxZ - rozrząd), a ostatni z tyłu (minZ - koło zamachowe)
      const cfg = createCylConfig(config, i + 1, z, bank, firing, crankPin);

      (cfg as any).u = new THREE.Vector3(-Math.sin(bank), Math.cos(bank), 0);
      (cfg as any).n = new THREE.Vector3(Math.cos(bank), Math.sin(bank), 0);
      (cfg as any).a0 = new THREE.Vector3(0, 0, z);
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
