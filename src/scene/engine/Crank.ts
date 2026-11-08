import * as THREE from 'three';

export interface CrankSceneContext {
    matSteel?: THREE.Material;
    matDarkSteel?: THREE.Material;
    matBronze?: THREE.Material;
    matSilver?: THREE.Material;
    matPiston?: THREE.Material;
    matCeramic?: THREE.Material;
}

interface RodGeometries {
    upperBigEndGeo: THREE.BufferGeometry;
    capGeo: THREE.BufferGeometry;
    bearingGeo: THREE.BufferGeometry;
    boltStudGeo: THREE.BufferGeometry;
    boltHeadGeo: THREE.BufferGeometry;
    boltWasherGeo: THREE.BufferGeometry;
    flangeFrontGeo: THREE.BufferGeometry;
    flangeRearGeo: THREE.BufferGeometry;
    webGeo: THREE.BufferGeometry;
    gussetBottomGeo: THREE.BufferGeometry;
    gussetTopGeo: THREE.BufferGeometry;
    smallEndGeo: THREE.BufferGeometry;
    bushingGeo: THREE.BufferGeometry;
    smallEndOilHoleGeo: THREE.BufferGeometry;
    squirtHoleGeo: THREE.BufferGeometry;
    shankMidY: number;
    shankBottomY: number;
    shankTopY: number;
    flangeZ: number;
}

let cachedRodGeos: RodGeometries | null = null;
let lastRodLength = -1;

