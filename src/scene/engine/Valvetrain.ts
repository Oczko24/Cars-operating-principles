import * as THREE from 'three';

let cachedStemGeo = null;
let cachedRetainerGeo = null;
const cachedDiscGeos = new Map();
const cachedTappetGeos = new Map();

export function createValve(scene, material, name, vDiscR) {
    const vg = new THREE.Group();
    if (!cachedStemGeo) cachedStemGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6);
    const stem = new THREE.Mesh(cachedStemGeo, material);
    stem.userData.name = "Trzonek zaworu " + name;
    vg.add(stem);
    
    let discGeo = cachedDiscGeos.get(vDiscR);
    if (!discGeo) {
        discGeo = new THREE.CylinderGeometry(vDiscR, vDiscR, 0.008, 16);
        cachedDiscGeos.set(vDiscR, discGeo);
    }
    const disc = new THREE.Mesh(discGeo, material);
    disc.position.y = -0.08;
    disc.userData.name = "Grzybek zaworu " + name;
    vg.add(disc);
    
    if (!cachedRetainerGeo) cachedRetainerGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.008, 12);
    const retainer = new THREE.Mesh(cachedRetainerGeo, scene.matDarkSteel);
    retainer.position.y = 0.065;
    retainer.userData.name = "Talerzyk oporowy";
    vg.add(retainer);
    
    const boreScale = (scene.config.boreMm || 84) / 84;
    const tappetR = ((scene.config.valves >= 5 || (scene.config.layout === 'VR' && scene.config.valves >= 4)) ? 0.012 : 0.018) * boreScale;
    
    const tappetKey = tappetR.toFixed(5) + '_' + boreScale.toFixed(5);
    let tappetGeo = cachedTappetGeos.get(tappetKey);
    if (!tappetGeo) {
        tappetGeo = new THREE.CylinderGeometry(tappetR, tappetR, 0.015 * boreScale, 16);
        cachedTappetGeos.set(tappetKey, tappetGeo);
    }
    const tappet = new THREE.Mesh(tappetGeo, scene.matSteel);
    tappet.position.y = 0.08 + 0.0075; 
    tappet.userData.name = "Szklanka popychacza";
    vg.add(tappet);
    
    vg.userData.name = "Zawór " + name;
    return vg;
}

let cachedSpringGeo = null;
let lastSpringR = -1;
let lastBoreScale = -1;

export function createSpringMesh(scene) {
    const boreScale = (scene.config.boreMm || 84) / 84;
    const springR = ((scene.config.valves >= 5 || (scene.config.layout === 'VR' && scene.config.valves >= 4)) ? 0.008 : 0.011) * boreScale;
    
    if (!cachedSpringGeo || Math.abs(lastSpringR - springR) > 0.0001 || Math.abs(lastBoreScale - boreScale) > 0.0001) {
        class CoilCurve extends (THREE.Curve as any) {
            getPoint(t) {
                const turns = 6;
                const h = 0.085;
                return new THREE.Vector3(springR * Math.cos(t * Math.PI * 2 * turns), t * h, springR * Math.sin(t * Math.PI * 2 * turns));
            }
        }
        // Zmniejszono z 64,8 na 32,5 dla ogromnego przyrostu FPS (zwłaszcza przy 5 zaworach i np. 16 cylindrach = 80 sprężyn)
        cachedSpringGeo = new THREE.TubeGeometry(new CoilCurve() as any, 32, 0.0025 * boreScale, 5, false);
        lastSpringR = springR;
        lastBoreScale = boreScale;
    }
    
    const mesh = new THREE.Mesh(cachedSpringGeo, scene.matGold);
    mesh.userData.name = "Sprężyna zaworowa";
    return mesh;
}

let cachedArmGeo = null;
let cachedPivotGeo = null;

export function createRockerArm(scene) {
    const ra = new THREE.Group();
    if (!cachedArmGeo) cachedArmGeo = new THREE.BoxGeometry(0.12, 0.012, 0.016);
    const arm = new THREE.Mesh(cachedArmGeo, scene.matGold);
    arm.userData.name = "Dźwigienka zaworowa (Rocker Arm)";
    
    if (!cachedPivotGeo) cachedPivotGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.024, 12);
    const pivot = new THREE.Mesh(cachedPivotGeo, scene.matSteel);
    pivot.rotation.x = Math.PI / 2;
    pivot.userData.name = "Oś dźwigienki zaworowej";
    
    ra.add(arm, pivot);
    ra.userData.name = "Dźwigienka zaworowa kompletna";
    return ra;
}

let cachedCamLobeGeo = null;

export function createCamLobe(scene) {
    if (!cachedCamLobeGeo) {
        const shape = new THREE.Shape();
        const R_base = 0.025;
        const R_max = 0.045;
        const segments = 24; // zmniejszono z 40
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
        cachedCamLobeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
        cachedCamLobeGeo.translate(0, 0, -0.01);
    }
    const mesh = new THREE.Mesh(cachedCamLobeGeo, scene.matSteel);
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
