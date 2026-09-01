import * as THREE from 'three';
import { resolveFiringSequence, resolveCrankPinAngles, analyzeEngineBalance } from '../crankshaft_solver.js';
import { VehicleDimensions } from './VehicleConfig.js';

export function createCylConfig(id, z, bank, firingAngleDeg, crankPinAngle) {
    const firingAngle = (firingAngleDeg * Math.PI) / 180;
    const is2Stroke = this.config.stroke === 2;
    const cyclePi = is2Stroke ? 2 : 4;
    const phaseOffset = (2 * Math.PI - firingAngle + cyclePi * Math.PI) % (cyclePi * Math.PI);
    return { id, z, bank, crankPinAngle, phaseOffset, firingAngle };
  }

export function computeEngineDatum() {
    const layout = this.config.layout;
    const cylCount = this.config.cylinders;
    const vAngle = this.config.vAngle * Math.PI / 180;
    
    // Skalowanie fizyczne (Bore mm -> Three units, Stroke mm -> Three units)
    const boreMm = this.config.boreMm || 84.0;
    const strokeMm = this.config.strokeMm || 90.0;
    const boreScale = boreMm / 84.0;
    const strokeScale = strokeMm / 90.0;
    const boreRadius = 0.105 * boreScale;
    const sleeveRadius = boreRadius + 0.008 * boreScale;
    const crankRadius = 0.16 * strokeScale;
    const rodLength = 0.48 * strokeScale;
    const pistonLength = Math.max(0.12, boreRadius * 1.4);
    const pistonCrownH = 0.035 + pistonLength / 2.0;
    const sleeveCenter = rodLength + pistonCrownH * 0.5;
    const deckHeight = rodLength + crankRadius + pistonCrownH;
    const sleeveLength = Math.max(0.35, (crankRadius * 2) + pistonCrownH + 0.08 * boreScale);

    // Odstęp między cylindrami (zSpacing / Bore Pitch)
    // Zapewnia stałą, bezpieczną grubość ścianki bloku i płaszcza chłodzenia
    const minWallClearance = 0.024 * boreScale;
    const minRequiredDist = 2 * sleeveRadius + minWallClearance;
    let zSpacing = Math.max(0.18, minRequiredDist);

    // Dynamiczny Stagger dla VR, V i W
    let vrStaggerZ = zSpacing * 0.50;
    let vStaggerZ = zSpacing * 0.45;
    let wVRStaggerZ = zSpacing * 0.50;
    let wBankOffsetZ = Math.max(0.065, zSpacing * 0.28);

    if (layout === "VR") {
      // W silnikach VR (kąt rozwarcia 15° w jednej głowicy) przesunięcie poprzeczne wynosi dx
      const vrAngleRad = 15 * Math.PI / 180;
      const dx = 2 * sleeveCenter * Math.sin(vrAngleRad / 2);
      const minRequiredDz = Math.sqrt(Math.max(0.012, minRequiredDist * minRequiredDist - dx * dx));
      vrStaggerZ = Math.max(zSpacing * 0.50, minRequiredDz);
      zSpacing = vrStaggerZ * 2.0;
    } else if (layout === "V") {
      // W silnikach V przy dowolnym kącie rozwarcia (np. 15° do 180°)
      const dx = 2 * sleeveCenter * Math.sin(vAngle / 2);
      if (dx < minRequiredDist) {
        const minRequiredDz = Math.sqrt(Math.max(0.012, minRequiredDist * minRequiredDist - dx * dx));
        vStaggerZ = Math.max(zSpacing * 0.45, minRequiredDz);
        zSpacing = Math.max(zSpacing, vStaggerZ * 2.0);
      }
    } else if (layout === "W") {
      // W silnikach W (dwie głowice VR pod kątem 72°, wewnątrz każdej VR kąt 15°)
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

    const firingAnglesDeg = resolveFiringSequence(this.config);
    const crankPinAngles = resolveCrankPinAngles(this.config, bankAngles);

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
      const cfg = this.createCylConfig(i + 1, z, bank, firing, crankPin);

      // Calculate datum vectors
      cfg.u = new THREE.Vector3(-Math.sin(bank), Math.cos(bank), 0);
      cfg.n = new THREE.Vector3(Math.cos(bank), Math.sin(bank), 0);
      cfg.a0 = new THREE.Vector3(0, 0, z);
      cfg.m = cfg.a0.clone().add(cfg.u.clone().multiplyScalar(sleeveCenter));

      cylinderConfigs.push(cfg);
    }

    const cx = cylinderConfigs.reduce((sum, c) => sum + c.m.x, 0) / cylCount;
    const cy = cylinderConfigs.reduce((sum, c) => sum + c.m.y, 0) / cylCount;
    const cz = cylinderConfigs.reduce((sum, c) => sum + c.m.z, 0) / cylCount;
    const centroid = new THREE.Vector3(cx, cy, cz);

    const maxZ = Math.max(...cylinderConfigs.map(c => c.z)) + 0.15;
    const minZ = Math.min(...cylinderConfigs.map(c => c.z)) - 0.15;
    const engineLength = maxZ - minZ;

    this.currentBalanceReport = analyzeEngineBalance(cylinderConfigs, this.config);

    return { 
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength 
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

export function buildDatumVisuals(engineGroup, datum) {
    this.datumGroup = new THREE.Group();
    this.datumGroup.visible = this.config.showDatum;

    datum.cylinderConfigs.forEach(cfg => {
      // Bore Centerline
      const topPt = cfg.a0.clone().add(cfg.u.clone().multiplyScalar(1.2));
      const pts = [cfg.a0, topPt];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, this.matDatumLine);
      this.datumGroup.add(line);

      // Bore Midpoint Node
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 16), this.matDatumNode);
      node.position.copy(cfg.m);
      node.userData.name = `Punkt środka Cyl #${cfg.id}`;
      this.datumGroup.add(node);

      // Etykieta wektora cylindra
      const cylLabel = this.createDatumLabel(`Oś Cyl #${cfg.id}`, '#f59e0b');
      cylLabel.position.copy(topPt).add(new THREE.Vector3(0, 0.04, 0));
      this.datumGroup.add(cylLabel);
    });

    // Engine Centroid Marker
    const oMarker = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), this.matDatumOrigin);
    oMarker.position.copy(datum.centroid);
    oMarker.userData.name = "Centrum geometryczne silnika (Centroid)";
    this.datumGroup.add(oMarker);

    const centroidLabel = this.createDatumLabel(`📍 CENTRUM SILNIKA`, '#ff007f');
    centroidLabel.position.copy(datum.centroid).add(new THREE.Vector3(0, 0.08, 0));
    this.datumGroup.add(centroidLabel);

    // Tripod axes from Centroid
    const size = 0.45;
    const endX = datum.centroid.clone().add(new THREE.Vector3(size, 0, 0));
    const endY = datum.centroid.clone().add(new THREE.Vector3(0, size, 0));
    const endZ = datum.centroid.clone().add(new THREE.Vector3(0, 0, size));

    const xLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endX]), this.matDatumAxisX);
    const yLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endY]), this.matDatumAxisY);
    const zLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endZ]), this.matDatumAxisZ);
    this.datumGroup.add(xLine, yLine, zLine);

    // Etykiety osi X, Y, Z
    const lblX = this.createDatumLabel(`+X (Poprzeczna)`, '#ef4444');
    lblX.position.copy(endX).add(new THREE.Vector3(0.08, 0, 0));

    const lblY = this.createDatumLabel(`+Y (Pionowa)`, '#10b981');
    lblY.position.copy(endY).add(new THREE.Vector3(0, 0.05, 0));

    const lblZ = this.createDatumLabel(`+Z (Wzdłużna / Wał)`, '#3b82f6');
    lblZ.position.copy(endZ).add(new THREE.Vector3(0, 0, 0.08));

    this.datumGroup.add(lblX, lblY, lblZ);

    engineGroup.add(this.datumGroup);
  }

