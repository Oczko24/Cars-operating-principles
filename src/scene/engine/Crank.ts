import * as THREE from 'three';

export function createConnectingRod(scene, length) {
    const g = new THREE.Group();
    const rodMat = scene.matSteel;
    const darkMat = scene.matDarkSteel;
    const bronzeMat = scene.matBronze;

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

    // ═══ 5. TRZON KORBOWODU (H-Beam / I-Beam Shank) ═══
    const shankBottomY = 0.046;
    const shankTopY = length - 0.025;
    const shankLen = shankTopY - shankBottomY;
    const shankMidY = (shankBottomY + shankTopY) / 2;
    const flangeThickness = 0.009;
    const flangeZOffset = 0.010;

    // Środnik trzonu (Web):
    const webMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, shankLen, 0.012), // znacznie poszerzony w osi X i pogrubiony w Z
      rodMat
    );
    webMesh.position.set(0, shankMidY, 0);
    webMesh.userData.name = "Trzon korbowodu (profil)";
    g.add(webMesh);

    // Półka przednia (+Z):
    const frontFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, shankLen, flangeThickness), // bardzo szeroki
      rodMat
    );
    frontFlange.position.set(0, shankMidY, flangeZOffset);
    frontFlange.userData.name = "Półka trzonu (profil)";
    g.add(frontFlange);

    // Półka tylna (-Z):
    const rearFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, shankLen, flangeThickness), // bardzo szeroki
      rodMat
    );
    rearFlange.position.set(0, shankMidY, -flangeZOffset);
    rearFlange.userData.name = "Półka trzonu (profil)";
    g.add(rearFlange);

    // Żeberka wzmacniające przejścia w główkę i stopę
    const gussetBottom = new THREE.Mesh(
      new THREE.BoxGeometry(0.054, 0.020, 0.028),
      rodMat
    );
    gussetBottom.position.set(0, shankBottomY + 0.005, 0);
    g.add(gussetBottom);

    const gussetTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.018, 0.028),
      rodMat
    );
    gussetTop.position.set(0, shankTopY - 0.005, 0);
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

export function createPiston(scene, radius, length) {
    const g = new THREE.Group();
    // Korpus tłoka (denko i płaszcz) - sworzeń znajduje się w Y = 0
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), scene.matPiston);
    piston.position.y = length / 2 - 0.020;
    piston.userData.name = "Tłok";
    g.add(piston);

    // Pierścienie tłokowe (2 kompresyjne + 1 zgarniający olejowy)
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.001, 0.002, 8, 32), scene.matDarkSteel);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = length - 0.030 - i * 0.012;
      ring.userData.name = (i < 2) ? `Pierścień uszczelniający #${i+1}` : "Pierścień zgarniający olejowy";
      g.add(ring);
    }

    // Sworzeń tłokowy (dokładnie w Y = 0, spasowany z główką korbowodu)
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, radius * 1.82, 20), scene.matSteel);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0, 0, 0);
    pin.userData.name = "Sworzeń tłokowy";
    g.add(pin);

    // Pierścienie osadcze sworznia (Segera)
    [-radius * 0.91, radius * 0.91].forEach(sz => {
      const circlip = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0012, 6, 16), scene.matDarkSteel);
      circlip.position.set(0, 0, sz);
      circlip.userData.name = "Pierścień osadczy sworznia (Seger)";
      g.add(circlip);
    });

    g.userData.name = "Tłok kompletny ze sworzniem";
    return g;
  }

export function createSparkPlug(scene) {
    const g = new THREE.Group();
    const ceramic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 16), scene.matCeramic);
    ceramic.position.y = 0.02;
    ceramic.userData.name = "Izolator świecy";
    g.add(ceramic);
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.015, 6), scene.matDarkSteel);
    hex.position.y = 0.0075;
    hex.userData.name = "Świeca zapłonowa";
    g.add(hex);
    g.userData.name = "Świeca zapłonowa";
    return g;
  }
