import * as THREE from 'three';

let cachedRodGeos = null;
let lastRodLength = -1;

export function createConnectingRod(scene, length) {
    const g = new THREE.Group();
    const rodMat = scene.matSteel;
    const darkMat = scene.matDarkSteel;
    const bronzeMat = scene.matBronze;

    if (!cachedRodGeos || Math.abs(lastRodLength - length) > 0.0001) {
        const pinR = 0.026;
        const bigEndWidth = 0.032;

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
          depth: bigEndWidth, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.0015, bevelThickness: 0.0015
        });
        upperBigEndGeo.translate(0, 0, -bigEndWidth / 2);

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
          depth: bigEndWidth, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.0015, bevelThickness: 0.0015
        });
        capGeo.translate(0, 0, -bigEndWidth / 2);

        const bearingGeo = new THREE.CylinderGeometry(pinR + 0.0004, pinR + 0.0004, bigEndWidth - 0.002, 16, 1, true);
        const boltStudGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.048, 8);
        const boltHeadGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 6);

        const shankBottomY = 0.046;
        const shankTopY = length - 0.025;
        const shankLen = shankTopY - shankBottomY;
        const shankMidY = (shankBottomY + shankTopY) / 2;
        const flangeThickness = 0.009;

        const webGeo = new THREE.BoxGeometry(0.038, shankLen, 0.012);
        const flangeGeo = new THREE.BoxGeometry(0.048, shankLen, flangeThickness);
        const gussetBottomGeo = new THREE.BoxGeometry(0.054, 0.020, 0.028);
        const gussetTopGeo = new THREE.BoxGeometry(0.042, 0.018, 0.028);

        const smallEndPinR = 0.013;
        const smallEndOuterR = 0.021;
        const smallEndWidth = 0.026;

        const smallEndShape = new THREE.Shape();
        smallEndShape.absarc(0, length, smallEndOuterR, 0, Math.PI * 2, false);
        const smallEndHole = new THREE.Path();
        smallEndHole.absarc(0, length, smallEndPinR, 0, Math.PI * 2, true);
        smallEndShape.holes.push(smallEndHole);

        const smallEndGeo = new THREE.ExtrudeGeometry(smallEndShape, {
          depth: smallEndWidth, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.0015, bevelThickness: 0.0015
        });
        smallEndGeo.translate(0, 0, -smallEndWidth / 2);

        const bushingGeo = new THREE.CylinderGeometry(smallEndPinR + 0.0003, smallEndPinR + 0.0003, smallEndWidth - 0.001, 16, 1, true);

        cachedRodGeos = {
            upperBigEndGeo, capGeo, bearingGeo, boltStudGeo, boltHeadGeo,
            webGeo, flangeGeo, gussetBottomGeo, gussetTopGeo,
            smallEndGeo, bushingGeo, shankMidY, shankBottomY, shankTopY
        };
        lastRodLength = length;
    }

    const cg = cachedRodGeos;

    const upperBigEndMesh = new THREE.Mesh(cg.upperBigEndGeo, rodMat);
    upperBigEndMesh.userData.name = "Stopa korbowodu (korpus)";
    g.add(upperBigEndMesh);

    const capMesh = new THREE.Mesh(cg.capGeo, rodMat);
    capMesh.userData.name = "Pokrywa stopy korbowodu";
    g.add(capMesh);

    const bearingMesh = new THREE.Mesh(cg.bearingGeo, bronzeMat);
    bearingMesh.rotation.x = Math.PI / 2;
    bearingMesh.userData.name = "Panewka korbowodowa";
    g.add(bearingMesh);

    [-0.031, 0.031].forEach(bx => {
      const boltStud = new THREE.Mesh(cg.boltStudGeo, darkMat);
      boltStud.position.set(bx, -0.006, 0);
      boltStud.userData.name = "Śruba korbowodowa";
      g.add(boltStud);

      const boltHead = new THREE.Mesh(cg.boltHeadGeo, darkMat);
      boltHead.position.set(bx, -0.026, 0);
      boltHead.userData.name = "Łeb śruby korbowodowej (12-kątny)";
      g.add(boltHead);
    });

    const flangeZOffset = 0.010;
    const webMesh = new THREE.Mesh(cg.webGeo, rodMat);
    webMesh.position.set(0, cg.shankMidY, 0);
    webMesh.userData.name = "Trzon korbowodu (profil)";
    g.add(webMesh);

    const frontFlange = new THREE.Mesh(cg.flangeGeo, rodMat);
    frontFlange.position.set(0, cg.shankMidY, flangeZOffset);
    frontFlange.userData.name = "Półka trzonu (profil)";
    g.add(frontFlange);

    const rearFlange = new THREE.Mesh(cg.flangeGeo, rodMat);
    rearFlange.position.set(0, cg.shankMidY, -flangeZOffset);
    rearFlange.userData.name = "Półka trzonu (profil)";
    g.add(rearFlange);

    const gussetBottom = new THREE.Mesh(cg.gussetBottomGeo, rodMat);
    gussetBottom.position.set(0, cg.shankBottomY + 0.005, 0);
    g.add(gussetBottom);

    const gussetTop = new THREE.Mesh(cg.gussetTopGeo, rodMat);
    gussetTop.position.set(0, cg.shankTopY - 0.005, 0);
    g.add(gussetTop);

    const smallEndMesh = new THREE.Mesh(cg.smallEndGeo, rodMat);
    smallEndMesh.userData.name = "Główka korbowodu";
    g.add(smallEndMesh);

    const bushingMesh = new THREE.Mesh(cg.bushingGeo, bronzeMat);
    bushingMesh.rotation.x = Math.PI / 2;
    bushingMesh.position.set(0, length, 0);
    bushingMesh.userData.name = "Tulejka brązowa główki korbowodu";
    g.add(bushingMesh);

    g.userData.name = "Korbowód (profil H-Beam)";
    return g;
}