export function buildEngineAssembly() {
    const datum = this.computeEngineDatum();
    this.currentEngineDatum = datum;
    const { 
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength 
    } = datum;

    const isTransverse = this.config.orientation === 'transverse';
    const compactGbLen = isTransverse ? 0.32 : 0.65;
    const gbEndLocal = minZ - 0.05 - compactGbLen;
    const midZLocal = (maxZ + gbEndLocal) / 2.0;

    this.engineMountGroup = new THREE.Group();
    
    // 1. Placement (Vehicle Coordinates)
    const mountY = VehicleDimensions.engineMountY;
    const frontZ = VehicleDimensions.wheelbaseFrontZ;
    const rearZ = VehicleDimensions.wheelbaseRearZ;
    
    if (this.config.placement === 'front') {
      this.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (frontZ + 0.18) : (frontZ - 0.25));
    } else if (this.config.placement === 'mid') {
      this.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (rearZ + 0.8) : (rearZ + 0.90));
    } else if (this.config.placement === 'rear') {
      this.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (rearZ - 0.20) : (rearZ - 0.25));
    }

    // 2. Orientation (Transverse vs Longitudinal)
    if (isTransverse) {
      this.engineMountGroup.rotation.y = -Math.PI / 2;
    }

    // 3. Tilt / Slant
    if (this.config.tiltAngle) {
      this.engineMountGroup.rotation.z = (this.config.tiltAngle * Math.PI) / 180;
    }

    const engineGroup = new THREE.Group();
    this.engineMountGroup.add(engineGroup);

    this.buildDatumVisuals(engineGroup, datum);

    const layout = this.config.layout;
    const cylCount = this.config.cylinders;
    const vAngle = this.config.vAngle * Math.PI / 180;
    const strokeLength = crankRadius * 2;
    const pistonLength = Math.max(0.12, boreRadius * 1.4);

    // Crankcase as Wireframe: szerokość i długość rozszerzają się wraz z rozmiarem tłoków i układem
    let blockWidth = Math.max(0.56, 2 * sleeveRadius + 0.36);
    if (layout === 'V' || layout === 'W') {
      blockWidth = Math.max(0.68, (sleeveCenter + sleeveRadius) * 2 * Math.sin(vAngle / 2) + 0.25);
    } else if (layout === 'Boxer') {
      blockWidth = Math.max(1.10, (sleeveCenter + sleeveRadius) * 2 + 0.20);
    }

    const crankcaseHeight = Math.max(0.20, crankRadius * 1.3 + 0.04);
    const crankcase = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(blockWidth, crankcaseHeight, engineLength + 0.12)), 
      this.crankcaseLineMat
    );
    crankcase.position.set(0, -crankcaseHeight / 2, (maxZ+minZ)/2);
    crankcase.userData.name = "Miska olejowa (Zarys)";
    engineGroup.add(crankcase);

    const crankMaster = new THREE.Group();
    // ═══ SEGMENTOWE CZOPY GŁÓWNE I WYKORBIENIA WAŁU KORBOWEGO ═══
    const pinWidth = 0.055;
    const webThick = 0.022;
    const throwHalfWidth = pinWidth / 2 + webThick; // ~0.0495

    // Profil ramienia wykorbienia i aerodynamicznego przeciwciężaru (THREE.Shape)
    const webShape = new THREE.Shape();
    webShape.moveTo(-0.036 * strokeScale, crankRadius);
    webShape.absarc(0, crankRadius, 0.036 * strokeScale, Math.PI, 0, false); // łuk nad czopem korbowodowym
    webShape.lineTo(0.044 * strokeScale, 0.02 * strokeScale);                              // ramię ku osi głównej
    webShape.lineTo(0.100 * strokeScale, -0.04 * strokeScale);                             // rozszerzenie w przeciwciężar
    webShape.quadraticCurveTo(0.108 * strokeScale, -0.175 * strokeScale, 0, -0.185 * strokeScale);       // dolny łuk przeciwciężaru
    webShape.quadraticCurveTo(-0.108 * strokeScale, -0.175 * strokeScale, -0.100 * strokeScale, -0.04 * strokeScale);
    webShape.lineTo(-0.044 * strokeScale, 0.02 * strokeScale);
    webShape.lineTo(-0.036 * strokeScale, crankRadius);

    const webGeo = new THREE.ExtrudeGeometry(webShape, {
      depth: webThick,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.002,
      bevelThickness: 0.002
    });
    webGeo.translate(0, 0, -webThick / 2);

    // ═══ KOŁO ZĘBATE WAŁU (Timing Gear) ═══
    const crankGear = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 32), this.matDarkSteel);
    crankGear.rotation.x = Math.PI / 2;
    crankGear.position.z = maxZ + 0.05;
    crankGear.userData.name = "Koło zębate wału";
    crankMaster.add(crankGear);

    // ═══ EXPLODE DISTANCE (musi być przed komponentami które go używają) ═══
    const explodeDist = this.explodedFactor * 0.45;

    // ═══ KOŁO PASOWE WAŁU KORBOWEGO (Crank Pulley) ═══
    const crankPulleyR = 0.085;
    const crankPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(crankPulleyR, crankPulleyR, 0.02, 32), this.matDarkSteel
    );
    crankPulley.rotation.x = Math.PI / 2;
    crankPulley.position.set(0, 0, maxZ + 0.08);
    crankPulley.userData.name = "Koło pasowe wału korbowego";
    crankMaster.add(crankPulley);

    // ═══ KOŁO POMPY WODY (Water Pump Pulley) ═══
    const wpPulleyR = 0.045;
    const wpPosX = 0.0, wpPosY = 0.14;
    const wpPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(wpPulleyR, wpPulleyR, 0.02, 24), this.matDarkSteel
    );
    wpPulley.rotation.x = Math.PI / 2;
    wpPulley.position.set(wpPosX, wpPosY, maxZ + 0.08);
    wpPulley.userData.name = "Koło pasowe pompy wody";
    engineGroup.add(wpPulley);
    this.wpPulley = wpPulley;

    // ═══ ALTERNATOR (z kołem pasowym i regulatorem napięcia) ═══
    const altG = new THREE.Group();
    const altPosX = layout === 'Boxer' ? 0.32 : 0.28;
    const altPosY = layout === 'Boxer' ? 0.10 : 0.18;
    altG.position.set(altPosX, altPosY, maxZ + 0.05);

    const altBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.1, 20), this.matSilver
    );
    altBody.rotation.x = Math.PI / 2;
    altBody.userData.name = "Alternator";
    altG.add(altBody);

    const altPulleyR = 0.033;
    const altPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(altPulleyR, altPulleyR, 0.018, 24), this.matDarkSteel
    );
    altPulley.rotation.x = Math.PI / 2;
    altPulley.position.z = 0.058;
    altPulley.userData.name = "Koło pasowe alternatora";
    altG.add(altPulley);
    this.alternatorGroup = altG;
    engineGroup.add(altG);

    // Pasek klinowy wielorowkowy (Serpentine Belt) opasający wał, pompę wody i alternator
    const beltCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -crankPulleyR, 0),
      new THREE.Vector3(crankPulleyR * 0.8, -crankPulleyR * 0.5, 0),
      new THREE.Vector3(altPosX + altPulleyR, altPosY, 0),
      new THREE.Vector3(altPosX, altPosY + altPulleyR, 0),
      new THREE.Vector3(wpPosX + wpPulleyR, wpPosY + wpPulleyR, 0),
      new THREE.Vector3(wpPosX - wpPulleyR, wpPosY, 0),
      new THREE.Vector3(-crankPulleyR, 0, 0)
    ], true);
    const altBelt = new THREE.Mesh(
      new THREE.TubeGeometry(beltCurve, 80, 0.007, 6, true), this.matRubber
    );
    altBelt.position.z = maxZ + 0.08;
    altBelt.userData.name = "Pasek klinowy (Serpentine)";
    engineGroup.add(altBelt);

    // ═══ Tablice do zbierania pozycji cylindrów (dla uniwersalnych kolektorów) ═══
    this.cylinderPositions = [];

    // Generowanie wykorbień (throws) dla każdego cylindra
    cylinderConfigs.forEach(cfg => {
      const throwG = new THREE.Group();
      throwG.position.z = cfg.z;
      throwG.rotation.z = cfg.crankPinAngle;

      // Czop korbowodowy (Crankpin journal) - w odległości crankRadius
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, pinWidth, 24), this.matSteel);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0, crankRadius, 0); 
      pin.userData.name = "Czop korbowodowy";
      throwG.add(pin);

      // Kanał olejowy w czopie
      const oilHole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), this.matDarkSteel);
      oilHole.position.set(0, crankRadius + 0.025, 0);
      oilHole.userData.name = "Kanał olejowy czopa korbowodowego";
      throwG.add(oilHole);

      // Ramiona wykorbienia (Webs) i przeciwciężary (Counterweights) z przodu i z tyłu czopa
      [-1, 1].forEach(dir => {
        const webZOff = dir * (pinWidth / 2 + webThick / 2);
        const web = new THREE.Mesh(webGeo, this.matDarkSteel);
        web.position.set(0, 0, webZOff);
        web.userData.name = "Ramię wykorbienia i przeciwciężar";
        throwG.add(web);
      });

      crankMaster.add(throwG);
    });

    // ═══ CZOPY GŁÓWNE (Main Journals) NA OSI OBROTU (0, 0) ═══
    // Tworzone wyłącznie pomiędzy wykorbieniami oraz na końcach wału
    const allCylZ = cylinderConfigs.map(c => c.z);
    const minCylZ = Math.min(...allCylZ);
    const maxCylZ = Math.max(...allCylZ);
    const uniqueZ = [...new Set(allCylZ)].sort((a, b) => a - b);

    // 1. Czopy pośrednie pomiędzy sąsiednimi wykorbieniami
    for (let k = 0; k < uniqueZ.length - 1; k++) {
      const zA = uniqueZ[k];
      const zB = uniqueZ[k + 1];
      const jStart = zA + throwHalfWidth;
      const jEnd = zB - throwHalfWidth;
      const jLen = jEnd - jStart;
      if (jLen > 0.004) {
        const midJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, jLen, 24), this.matSteel);
        midJ.rotation.x = Math.PI / 2;
        midJ.position.set(0, 0, (jStart + jEnd) / 2);
        midJ.userData.name = `Czop główny wału (Segment ${k + 1})`;
        crankMaster.add(midJ);
      }
    }

    // 2. Czop główny przedni (od pierwszego wykorbienia do koła zębatego)
    const frontStart = maxCylZ + throwHalfWidth;
    const frontEnd = maxZ + 0.05;
    if (frontEnd > frontStart) {
      const frontJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, frontEnd - frontStart, 24), this.matSteel);
      frontJ.rotation.x = Math.PI / 2;
      frontJ.position.set(0, 0, (frontStart + frontEnd) / 2);
      frontJ.userData.name = "Czop główny przedni wału";
      crankMaster.add(frontJ);
    }

    // 3. Czop główny tylny (od ostatniego wykorbienia do koła zamachowego)
    const rearStart = minZ - 0.01;
    const rearEnd = minCylZ - throwHalfWidth;
    if (rearEnd > rearStart) {
      const rearJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, rearEnd - rearStart, 24), this.matSteel);
      rearJ.rotation.x = Math.PI / 2;
      rearJ.position.set(0, 0, (rearStart + rearEnd) / 2);
      rearJ.userData.name = "Czop główny tylny wału";
      crankMaster.add(rearJ);
    }

    // Kołnierz montażowy koła zamachowego (Flywheel Flange)
    const flywheelFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 32), this.matDarkSteel);
    flywheelFlange.rotation.x = Math.PI / 2;
    flywheelFlange.position.set(0, 0, rearStart);
    flywheelFlange.userData.name = "Kołnierz koła zamachowego";
    crankMaster.add(flywheelFlange);

    engineGroup.add(crankMaster);
    this.crankMaster = crankMaster;

    const banks = {};
    cylinderConfigs.forEach(cfg => {
      // Group by approx bank angle to avoid precision issues
      const bankKey = cfg.bank.toFixed(2);
      if (!banks[bankKey]) banks[bankKey] = [];
      banks[bankKey].push(cfg);
    });

    this.banksData = [];
    const headBase = deckHeight + 0.02 * boreScale + explodeDist * 1.5; 
    const isOHV = this.config.valvetrain === "OHV" || this.config.valvetrain === "valve_ohv";
    const valveBaseY = headBase + 0.084 + 0.025 * boreScale;
    const trueCamY = isOHV ? (rodLength * 0.5 + explodeDist * 0.5) : (valveBaseY + 0.095 * boreScale);
    const camOffsetX = (this.config.valves === 4 ? 0.048 : 0.038) * boreScale;
    
    let firstBankOHV = true;

    Object.keys(banks).forEach(bankAngleStr => {
      const bankAngle = parseFloat(bankAngleStr);
      const cylinders = banks[bankAngleStr];

      // Dla VR: jedna wspólna głowica cross-flow (dolot po lewej inSign=-1, wydech po prawej exSign=1 dla obu rzędów)
      const flipBank = (this.config.layout === 'V' || this.config.layout === 'W' || this.config.layout === 'Boxer') && bankAngle > 0.001;
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
          const globalCamX = (this.config.layout === 'Inline' || this.config.layout === 'VR') ? 0.14 * boreScale : 0;
          const globalCamY = (this.config.layout === 'Inline' || this.config.layout === 'VR') ? (rodLength * 0.5 + explodeDist * 0.5) : (rodLength * 0.35 + explodeDist * 0.5);
          
          localX = globalCamX * Math.cos(bankAngle) + globalCamY * Math.sin(bankAngle);
          localY = -globalCamX * Math.sin(bankAngle) + globalCamY * Math.cos(bankAngle);
          
          camBaseEx.position.set(localX, localY, 0);
          camBaseIn.visible = false;
          
          if (firstBankOHV) {
              const centralCamGroup = new THREE.Group();
              centralCamGroup.position.set(globalCamX, globalCamY, 0);
              
              const meshOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.matBronze);
              meshOHV.rotation.x = Math.PI / 2;
              meshOHV.position.z = midZ;
              meshOHV.userData.name = "Wałek rozrządu (OHV)";
              centralCamGroup.add(meshOHV);
              
              const gearOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.matGold);
              gearOHV.rotation.x = Math.PI / 2;
              gearOHV.position.z = gearZ;
              gearOHV.userData.name = "Koło wałka rozrządu (OHV)";
              centralCamGroup.add(gearOHV);
              
              engineGroup.add(centralCamGroup);
              this.centralCamGroupOHV = centralCamGroup;
          }
          this.camshafts.push(camShaftEx);
      } else {
          camBaseIn.position.set(inSign * camOffsetX, trueCamY, 0);
          camBaseEx.position.set(exSign * camOffsetX, trueCamY, 0);
          
          const meshIn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.matBronze);
          meshIn.rotation.x = Math.PI / 2;
          meshIn.position.z = midZ;
          meshIn.userData.name = "Wałek rozrządu ssący";
          camShaftIn.add(meshIn);

          const meshEx = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.matBronze);
          meshEx.rotation.x = Math.PI / 2;
          meshEx.position.z = midZ;
          meshEx.userData.name = "Wałek rozrządu wydechowy";
          camShaftEx.add(meshEx);

          const gearIn = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.matGold);
          gearIn.rotation.x = Math.PI / 2;
          gearIn.position.z = gearZ;
          gearIn.userData.name = "Koło wałka ssącego";
          camShaftIn.add(gearIn);

          const gearEx = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.matGold);
          gearEx.rotation.x = Math.PI / 2;
          gearEx.position.z = gearZ;
          gearEx.userData.name = "Koło wałka wydechowego";
          camShaftEx.add(gearEx);
          
          this.camshafts.push(camShaftIn, camShaftEx);
      }

      cylinders.forEach(cfg => {
        const cylG = new THREE.Group();
        cylG.position.z = cfg.z;
        cylG.userData.cylId = cfg.id;
        bankG.add(cylG);

        const sleeve = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLength, 16)), this.lineMat);
        sleeve.position.set(0, sleeveCenter + explodeDist, 0);
        sleeve.userData.name = "Tuleja cylindra (Zarys)";
        sleeve.visible = this.config.showWireframes !== false;
        cylG.add(sleeve);

        const headWidth = Math.max(0.28, 2 * sleeveRadius + 0.06);
        const headDepth = zSpacing - 0.02;
        const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(headWidth, 0.16 * boreScale, headDepth)), this.lineMat);
        head.position.set(0, headBase + 0.08 * boreScale, 0);
        if (this.config.layout === 'VR') {
           head.scale.set(1.45, 1, 2.0); // scale Z to bridge gap between offset cylinders
           head.rotation.z = -bankAngle;
           head.position.x = -bankAngle * 0.2; // slight shift to center
        } else if (this.config.layout === 'W') {
           head.scale.set(1.45, 1, 2.0);
           const wVRBaseAngle = bankAngle > 0 ? (72 * Math.PI/180)/2 : -(72 * Math.PI/180)/2;
           head.rotation.z = -(bankAngle - wVRBaseAngle);
        }
        head.userData.name = "Głowica cylindra (Zarys)";
        head.visible = this.config.showWireframes !== false;
        cylG.add(head);

        const valvesList = [];
        const vOffZ = (this.config.valves === 4 ? 0.045 : 0) * boreScale;
        const vOffX = 0.045 * boreScale;
        const vDiscR = (this.config.valves === 4 ? 0.024 : 0.035) * boreScale;

        if (this.config.valves === 4) {
            const vIn1 = this.createValve(this.matSteel, "Ssący 1", vDiscR);
            const vIn2 = this.createValve(this.matSteel, "Ssący 2", vDiscR);
            const vEx1 = this.createValve(this.matSteel, "Wydechowy 1", vDiscR);
            const vEx2 = this.createValve(this.matSteel, "Wydechowy 2", vDiscR);
            const sIn1 = this.createSpringMesh();
            const sIn2 = this.createSpringMesh();
            const sEx1 = this.createSpringMesh();
            const sEx2 = this.createSpringMesh();
            cylG.add(vIn1, vIn2, vEx1, vEx2, sIn1, sIn2, sEx1, sEx2);
            valvesList.push(
                { vg: vIn1, sp: sIn1, type: 'in', offZ: -vOffZ },
                { vg: vIn2, sp: sIn2, type: 'in', offZ: vOffZ },
                { vg: vEx1, sp: sEx1, type: 'ex', offZ: -vOffZ },
                { vg: vEx2, sp: sEx2, type: 'ex', offZ: vOffZ }
            );
        } else {
            const vIn = this.createValve(this.matSteel, "Ssący", vDiscR);
            const vEx = this.createValve(this.matSteel, "Wydechowy", vDiscR);
            const sIn = this.createSpringMesh();
            const sEx = this.createSpringMesh();
            cylG.add(vIn, vEx, sIn, sEx);
            valvesList.push(
                { vg: vIn, sp: sIn, type: 'in', offZ: 0 },
                { vg: vEx, sp: sEx, type: 'ex', offZ: 0 }
            );
        }

        const sparkPlug = this.createSparkPlug();
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
          new THREE.CylinderGeometry(0.007, 0.009, 0.05, 12), this.matDarkSteel
        );
        injBody.userData.name = "Wtryskiwacz paliwa";
        injectorG.add(injBody);
        const injNozzle = new THREE.Mesh(
          new THREE.ConeGeometry(0.009, 0.015, 8), this.matSilver
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
        const localInPortX = inSign * (0.06 * boreScale);
        const localInPortY = headBase + 0.06 * boreScale;
        const localExPortX = exSign * (0.06 * boreScale);
        const localExPortY = headBase + 0.06 * boreScale;

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
        this.cylinderPositions.push({
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

        const pistonG = this.createPiston(boreRadius, pistonLength);
        cylG.add(pistonG);

        const rodG = this.createConnectingRod(rodLength);
        engineGroup.add(rodG);

        const lobeRotIn = cfg.firingAngle / 2 + Math.PI / 4;
        const lobeRotEx = cfg.firingAngle / 2 + (7 * Math.PI) / 4;

        this.movingCylinders.push({
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
            
            const camGroup = (isOHV) ? camShaftEx : (isEx ? camShaftEx : camShaftIn);
            const lobeRot = isEx ? lobeRotEx : lobeRotIn;
            
            let lobeZOffset = vData.offZ;
            if (isOHV && this.config.valves === 2) {
                lobeZOffset = isEx ? 0.015 : -0.015;
            }
            
            const lobe = this.createCamLobe();
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
                
                ra = this.createRockerArm();
                // Oś dźwigienki nieco bliżej środka, ramię sięga zaworu (valveSign)
                ra.position.set(valveSign * vOffX, headBase + 0.12 * boreScale, cfg.z + lobeZOffset);
                
                // Rotacja dźwigienki, by łączyła zawór (valveSign * vOffX) z pushrodem (pushrodSideSign * 0.07)
                // W createRockerArm, środek to pivot. Lewa/prawa strona to końce.
                // Upraszczamy: po prostu obracamy tak, by wyglądało poprawnie
                ra.rotation.y = (valveSign < 0) ? Math.PI : 0;
                bankG.add(ra);
                
                prGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(localX, localY + 0.01, cfg.z + lobeZOffset),
                    // Pushrod uderza w dźwigienkę po stronie pushrodSideSign
                    new THREE.Vector3(pushrodSideSign * (0.06 * boreScale), headBase + 0.12 * boreScale, cfg.z + lobeZOffset)
                ]);
                prMesh = new THREE.Line(prGeo, this.matSteel);
                prMesh.userData.name = "Laska popychacza (Pushrod)";
                bankG.add(prMesh);
            }

            this.valvesToDrive.push({
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
                offsetX: valveSign * vOffX,
                offsetZ: vData.offZ,
                prZ: cfg.z + lobeZOffset,
                isOHV: isOHV
            });
        });
      });

      let bankBelt = null;
      if (isOHV) {
        if (firstBankOHV) {
            const globalCamX = (this.config.layout === 'Inline' || this.config.layout === 'VR') ? 0.14 * boreScale : 0;
            const globalCamY = (this.config.layout === 'Inline' || this.config.layout === 'VR') ? (rodLength * 0.5 + explodeDist * 0.5) : (rodLength * 0.35 + explodeDist * 0.5);
            const beltPath = new THREE.CatmullRomCurve3([
              new THREE.Vector3(0, -0.045, 0),
              new THREE.Vector3(0.045, 0, 0),
              new THREE.Vector3(globalCamX + 0.042, globalCamY, 0),
              new THREE.Vector3(globalCamX, globalCamY + 0.042, 0),
              new THREE.Vector3(globalCamX - 0.042, globalCamY, 0),
              new THREE.Vector3(-0.045, 0.045, 0),
              new THREE.Vector3(-0.045, 0, 0)
            ], true);
            bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), this.matBelt);
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
        bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), this.matBelt);
        bankBelt.position.set(0, 0, gearZ);
        bankBelt.userData.name = "Pasek rozrządu";
        bankG.add(bankBelt); // Added per-bank for DOHC
      }

      this.banksData.push({ bankG, camBaseIn, camBaseEx, bankBelt, bankAngle, inSign, exSign });
    });

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 1. UNIWERSALNY KOLEKTOR SSĄCY (Intake Manifold & Throttle Body) ═══
    // ════════════════════════════════════════════════════════════════════════
    const intakeG = new THREE.Group();
    const plenumMidZ = (maxZ + minZ) / 2;
    const plenumLen = Math.max(0.20, engineLength * 0.72);

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
      // Dla Boxera: centralna puszka dolotu na szczycie bloku (Subaru style)
      plenumX = 0.0;
      plenumY = (rodLength + crankRadius) * 0.75 + explodeDist * 0.5;
    }

    // Korpus plenum (komora wyrównawcza)
    const plenumMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(plenumR, plenumR, plenumLen, 20), this.matSilver
    );
    plenumMesh.rotation.x = Math.PI / 2;
    plenumMesh.position.set(plenumX, plenumY, plenumMidZ);
    plenumMesh.userData.name = "Plenum dolotu (Komora wyrównawcza)";
    intakeG.add(plenumMesh);

    // Przepustnica (Throttle Body) zamocowana czołowo do plenum
    const tbG = new THREE.Group();
    const tbPosZ = maxZ + 0.06;
    tbG.position.set(plenumX, plenumY, tbPosZ);

    const tbBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.07, 24), this.matSilver
    );
    tbBody.rotation.x = Math.PI / 2;
    tbBody.userData.name = "Przepustnica (Throttle Body)";
    tbG.add(tbBody);

    // Klapa motylkowa (Butterfly flap)
    const flapG = new THREE.Group();
    const flap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.039, 0.039, 0.003, 20), this.matBronze
    );
    flap.rotation.x = Math.PI / 2;
    flap.userData.name = "Klapa motylkowa";
    flapG.add(flap);
    const flapAxis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.09, 8), this.matSteel
    );
    flapAxis.rotation.z = Math.PI / 2;
    flapAxis.userData.name = "Oś klapy przepustnicy";
    flapG.add(flapAxis);
    tbG.add(flapG);
    this.throttleFlapG = flapG;

    // Stożkowy filtr powietrza / dolot przed przepustnicą
    const intakeFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.06, 0.12, 20), this.matIntake
    );
    intakeFilter.rotation.x = Math.PI / 2;
    intakeFilter.position.z = 0.095;
    intakeFilter.userData.name = "Filtr powietrza (Dolot)";
    tbG.add(intakeFilter);
    intakeG.add(tbG);

    // ═══ LISTWY PALIWOWE (Fuel Rails) ═══
    if (layout === 'Inline' || layout === 'VR') {
      const fuelRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.010, engineLength + 0.08, 16), this.matExhaust
      );
      fuelRail.rotation.x = Math.PI / 2;
      fuelRail.position.set(-Math.max(0.13, 0.13 * boreScale + 0.02), headBase + 0.08 * boreScale, plenumMidZ);
      fuelRail.userData.name = "Listwa wtryskowa (Fuel Rail)";
      intakeG.add(fuelRail);
    } else {
      // Dla V / Boxer / W — dwie listwy paliwowe wzdłuż każdego banku
      [-1, 1].forEach((side, bIdx) => {
        const railZ = plenumMidZ;
        const bAng = (layout === 'Boxer') ? (side * Math.PI / 2) : (side * (vAngle * 180 / Math.PI / 2) * Math.PI / 180);
        const inSideSign = (bAng > 0.001) ? 1 : -1;
        const railLocalX = inSideSign * (0.08 * boreScale);
        const railX = railLocalX * Math.cos(bAng) - (headBase + 0.08 * boreScale) * Math.sin(bAng);
        const railY = railLocalX * Math.sin(bAng) + (headBase + 0.08 * boreScale) * Math.cos(bAng);
        const fuelRail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.009, engineLength * 0.7 + 0.06, 16), this.matExhaust
        );
        fuelRail.rotation.x = Math.PI / 2;
        fuelRail.position.set(railX, railY, railZ);
        fuelRail.userData.name = `Listwa wtryskowa (Bank #${bIdx + 1})`;
        intakeG.add(fuelRail);
      });
    }

    // ═══ RUNNERY DOLOTU (Intake Runners) + LINIE PRZEPŁYWU (Streamlines) ═══
    this.cylinderPositions.forEach((cyl, idx) => {
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

      const runnerCurve = new THREE.CatmullRomCurve3([pStart, pMid1, pMid2, pEnd], false, 'catmullrom', 0.2);
      const runnerMesh = new THREE.Mesh(
        new THREE.TubeGeometry(runnerCurve, 20, 0.016, 12, false), this.matIntake
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

      this.flowStreamlines.push({
        type: 'intake',
        cylId: cyl.id,
        phaseOffset: cyl.phaseOffset,
        streams: streamDashes
      });
    });
    engineGroup.add(intakeG);

    // ════════════════════════════════════════════════════════════════════════
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
        new THREE.CylinderGeometry(0.040, 0.026, 0.14, 16), this.matDarkSteel
      );
      collectorMesh.rotation.x = Math.PI / 2 - 0.2;
      collectorMesh.position.set(colX, colY, colZ);
      collectorMesh.userData.name = "Kolektor zbiorczy (Centrum Z=0)";
      exhaustG.add(collectorMesh);

      // Rury wydechowe (runners) z poszczególnych cylindrów zbiegające się w punkcie Z = 0
      this.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone();
        // Wyprowadzenie rury po wektorze normalnym na zewnątrz poza obrys bloku
        const p1 = pStart.clone().addScaledVector(cyl.exNorm, 0.08);
        const perpOffset = 0.032 * Math.sin((idx / Math.max(1, this.cylinderPositions.length - 1)) * Math.PI);
        const p2 = new THREE.Vector3(colX + 0.055, pStart.y * 0.35 + colY * 0.65 + perpOffset, pStart.z * 0.4 + colZ * 0.6);
        const pEnd = collectorPoint.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'catmullrom', 0.25);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 24, 0.016, 12, false), this.matExhaust
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

        this.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });

      // Rura spustowa (Downpipe) od kolektora 4-1 (Z=0) do traktu podwozia - omija bezpiecznie koło zamachowe
      const downpipeCurve = new THREE.CatmullRomCurve3([
        collectorPoint.clone().add(new THREE.Vector3(0, -0.01, -0.06)),
        new THREE.Vector3(colX + 0.02, colY - 0.04, (colZ + exhaustMergePoint.z) * 0.5),
        exhaustMergePoint
      ]);
      const downpipeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(downpipeCurve, 16, 0.022, 12, false), this.matExhaustPipe
      );
      downpipeMesh.userData.name = "Rura spustowa kolektora (Downpipe)";
      exhaustG.add(downpipeMesh);
    } else if (layout === 'V' || layout === 'W') {
      // Dwa kolektory po bokach (Lewy i Prawy) wyprowadzone na zewnątrz głowic i łączące się w Y-pipe
      const maxExX = Math.max(...this.cylinderPositions.map(c => Math.abs(c.exPort.x)), 0.38);
      const colXOffset = maxExX + 0.08; // kolektor bezpiecznie poza obrysem cylindrów i świec
      const colL = new THREE.Vector3(-colXOffset, -0.10, minZ - 0.05);
      const colR = new THREE.Vector3(colXOffset, -0.10, minZ - 0.05);
      exhaustMergePoint.set(exhaustX, -0.12, minZ - 0.20);

      this.cylinderPositions.forEach((cyl, idx) => {
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

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'catmullrom', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), this.matExhaust
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

        this.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });

      // Y-Pipe łączący oba banki do głównego układu wydechowego (exhaustMergePoint)
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
      const yLeftMesh = new THREE.Mesh(new THREE.TubeGeometry(yLeftCurve, 16, 0.020, 8, false), this.matExhaustPipe);
      const yRightMesh = new THREE.Mesh(new THREE.TubeGeometry(yRightCurve, 16, 0.020, 8, false), this.matExhaustPipe);
      yLeftMesh.userData.name = "Rura Y-Pipe (Lewa)";
      yRightMesh.userData.name = "Rura Y-Pipe (Prawa)";
      exhaustG.add(yLeftMesh, yRightMesh);
    } else if (layout === 'Boxer') {
      // Dla Boxera: rury schodzą od spodu głowic pod silnik i łączą się w dolny kolektor
      exhaustMergePoint.set(exhaustX, -0.14, minZ - 0.15);
      const colPoint = exhaustMergePoint.clone();

      this.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone(); // znajduje się na dole głowicy (y < 0)
        const p1 = pStart.clone().add(new THREE.Vector3(0, -0.06, 0));
        const sideSign = cyl.exPort.x < 0 ? -1 : 1;
        const p2 = (sideSign < 0)
          ? new THREE.Vector3(0.0, -0.16, cyl.z * 0.5 + colPoint.z * 0.5)
          : new THREE.Vector3(0.22, -0.15, cyl.z * 0.5 + colPoint.z * 0.5);
        const pEnd = colPoint.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'catmullrom', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), this.matExhaust
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

        this.flowStreamlines.push({
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
    // ═══ 3. PEŁNY UKŁAD WYDECHOWY DO TYŁU POJAZDU (Single / Dual Exhaust) ══
    // ════════════════════════════════════════════════════════════════════════
    this.carGroup.add(this.engineMountGroup);
    this.engineGroup = engineGroup;
    this.engineZMin = minZ; // Used to place gearbox securely behind engine

    this.engineMountGroup.updateMatrixWorld(true);
    const mergePointWorld = exhaustMergePoint.clone().applyMatrix4(this.engineMountGroup.matrixWorld);

    const fullExhaustG = new THREE.Group();
    const isDual = this.config.exhaustPipes === 'dual';

    // Rysowanie traktu wydechowego dla wybranej strony (+1 prawa, -1 lewa)
    const buildExhaustTract = (tractSign, namePrefix) => {
      const underbodyX = (this.config.orientation === 'transverse') ? (tractSign * 0.12) : (tractSign * exhaustX);
      const exhaustY = 0.25;
      const flexStart = new THREE.Vector3(underbodyX, exhaustY, -0.55);
      
      // Jeśli dual i lewa strona, dodaj rurę łączącą od mergePoint do lewego traktu
      if (isDual && tractSign === -1) {
        const xCrossoverCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.12, exhaustY, -0.55),
          new THREE.Vector3(0, exhaustY, -0.62),
          flexStart
        ]);
        const xCrossoverMesh = new THREE.Mesh(new THREE.TubeGeometry(xCrossoverCurve, 12, 0.020, 8, false), this.matExhaustPipe);
        xCrossoverMesh.userData.name = "Rura rozdzielająca wydech (Dual X-Pipe)";
        fullExhaustG.add(xCrossoverMesh);
      }

      if (tractSign === 1) {
        const downpipeCurve = new THREE.CatmullRomCurve3([
          mergePointWorld,
          new THREE.Vector3(
            mergePointWorld.x * 0.6 + underbodyX * 0.4,
            (mergePointWorld.y + exhaustY) * 0.5,
            (mergePointWorld.z + flexStart.z) * 0.5
          ),
          flexStart
        ]);
        const downpipeMesh = new THREE.Mesh(
          new THREE.TubeGeometry(downpipeCurve, 20, 0.022, 12, false), this.matExhaustPipe
        );
        downpipeMesh.userData.name = "Rura spustowa kolektora (Downpipe)";
        fullExhaustG.add(downpipeMesh);
      }

      const flexEnd = new THREE.Vector3(underbodyX, exhaustY, -0.72);
      const flexCurve = new THREE.CatmullRomCurve3([flexStart, flexEnd]);
      const flexMesh = new THREE.Mesh(new THREE.TubeGeometry(flexCurve, 10, 0.024, 12, false), this.matFlexPipe);
      flexMesh.userData.name = `${namePrefix} Złącze elastyczne (Flex Pipe)`;
      fullExhaustG.add(flexMesh);

      // Katalizator (Catalytic Converter)
      const catZ = -0.90;
      const catMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.22, 20), this.matCatalyst
      );
      catMesh.rotation.x = Math.PI / 2;
      catMesh.position.set(underbodyX, exhaustY, catZ);
      catMesh.scale.set(1.3, 1, 0.8);
      catMesh.userData.name = `${namePrefix} Katalizator spalin`;
      fullExhaustG.add(catMesh);

      // Rura łącząca Flex Pipe z Katalizatorem
      const p1Curve = new THREE.LineCurve3(flexEnd, new THREE.Vector3(underbodyX, exhaustY, catZ + 0.11));
      const p1Mesh = new THREE.Mesh(new THREE.TubeGeometry(p1Curve, 4, 0.020, 8, false), this.matExhaustPipe);
      p1Mesh.userData.name = `${namePrefix} Rura przed katalizatorem`;
      fullExhaustG.add(p1Mesh);

      // Tłumik środkowy (Resonator)
      const resZ = -1.80;
      const resMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.35, 20), this.matMuffler
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
      const p2Mesh = new THREE.Mesh(new THREE.TubeGeometry(p2Curve, 8, 0.020, 8, false), this.matExhaustPipe);
      p2Mesh.userData.name = `${namePrefix} Rura środkowa wydechu`;
      fullExhaustG.add(p2Mesh);

      // Tłumik końcowy (Rear Muffler)
      const rearZ = VehicleDimensions.wheelbaseRearZ;
      const rearMufflerZ = rearZ - 0.35;
      const rearMuffler = new THREE.Mesh(
        new THREE.BoxGeometry(0.30, 0.16, 0.42), this.matMuffler
      );
      rearMuffler.position.set(underbodyX + tractSign * 0.04, exhaustY, rearMufflerZ);
      rearMuffler.userData.name = `${namePrefix} Tłumik końcowy (Rear Silencer)`;
      fullExhaustG.add(rearMuffler);

      // Rura podwozia: Tłumik środkowy -> Obejście dyferencjału -> Tłumik końcowy (tylko odchylenia X)
      const p3Curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(underbodyX, exhaustY, resZ - 0.175),
        new THREE.Vector3(underbodyX + tractSign * 0.05, exhaustY, rearZ + 0.30),
        new THREE.Vector3(underbodyX + tractSign * 0.06, exhaustY, rearZ + 0.15),
        new THREE.Vector3(underbodyX + tractSign * 0.04, exhaustY, rearMufflerZ + 0.21)
      ], false, 'catmullrom', 0.2);
      const p3Mesh = new THREE.Mesh(new THREE.TubeGeometry(p3Curve, 20, 0.020, 8, false), this.matExhaustPipe);
      p3Mesh.userData.name = `${namePrefix} Rura podwoziowa`;
      fullExhaustG.add(p3Mesh);

      // Chromowana końcówka wydechu (Chrome Tailpipe Tip)
      const tipZ = rearZ - 0.70;
      const tailpipeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.30, 24), this.matChrome
      );
      tailpipeMesh.rotation.x = Math.PI / 2;
      tailpipeMesh.position.set(underbodyX + tractSign * 0.04, exhaustY, tipZ);
      tailpipeMesh.userData.name = `${namePrefix} Końcówka wydechu (Tailpipe)`;
      fullExhaustG.add(tailpipeMesh);

      // Rura łącząca Tłumik końcowy z Końcówką
      const p4Curve = new THREE.LineCurve3(
        new THREE.Vector3(underbodyX + tractSign * 0.04, exhaustY, rearMufflerZ - 0.21),
        new THREE.Vector3(underbodyX + tractSign * 0.04, exhaustY, tipZ + 0.15)
      );
      const p4Mesh = new THREE.Mesh(new THREE.TubeGeometry(p4Curve, 4, 0.028, 8, false), this.matExhaustPipe);
      p4Mesh.userData.name = `${namePrefix} Rura końcówki wydechu`;
      fullExhaustG.add(p4Mesh);

      // Dynamiczna linia przepływu spalin (Glowing Streamline)
      const fullExhaustCurve = new THREE.CatmullRomCurve3([
        mergePointWorld,
        flexStart,
        flexEnd,
        new THREE.Vector3(underbodyX, exhaustY, catZ),
        new THREE.Vector3(underbodyX, exhaustY, resZ),
        new THREE.Vector3(underbodyX + tractSign * 0.05, exhaustY, -2.60),
        new THREE.Vector3(underbodyX + tractSign * 0.04, exhaustY, rearMufflerZ),
        new THREE.Vector3(underbodyX + tractSign * 0.04, exhaustY, tipZ)
      ], false, 'catmullrom', 0.2);

      const mainExhaustLineGeo = new THREE.BufferGeometry().setFromPoints(fullExhaustCurve.getPoints(60));
      const mainExhaustLine = new THREE.Line(mainExhaustLineGeo, this.matStreamlineMainExhaust);
      fullExhaustG.add(mainExhaustLine);
      this.exhaustMainStreamlines.push({ lineMesh: mainExhaustLine, curve: fullExhaustCurve });
    };

    // Zbuduj prawy trakt wydechowy (zawsze)
    buildExhaustTract(1, isDual ? "Prawy" : "");

    // Zbuduj lewy trakt wydechowy (jeśli dual exhaust)
    if (isDual) {
      buildExhaustTract(-1, "Lewy");
    }

    this.carGroup.add(fullExhaustG);

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 4. CHŁODNICA I W PEŁNI POŁĄCZONE WĘŻE CHŁODZENIA (Cooling) ════════
    // ════════════════════════════════════════════════════════════════════════
    const radG = new THREE.Group();
    const coreW = (layout === 'Boxer') ? 0.95 : 0.85;
    const coreH = 0.55, coreD = 0.055;
    const carRadZ = (this.config.placement === 'front') ? 2.30 : (this.config.placement === 'mid' ? -0.50 : -2.40);
    const carRadY = 0.65;

    // Rdzeń chłodnicy
    const radCore = new THREE.Mesh(
      new THREE.BoxGeometry(coreW, coreH, coreD), this.matDarkSteel
    );
    radCore.userData.name = "Rdzeń chłodnicy";
    radG.add(radCore);

    // Lamele chłodnicy
    const finCount = 28;
    const finPitch = coreW / (finCount + 1);
    for (let i = 1; i <= finCount; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, coreH * 0.88, coreD * 1.3), this.matSilver
      );
      fin.position.x = -coreW / 2 + i * finPitch;
      fin.userData.name = "Lamela chłodnicy";
      radG.add(fin);
    }

    // Zbiorniki górny i dolny
    const tankGeo = new THREE.BoxGeometry(coreW + 0.04, 0.055, 0.08);
    const topTank = new THREE.Mesh(tankGeo, this.matDarkSteel);
    topTank.position.y = coreH / 2 + 0.025;
    topTank.userData.name = "Zbiornik górny chłodnicy";

    const bottomTank = new THREE.Mesh(tankGeo.clone(), this.matDarkSteel);
    bottomTank.position.y = -coreH / 2 - 0.025;
    bottomTank.userData.name = "Zbiornik dolny chłodnicy";
    radG.add(topTank, bottomTank);

    // Króćce chłodnicy
    const topInlet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 16), this.matDarkSteel);
    topInlet.rotation.x = Math.PI / 2;
    topInlet.position.set(0.25, coreH / 2 + 0.025, -0.04);
    radG.add(topInlet);

    const botOutlet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 16), this.matDarkSteel);
    botOutlet.rotation.x = Math.PI / 2;
    botOutlet.position.set(-0.25, -coreH / 2 - 0.025, -0.04);
    radG.add(botOutlet);

    // Wentylator chłodnicy zamontowany z tyłu rdzenia
    const fanShroud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.03, 24), this.matRubber
    );
    fanShroud.rotation.x = Math.PI / 2;
    fanShroud.position.set(0, 0, -0.035);
    fanShroud.userData.name = "Obudowa wentylatora";
    radG.add(fanShroud);

    radG.position.set(0, carRadY, carRadZ);
    radG.userData.name = "Chłodnica";
    this.carGroup.add(radG);

    // ═══ WĘŻE CHŁODNICY (100% POŁĄCZONE Z BLOKIEM I GŁOWICĄ W PRZESTRZENI POJAZDU) ═══
    // Górny wąż (Gorący płyn: z głowicy/termostatu do górnego zbiornika chłodnicy)
    const thermostatPosLocal = new THREE.Vector3(
      this.cylinderPositions[0].inPort.x * 0.4,
      Math.max(0.55, this.cylinderPositions[0].inPort.y + 0.06),
      maxZ + 0.10
    );
    const thermoInWorld = thermostatPosLocal.clone().applyMatrix4(this.engineMountGroup.matrixWorld);
    const radTopInletPos = new THREE.Vector3(0.25, carRadY + coreH / 2 + 0.025, carRadZ - 0.04);

    const hoseUpperCurve = new THREE.CatmullRomCurve3([
      thermoInWorld,
      new THREE.Vector3((thermoInWorld.x + radTopInletPos.x) / 2, Math.max(thermoInWorld.y, radTopInletPos.y) + 0.08, (thermoInWorld.z + radTopInletPos.z) / 2),
      radTopInletPos
    ]);
    const hoseUpperMesh = new THREE.Mesh(
      new THREE.TubeGeometry(hoseUpperCurve, 20, 0.020, 10, false), this.matRubber
    );
    hoseUpperMesh.userData.name = "Wąż chłodnicy górny (Głowica → Chłodnica)";
    this.carGroup.add(hoseUpperMesh);

    // Dolny wąż (Zimny płyn: z dolnego zbiornika chłodnicy do pompy wody)
    const wpInletPosLocal = new THREE.Vector3(0, 0.14, maxZ + 0.06);
    const wpInWorld = wpInletPosLocal.clone().applyMatrix4(this.engineMountGroup.matrixWorld);
    const radBotOutletPos = new THREE.Vector3(-0.25, carRadY - coreH / 2 - 0.025, carRadZ - 0.04);

    const hoseLowerCurve = new THREE.CatmullRomCurve3([
      radBotOutletPos,
      new THREE.Vector3((radBotOutletPos.x + wpInWorld.x) / 2, 0.22, (radBotOutletPos.z + wpInWorld.z) / 2),
      wpInWorld
    ]);
    const hoseLowerMesh = new THREE.Mesh(
      new THREE.TubeGeometry(hoseLowerCurve, 20, 0.020, 10, false), this.matRubber
    );
    hoseLowerMesh.userData.name = "Wąż chłodnicy dolny (Chłodnica → Pompa wody)";
    this.carGroup.add(hoseLowerMesh);
  }