export function createConnectingRod(scene: CrankSceneContext, length: number): THREE.Group {
    const g = new THREE.Group();
    const rodMat = scene.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
    const darkMat = scene.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.3 });
    const bronzeMat = scene.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
    const silverMat = scene.matSilver || new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });

    if (!cachedRodGeos || Math.abs(lastRodLength - length) > 0.0001) {
        if (cachedRodGeos) {
            cachedRodGeos.upperBigEndGeo.dispose();
            cachedRodGeos.capGeo.dispose();
            cachedRodGeos.bearingGeo.dispose();
            cachedRodGeos.boltStudGeo.dispose();
            cachedRodGeos.boltHeadGeo.dispose();
            cachedRodGeos.boltWasherGeo.dispose();
            cachedRodGeos.flangeFrontGeo.dispose();
            cachedRodGeos.flangeRearGeo.dispose();
            cachedRodGeos.webGeo.dispose();
            cachedRodGeos.gussetBottomGeo.dispose();
            cachedRodGeos.gussetTopGeo.dispose();
            cachedRodGeos.smallEndGeo.dispose();
            cachedRodGeos.bushingGeo.dispose();
            cachedRodGeos.smallEndOilHoleGeo.dispose();
            cachedRodGeos.squirtHoleGeo.dispose();
        }

        const pinR = 0.026;
        const bigEndWidth = 0.034;

        // 1. GÓRNA CZĘŚĆ STOPY KORBOWODU (Upper Big End Body)
        const upperBigEndShape = new THREE.Shape();
        upperBigEndShape.moveTo(0.040, 0);
        upperBigEndShape.lineTo(0.040, 0.018);
        upperBigEndShape.quadraticCurveTo(0.036, 0.042, 0.020, 0.048);
        upperBigEndShape.lineTo(-0.020, 0.048);
        upperBigEndShape.quadraticCurveTo(-0.036, 0.042, -0.040, 0.018);
        upperBigEndShape.lineTo(-0.040, 0);
        const upperHole = new THREE.Path();
        upperHole.absarc(0, 0, pinR + 0.0018, Math.PI, 0, true);
        upperBigEndShape.holes.push(upperHole);

        const upperBigEndGeo = new THREE.ExtrudeGeometry(upperBigEndShape, {
          depth: bigEndWidth, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.002, bevelThickness: 0.002
        });
        upperBigEndGeo.translate(0, 0, -bigEndWidth / 2);

        // 2. POKRYWA STOPY KORBOWODU (Rod Cap) - kuta ze żłobionym żebrem usztywniającym
        const capShape = new THREE.Shape();
        capShape.moveTo(-0.040, -0.001);
        capShape.lineTo(-0.040, -0.020);
        capShape.quadraticCurveTo(-0.038, -0.044, 0, -0.047);
        capShape.quadraticCurveTo(0.038, -0.044, 0.040, -0.020);
        capShape.lineTo(0.040, -0.001);
        const capHole = new THREE.Path();
        capHole.absarc(0, 0, pinR + 0.0018, 0, Math.PI, true);
        capShape.holes.push(capHole);

        const capGeo = new THREE.ExtrudeGeometry(capShape, {
          depth: bigEndWidth, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.002, bevelThickness: 0.002
        });
        capGeo.translate(0, 0, -bigEndWidth / 2);

        // Panewka korbowodowa (dwuczęściowa panewka bimetaliczna z zamkiem)
        const bearingGeo = new THREE.CylinderGeometry(pinR + 0.0017, pinR + 0.0017, bigEndWidth - 0.004, 24, 1, true);
        
        // Śruby korbowodowe ARP (High Strength Rod Bolts)
        const boltStudGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.052, 12);
        const boltHeadGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.009, 12);
        const boltWasherGeo = new THREE.CylinderGeometry(0.0075, 0.0075, 0.002, 16);

        // 3. TRZON KORBOWODU O PROFILU H-BEAM Z PŁYNNYM STOŻKIEM (Tapered H-Beam Shank)
        const shankBottomY = 0.048;
        const shankTopY = length - 0.026;
        const shankLen = shankTopY - shankBottomY;
        const shankMidY = (shankBottomY + shankTopY) / 2;
        const flangeThick = 0.0075;
        const totalZ = 0.024;
        const flangeZ = (totalZ - flangeThick) / 2;

        const createTaperedBox = (wBottom: number, wTop: number, h: number, depth: number) => {
            const shape = new THREE.Shape();
            shape.moveTo(-wBottom / 2, -h / 2);
            shape.lineTo(wBottom / 2, -h / 2);
            shape.lineTo(wTop / 2, h / 2);
            shape.lineTo(-wTop / 2, h / 2);
            shape.closePath();
            const geom = new THREE.ExtrudeGeometry(shape, {
                depth: depth,
                bevelEnabled: true,
                bevelSegments: 1,
                bevelSize: 0.001,
                bevelThickness: 0.001
            });
            geom.translate(0, 0, -depth / 2);
            return geom;
        };

        const flangeFrontGeo = createTaperedBox(0.038, 0.026, shankLen, flangeThick);
        const flangeRearGeo = createTaperedBox(0.038, 0.026, shankLen, flangeThick);
        const webThick = 0.008;
        const webGeo = createTaperedBox(0.028, 0.018, shankLen, webThick);

        const gussetBottomGeo = createTaperedBox(0.046, 0.038, 0.018, totalZ);
        const gussetTopGeo = createTaperedBox(0.026, 0.032, 0.016, totalZ);

        // 4. GŁÓWKA KORBOWODU (Small End Eye)
        const smallEndPinR = 0.013;
        const smallEndOuterR = 0.022;
        const smallEndWidth = 0.025;

        const smallEndShape = new THREE.Shape();
        smallEndShape.absarc(0, length, smallEndOuterR, 0, Math.PI * 2, false);
        const smallEndHole = new THREE.Path();
        smallEndHole.absarc(0, length, smallEndPinR + 0.0015, 0, Math.PI * 2, true);
        smallEndShape.holes.push(smallEndHole);

        const smallEndGeo = new THREE.ExtrudeGeometry(smallEndShape, {
          depth: smallEndWidth, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.0015, bevelThickness: 0.0015
        });
        smallEndGeo.translate(0, 0, -smallEndWidth / 2);

        const bushingGeo = new THREE.CylinderGeometry(smallEndPinR + 0.0014, smallEndPinR + 0.0014, smallEndWidth - 0.001, 20, 1, true);
        const smallEndOilHoleGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.012, 12);
        const squirtHoleGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.016, 8);

        cachedRodGeos = {
            upperBigEndGeo, capGeo, bearingGeo, boltStudGeo, boltHeadGeo, boltWasherGeo,
            flangeFrontGeo, flangeRearGeo, webGeo, gussetBottomGeo, gussetTopGeo,
            smallEndGeo, bushingGeo, smallEndOilHoleGeo, squirtHoleGeo,
            shankMidY, shankBottomY, shankTopY, flangeZ
        };
        lastRodLength = length;
    }

    const cg = cachedRodGeos;

    // 1. Zespół stopy korbowodu
    const upperBigEndMesh = new THREE.Mesh(cg.upperBigEndGeo, rodMat);
    upperBigEndMesh.userData.name = "Stopa korbowodu (korpus odkuwki)";
    g.add(upperBigEndMesh);

    const capMesh = new THREE.Mesh(cg.capGeo, rodMat);
    capMesh.userData.name = "Pokrywa stopy korbowodu (Cap)";
    g.add(capMesh);

    const bearingMesh = new THREE.Mesh(cg.bearingGeo, silverMat);
    bearingMesh.rotation.x = Math.PI / 2;
    bearingMesh.userData.name = "Panewka korbowodowa (Bimetal)";
    g.add(bearingMesh);

    // Linia podziału stopy
    const splitLineMat = new THREE.LineBasicMaterial({ color: 0x111111 });
    const splitPts = [new THREE.Vector3(-0.040, 0, 0.018), new THREE.Vector3(0.040, 0, 0.018)];
    const splitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(splitPts), splitLineMat);
    splitLine.userData.name = "Płaszczyzna podziału stopy korbowodu";
    g.add(splitLine);

    // Śruby korbowodowe i podkładki
    [-0.031, 0.031].forEach(bx => {
      const boltStud = new THREE.Mesh(cg.boltStudGeo, darkMat);
      boltStud.position.set(bx, -0.004, 0);
      boltStud.userData.name = "Śruba korbowodowa wysokowytrzymała (ARP)";
      g.add(boltStud);

      const boltWasher = new THREE.Mesh(cg.boltWasherGeo, silverMat);
      boltWasher.position.set(bx, -0.024, 0);
      boltWasher.userData.name = "Podkładka śruby korbowodowej";
      g.add(boltWasher);

      const boltHead = new THREE.Mesh(cg.boltHeadGeo, darkMat);
      boltHead.position.set(bx, -0.029, 0);
      boltHead.userData.name = "Łeb śruby korbowodowej (12-kątny ARP)";
      g.add(boltHead);
    });

    // Otwór natrysku oleju ze stopy
    const squirtHole = new THREE.Mesh(cg.squirtHoleGeo, darkMat);
    squirtHole.position.set(0.018, 0.042, 0);
    squirtHole.rotation.z = -Math.PI / 6;
    squirtHole.userData.name = "Dysza natrysku oleju korbowodu";
    g.add(squirtHole);

    // 2. Trzon korbowodu (Tapered H-Beam)
    const frontFlange = new THREE.Mesh(cg.flangeFrontGeo, rodMat);
    frontFlange.position.set(0, cg.shankMidY, cg.flangeZ);
    frontFlange.userData.name = "Półka przednia trzonu H-Beam";
    g.add(frontFlange);

    const rearFlange = new THREE.Mesh(cg.flangeRearGeo, rodMat);
    rearFlange.position.set(0, cg.shankMidY, -cg.flangeZ);
    rearFlange.userData.name = "Półka tylna trzonu H-Beam";
    g.add(rearFlange);

    const webMesh = new THREE.Mesh(cg.webGeo, rodMat);
    webMesh.position.set(0, cg.shankMidY, 0);
    webMesh.userData.name = "Środnik trzonu korbowodu (Recessed Web)";
    g.add(webMesh);

    // Przejścia płynne
    const gussetBottom = new THREE.Mesh(cg.gussetBottomGeo, rodMat);
    gussetBottom.position.set(0, cg.shankBottomY + 0.008, 0);
    gussetBottom.userData.name = "Wzmocnienie przejścia stopy w trzon";
    g.add(gussetBottom);

    const gussetTop = new THREE.Mesh(cg.gussetTopGeo, rodMat);
    gussetTop.position.set(0, cg.shankTopY - 0.007, 0);
    gussetTop.userData.name = "Wzmocnienie przejścia trzonu w główkę";
    g.add(gussetTop);

    // 3. Główka korbowodu
    const smallEndMesh = new THREE.Mesh(cg.smallEndGeo, rodMat);
    smallEndMesh.userData.name = "Główka korbowodu (Small End)";
    g.add(smallEndMesh);

    const bushingMesh = new THREE.Mesh(cg.bushingGeo, bronzeMat);
    bushingMesh.rotation.x = Math.PI / 2;
    bushingMesh.position.set(0, length, 0);
    bushingMesh.userData.name = "Tulejka sworznia tłokowego (Brąz fosforowy)";
    g.add(bushingMesh);

    const oilFeedHole = new THREE.Mesh(cg.smallEndOilHoleGeo, darkMat);
    oilFeedHole.position.set(0, length + 0.020, 0);
    oilFeedHole.userData.name = "Kanał olejowy główki korbowodu";
    g.add(oilFeedHole);

    g.userData.name = "Korbowód wyczynowy H-Beam (Kuty)";
    return g;
}