let cachedPistonGeos = null;
let lastPistonRadius = -1;
let lastPistonLength = -1;

export function createPiston(scene, radius, length) {
    const g = new THREE.Group();
    
    if (!cachedPistonGeos || Math.abs(lastPistonRadius - radius) > 0.0001 || Math.abs(lastPistonLength - length) > 0.0001) {
        const pistonGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
        const ringGeo = new THREE.TorusGeometry(radius + 0.001, 0.002, 5, 24);
        const pinGeo = new THREE.CylinderGeometry(0.013, 0.013, radius * 1.82, 12);
        const circlipGeo = new THREE.TorusGeometry(0.0135, 0.0012, 4, 12);
        
        cachedPistonGeos = { pistonGeo, ringGeo, pinGeo, circlipGeo };
        lastPistonRadius = radius;
        lastPistonLength = length;
    }
    
    const cg = cachedPistonGeos;

    const piston = new THREE.Mesh(cg.pistonGeo, scene.matPiston);
    piston.position.y = length / 2 - 0.020;
    piston.userData.name = "Tłok";
    g.add(piston);

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(cg.ringGeo, scene.matDarkSteel);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = length - 0.030 - i * 0.012;
      ring.userData.name = (i < 2) ? `Pierścień uszczelniający #${i+1}` : "Pierścień zgarniający olejowy";
      g.add(ring);
    }

    const pin = new THREE.Mesh(cg.pinGeo, scene.matSteel);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0, 0, 0);
    pin.userData.name = "Sworzeń tłokowy";
    g.add(pin);

    [-radius * 0.91, radius * 0.91].forEach(sz => {
      const circlip = new THREE.Mesh(cg.circlipGeo, scene.matDarkSteel);
      circlip.position.set(0, 0, sz);
      circlip.userData.name = "Pierścień osadczy sworznia (Seger)";
      g.add(circlip);
    });

    g.userData.name = "Tłok kompletny ze sworzniem";
    return g;
}

let cachedPlugGeos = null;

export function createSparkPlug(scene) {
    const g = new THREE.Group();
    if (!cachedPlugGeos) {
        cachedPlugGeos = {
            ceramic: new THREE.CylinderGeometry(0.008, 0.008, 0.04, 12),
            hex: new THREE.CylinderGeometry(0.01, 0.01, 0.015, 6)
        };
    }
    const ceramic = new THREE.Mesh(cachedPlugGeos.ceramic, scene.matCeramic);
    ceramic.position.y = 0.02;
    ceramic.userData.name = "Izolator świecy";
    g.add(ceramic);
    const hex = new THREE.Mesh(cachedPlugGeos.hex, scene.matDarkSteel);
    hex.position.y = 0.0075;
    hex.userData.name = "Świeca zapłonowa";
    g.add(hex);
    g.userData.name = "Świeca zapłonowa";
    return g;
}