export function createConnectingRod(length) {
    const g = new THREE.Group();
    const rodMat = this.matSteel;
    const darkMat = this.matDarkSteel;
    const bronzeMat = this.matBronze;

    // ═══ PARAMETRY STOPY (Big End) ═══
    const pinR = 0.026;         // promień czopa korbowodowego
    const bigEndWidth = 0.032;  // szerokość wzdłuż osi Z

    // 1. GÓRNY KORPUS STOPY KORBOWODU (Y >= 0)
    const upperBigEndShape = new THREE.Shape();
    upperBigEndShape.moveTo(0.038, 0);
    upperBigEndShape.lineTo(0.038, 0.016);
    upperBigEndShape.quadraticCurveTo(0.034, 0.038, 0.016, 0.046);
    upperBigEndShape.lineTo(-0.016, 0.046);
    upperBigEndShape.quadraticCurveTo(-0.034, 0.038, -0.038, 0.016);
    upperBigEndShape.lineTo(-0.038, 0);
    const upperHole = new THREE.Path();
    upperHole.absarc(0, 0, pinR, Math.PI, 0, true);
    upperBigEndShape.holes.push(upperHole);

    const upperBigEndGeo = new THREE.ExtrudeGeometry(upperBigEndShape, {
      depth: bigEndWidth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.0015,
      bevelThickness: 0.0015
    });
    upperBigEndGeo.translate(0, 0, -bigEndWidth / 2);
    const upperBigEndMesh = new THREE.Mesh(upperBigEndGeo, rodMat);
    upperBigEndMesh.userData.name = "Stopa korbowodu (korpus)";
    g.add(upperBigEndMesh);

    // 2. POKRYWA STOPY KORBOWODU (ROD CAP - Y < 0)
    const capShape = new THREE.Shape();
    capShape.moveTo(-0.038, -0.0008);
    capShape.lineTo(-0.038, -0.018);
    capShape.quadraticCurveTo(-0.035, -0.042, 0, -0.044);
    capShape.quadraticCurveTo(0.035, -0.042, 0.038, -0.018);
    capShape.lineTo(0.038, -0.0008);
    const capHole = new THREE.Path();
    capHole.absarc(0, 0, pinR, 0, Math.PI, true);
    capShape.holes.push(capHole);

    const capGeo = new THREE.ExtrudeGeometry(capShape, {
      depth: bigEndWidth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.0015,
      bevelThickness: 0.0015
    });
    capGeo.translate(0, 0, -bigEndWidth / 2);
    const capMesh = new THREE.Mesh(capGeo, rodMat);
    capMesh.userData.name = "Pokrywa stopy korbowodu";
    g.add(capMesh);

    // 3. PANEWKI KORBOWODOWE (Bearing Shells)
    const bearingGeo = new THREE.CylinderGeometry(pinR + 0.0004, pinR + 0.0004, bigEndWidth - 0.002, 24, 1, true);
    const bearingMesh = new THREE.Mesh(bearingGeo, bronzeMat);
    bearingMesh.rotation.x = Math.PI / 2;
    bearingMesh.userData.name = "Panewka korbowodowa";
    g.add(bearingMesh);

    // 4. ŚRUBY KORBOWODOWE (Rod Bolts)
    [-0.031, 0.031].forEach(bx => {
      const boltStud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035, 0.0035, 0.048, 12),
        darkMat
      );
      boltStud.position.set(bx, -0.006, 0);
      boltStud.userData.name = "Śruba korbowodowa";
      g.add(boltStud);

      const boltHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 6),
        darkMat
      );
      boltHead.position.set(bx, -0.026, 0);
      boltHead.userData.name = "Łeb śruby korbowodowej (12-kątny)";
      g.add(boltHead);
    });

    // ═══ 5. TRZON KORBOWODU (H-Beam Shank) ═══
    const shankBottomY = 0.046;
    const shankTopY = length - 0.025;
    const shankLen = shankTopY - shankBottomY;
    const shankMidY = (shankBottomY + shankTopY) / 2;
    const flangeThickness = 0.0036;
    const flangeZOffset = 0.0065;

    // Środnik trzonu (Web):
    const webMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, shankLen, 0.0036),
      rodMat
    );
    webMesh.position.set(0, shankMidY, 0);
    webMesh.userData.name = "Trzon korbowodu (profil H-Beam)";
    g.add(webMesh);

    // Półka przednia (+Z):
    const frontFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, shankLen, flangeThickness),
      rodMat
    );
    frontFlange.position.set(0, shankMidY, flangeZOffset);
    frontFlange.userData.name = "Półka trzonu (profil H-Beam)";
    g.add(frontFlange);

    // Półka tylna (-Z):
    const rearFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, shankLen, flangeThickness),
      rodMat
    );
    rearFlange.position.set(0, shankMidY, -flangeZOffset);
    rearFlange.userData.name = "Półka trzonu (profil H-Beam)";
    g.add(rearFlange);

    // Żeberka wzmacniające przejścia w główkę i stopę
    const gussetBottom = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.015, 0.016),
      rodMat
    );
    gussetBottom.position.set(0, shankBottomY + 0.004, 0);
    g.add(gussetBottom);

    const gussetTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.014, 0.014),
      rodMat
    );
    gussetTop.position.set(0, shankTopY - 0.003, 0);
    g.add(gussetTop);

    // ═══ 6. GŁÓWKA KORBOWODU (Small End) ═══
    const smallEndPinR = 0.013;
    const smallEndOuterR = 0.021;
    const smallEndWidth = 0.026;

    const smallEndShape = new THREE.Shape();
    smallEndShape.absarc(0, length, smallEndOuterR, 0, Math.PI * 2, false);
    const smallEndHole = new THREE.Path();
    smallEndHole.absarc(0, length, smallEndPinR, 0, Math.PI * 2, true);
    smallEndShape.holes.push(smallEndHole);

    const smallEndGeo = new THREE.ExtrudeGeometry(smallEndShape, {
      depth: smallEndWidth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.0015,
      bevelThickness: 0.0015
    });
    smallEndGeo.translate(0, 0, -smallEndWidth / 2);
    const smallEndMesh = new THREE.Mesh(smallEndGeo, rodMat);
    smallEndMesh.userData.name = "Główka korbowodu";
    g.add(smallEndMesh);

    // Tulejka brązowa główki (Small End Bushing)
    const bushingGeo = new THREE.CylinderGeometry(smallEndPinR + 0.0003, smallEndPinR + 0.0003, smallEndWidth - 0.001, 20, 1, true);
    const bushingMesh = new THREE.Mesh(bushingGeo, bronzeMat);
    bushingMesh.rotation.x = Math.PI / 2;
    bushingMesh.position.set(0, length, 0);
    bushingMesh.userData.name = "Tulejka brązowa główki korbowodu";
    g.add(bushingMesh);

    g.userData.name = "Korbowód (profil H-Beam)";
    return g;
  }

