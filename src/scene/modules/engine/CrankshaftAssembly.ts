import * as THREE from 'three';
export class CrankshaftAssembly {
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
const crankMaster = new THREE.Group();
    // ═══ SEGMENTOWE CZOPY GŁÓWNE I WYKORBIENIA WAŁU KORBOWEGO ═══
    const pinWidth = 0.052; // nieco krótszy sworzeń by zrobić miejsce na grubsze ramiona
    const webThick = 0.028; // znacznie grubsze ramię wykorbienia (masywniejszy wał)
    const throwHalfWidth = pinWidth / 2 + webThick; // ~0.054

    // Profil ramienia wykorbienia i aerodynamicznego przeciwciężaru (THREE.Shape)
    // Zwiększone promienie i szerokości, by wyglądał na ciężki, odkuty wał
    const webShape = new THREE.Shape();
    webShape.moveTo(-0.042 * strokeScale, crankRadius);
    webShape.absarc(0, crankRadius, 0.042 * strokeScale, Math.PI, 0, false); // grubszy materiał nad czopem
    webShape.lineTo(0.055 * strokeScale, 0.02 * strokeScale);                              // ramię ku osi głównej (masywniejsze)
    webShape.lineTo(0.120 * strokeScale, -0.05 * strokeScale);                             // szersze rozszerzenie w przeciwciężar
    webShape.quadraticCurveTo(0.125 * strokeScale, -0.190 * strokeScale, 0, -0.200 * strokeScale);       // głębszy dolny łuk przeciwciężaru (większa masa)
    webShape.quadraticCurveTo(-0.125 * strokeScale, -0.190 * strokeScale, -0.120 * strokeScale, -0.05 * strokeScale);
    webShape.lineTo(-0.055 * strokeScale, 0.02 * strokeScale);
    webShape.lineTo(-0.042 * strokeScale, crankRadius);

    const webGeo = new THREE.ExtrudeGeometry(webShape, {
      depth: webThick,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.0035, // wyraźniejsze fazowanie krawędzi (charakterystyczne dla odlewów/odkuwek)
      bevelThickness: 0.0035
    });
    webGeo.translate(0, 0, -webThick / 2);

    // ═══ KOŁO ZĘBATE WAŁU (Timing Gear) ═══
    const crankGear = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 32), scene.matDarkSteel);
    crankGear.rotation.x = Math.PI / 2;
    crankGear.position.z = maxZ + 0.05;
    crankGear.userData.name = "Koło zębate wału";
    crankMaster.add(crankGear);

    // ═══ EXPLODE DISTANCE (musi być przed komponentami które go używają) ═══


    // ═══ Tablice do zbierania pozycji cylindrów (dla uniwersalnych kolektorów) ═══
    scene.cylinderPositions = [];

    // Generowanie wykorbień (throws) dla każdego cylindra
    cylinderConfigs.forEach(cfg => {
      const throwG = new THREE.Group();
      throwG.position.z = cfg.z;
      throwG.rotation.z = cfg.crankPinAngle;

      // Czop korbowodowy (Crankpin journal) - w odległości crankRadius
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, pinWidth, 24), scene.matSteel);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0, crankRadius, 0); 
      pin.userData.name = "Czop korbowodowy";
      throwG.add(pin);

      // Kanał olejowy w czopie
      const oilHole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), scene.matDarkSteel);
      oilHole.position.set(0, crankRadius + 0.025, 0);
      oilHole.userData.name = "Kanał olejowy czopa korbowodowego";
      throwG.add(oilHole);

      // Ramiona wykorbienia (Webs) i przeciwciężary (Counterweights) z przodu i z tyłu czopa
      [-1, 1].forEach(dir => {
        const webZOff = dir * (pinWidth / 2 + webThick / 2);
        const web = new THREE.Mesh(webGeo, scene.matDarkSteel);
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
        const midJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, jLen, 24), scene.matSteel);
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
      const frontJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, frontEnd - frontStart, 24), scene.matSteel);
      frontJ.rotation.x = Math.PI / 2;
      frontJ.position.set(0, 0, (frontStart + frontEnd) / 2);
      frontJ.userData.name = "Czop główny przedni wału";
      crankMaster.add(frontJ);
    }

    // 3. Czop główny tylny (od ostatniego wykorbienia do koła zamachowego)
    const rearStart = minZ - 0.01;
    const rearEnd = minCylZ - throwHalfWidth;
    if (rearEnd > rearStart) {
      const rearJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, rearEnd - rearStart, 24), scene.matSteel);
      rearJ.rotation.x = Math.PI / 2;
      rearJ.position.set(0, 0, (rearStart + rearEnd) / 2);
      rearJ.userData.name = "Czop główny tylny wału";
      crankMaster.add(rearJ);
    }

    // Kołnierz montażowy koła zamachowego (Flywheel Flange)
    const flywheelFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 32), scene.matDarkSteel);
    flywheelFlange.rotation.x = Math.PI / 2;
    flywheelFlange.position.set(0, 0, rearStart);
    flywheelFlange.userData.name = "Kołnierz koła zamachowego";
    crankMaster.add(flywheelFlange);

    engineGroup.add(crankMaster);
    scene.crankMaster = crankMaster;

    
    return null; // crankMaster added inside
  }
}