interface PistonGeometries {
    pistonGeo: THREE.CylinderGeometry;
    ringGeo: THREE.TorusGeometry;
    pinGeo: THREE.CylinderGeometry;
    circlipGeo: THREE.TorusGeometry;
}

const cachedPistonGeos = new Map<string, PistonGeometries>();

export function createPiston(scene: CrankSceneContext, radius: number, length: number, slantAngle = 0): THREE.Group {
    const g = new THREE.Group();
    const cacheKey = `${radius.toFixed(4)}_${length.toFixed(4)}_${slantAngle.toFixed(4)}`;
    
    let cg = cachedPistonGeos.get(cacheKey);
    if (!cg) {
        const pistonGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
        
        // Kąt pochylenia denka tłoka dla silników VR/W
        if (Math.abs(slantAngle) > 0.001) {
            const posAttr = pistonGeo.attributes.position;
            const yThreshold = length / 2 - 0.001;
            for (let i = 0; i < posAttr.count; i++) {
                const y = posAttr.getY(i);
                if (y > yThreshold) {
                    const x = posAttr.getX(i);
                    const newY = y - x * Math.tan(slantAngle);
                    posAttr.setY(i, newY);
                }
            }
            pistonGeo.computeVertexNormals();
        }
        
        const ringGeo = new THREE.TorusGeometry(radius + 0.001, 0.002, 5, 24);
        const pinGeo = new THREE.CylinderGeometry(0.013, 0.013, radius * 1.82, 12);
        const circlipGeo = new THREE.TorusGeometry(0.0135, 0.0012, 4, 12);
        
        cg = { pistonGeo, ringGeo, pinGeo, circlipGeo };
        cachedPistonGeos.set(cacheKey, cg);
    }

    const pistonMat = scene.matPiston || new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const darkMat = scene.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.3 });
    const steelMat = scene.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });

    const piston = new THREE.Mesh(cg.pistonGeo, pistonMat);
    piston.position.y = length / 2 - 0.020;
    piston.userData.name = "Tłok";
    g.add(piston);

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(cg.ringGeo, darkMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = length - 0.030 - i * 0.012;
      ring.userData.name = (i < 2) ? `Pierścień uszczelniający #${i+1}` : "Pierścień zgarniający olejowy";
      g.add(ring);
    }

    const pin = new THREE.Mesh(cg.pinGeo, steelMat);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0, 0, 0);
    pin.userData.name = "Sworzeń tłokowy";
    g.add(pin);

    [-radius * 0.91, radius * 0.91].forEach(sz => {
      const circlip = new THREE.Mesh(cg.circlipGeo, darkMat);
      circlip.position.set(0, 0, sz);
      circlip.userData.name = "Pierścień osadczy sworznia (Seger)";
      g.add(circlip);
    });

    g.userData.name = "Tłok kompletny ze sworzniem";
    return g;
}

interface PlugGeometries {
    ceramic: THREE.CylinderGeometry;
    hex: THREE.CylinderGeometry;
}

let cachedPlugGeos: PlugGeometries | null = null;

export function createSparkPlug(scene: CrankSceneContext): THREE.Group {
    const g = new THREE.Group();
    if (!cachedPlugGeos) {
        cachedPlugGeos = {
            ceramic: new THREE.CylinderGeometry(0.008, 0.008, 0.04, 12),
            hex: new THREE.CylinderGeometry(0.01, 0.01, 0.015, 6)
        };
    }
    const ceramicMat = scene.matCeramic || new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    const darkMat = scene.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.3 });

    const ceramic = new THREE.Mesh(cachedPlugGeos.ceramic, ceramicMat);
    ceramic.position.y = 0.02;
    ceramic.userData.name = "Izolator świecy";
    g.add(ceramic);

    const hex = new THREE.Mesh(cachedPlugGeos.hex, darkMat);
    hex.position.y = 0.0075;
    hex.userData.name = "Świeca zapłonowa";
    g.add(hex);

    g.userData.name = "Świeca zapłonowa";
    return g;
}