export function createPiston(radius, length) {
    const g = new THREE.Group();
    // Korpus tłoka (denko i płaszcz) - sworzeń znajduje się w Y = 0
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), this.matPiston);
    piston.position.y = 0.035;
    piston.userData.name = "Tłok";
    g.add(piston);

    // Pierścienie tłokowe (2 kompresyjne + 1 zgarniający olejowy)
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.001, 0.002, 8, 32), this.matDarkSteel);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.035 + length / 2 - 0.015 - i * 0.012;
      ring.userData.name = (i < 2) ? `Pierścień uszczelniający #${i+1}` : "Pierścień zgarniający olejowy";
      g.add(ring);
    }

    // Sworzeń tłokowy (dokładnie w Y = 0, spasowany z główką korbowodu)
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, radius * 1.82, 20), this.matSteel);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0, 0, 0);
    pin.userData.name = "Sworzeń tłokowy";
    g.add(pin);

    // Pierścienie osadcze sworznia (Segera)
    [-radius * 0.91, radius * 0.91].forEach(sz => {
      const circlip = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0012, 6, 16), this.matDarkSteel);
      circlip.position.set(0, 0, sz);
      circlip.userData.name = "Pierścień osadczy sworznia (Seger)";
      g.add(circlip);
    });

    g.userData.name = "Tłok kompletny ze sworzniem";
    return g;
  }

export function createSparkPlug() {
    const g = new THREE.Group();
    const ceramic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 16), this.matCeramic);
    ceramic.position.y = 0.02;
    ceramic.userData.name = "Izolator świecy";
    g.add(ceramic);
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.015, 6), this.matDarkSteel);
    hex.position.y = 0.0075;
    hex.userData.name = "Świeca zapłonowa";
    g.add(hex);
    g.userData.name = "Świeca zapłonowa";
    return g;
  }

export function createValve(material, name) {
    const vg = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 12), material);
    stem.userData.name = "Trzonek zaworu " + name;
    vg.add(stem);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 24), material);
    disc.position.y = -0.08;
    disc.userData.name = "Grzybek zaworu " + name;
    vg.add(disc);
    const retainer = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 16), this.matDarkSteel);
    retainer.position.y = 0.065;
    retainer.userData.name = "Talerzyk oporowy";
    vg.add(retainer);
    const tappet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 24), this.matSteel);
    tappet.position.y = 0.08 + 0.0075; 
    tappet.userData.name = "Szklanka popychacza";
    vg.add(tappet);
    vg.userData.name = "Zawór " + name;
    return vg;
  }

export function createSpringMesh() {
    class CoilCurve extends THREE.Curve {
      getPoint(t) {
        const turns = 6;
        const r = 0.011;
        const h = 0.085;
        return new THREE.Vector3(r * Math.cos(t * Math.PI * 2 * turns), t * h, r * Math.sin(t * Math.PI * 2 * turns));
      }
    }
    const geo = new THREE.TubeGeometry(new CoilCurve(), 64, 0.0025, 8, false);
    const mesh = new THREE.Mesh(geo, this.matGold);
    mesh.userData.name = "Sprężyna zaworowa";
    return mesh;
  }

export function createRockerArm() {
    const ra = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.016), this.matGold);
    arm.userData.name = "Dźwigienka zaworowa (Rocker Arm)";
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.024, 16), this.matSteel);
    pivot.rotation.x = Math.PI / 2;
    pivot.userData.name = "Oś dźwigienki zaworowej";
    ra.add(arm, pivot);
    ra.userData.name = "Dźwigienka zaworowa kompletna";
    return ra;
  }

export function createCamLobe() {
    const shape = new THREE.Shape();
    const R_base = 0.025;
    const R_max = 0.045;
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      let r = R_base;
      let alpha = angle;
      if (alpha > Math.PI) alpha -= Math.PI * 2;
      if (Math.abs(alpha) < Math.PI / 4) {
        r = R_base + (R_max - R_base) * Math.pow(Math.cos(alpha * 2), 2);
      }
      const x = Math.sin(angle) * r;
      const y = Math.cos(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    geo.translate(0, 0, -0.01);
    const mesh = new THREE.Mesh(geo, this.matSteel);
    mesh.userData.name = "Krzywka rozrządu";
    return mesh;
  }

export function getCamRadius(angle) {
    const R_base = 0.025;
    const R_max = 0.045;
    let alpha = angle % (Math.PI * 2);
    if (alpha > Math.PI) alpha -= Math.PI * 2;
    if (alpha < -Math.PI) alpha += Math.PI * 2;
    if (Math.abs(alpha) < Math.PI / 4) {
      return R_base + (R_max - R_base) * Math.pow(Math.cos(alpha * 2), 2);
    }
    return R_base;
  }

