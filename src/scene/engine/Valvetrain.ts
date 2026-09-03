import * as THREE from 'three';

export function createValve(scene, material, name, vDiscR) {
    const vg = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 12), material);
    stem.userData.name = "Trzonek zaworu " + name;
    vg.add(stem);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(vDiscR, vDiscR, 0.008, 24), material);
    disc.position.y = -0.08;
    disc.userData.name = "Grzybek zaworu " + name;
    vg.add(disc);
    const retainer = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 16), scene.matDarkSteel);
    retainer.position.y = 0.065;
    retainer.userData.name = "Talerzyk oporowy";
    vg.add(retainer);
    const tappet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 24), scene.matSteel);
    tappet.position.y = 0.08 + 0.0075; 
    tappet.userData.name = "Szklanka popychacza";
    vg.add(tappet);
    vg.userData.name = "Zawór " + name;
    return vg;
  }

export function createSpringMesh(scene) {
    class CoilCurve extends (THREE.Curve as any) {
  [key: string]: any;

      getPoint(t) {
        const turns = 6;
        const r = 0.011;
        const h = 0.085;
        return new THREE.Vector3(r * Math.cos(t * Math.PI * 2 * turns), t * h, r * Math.sin(t * Math.PI * 2 * turns));
      }
    }
    const geo = new THREE.TubeGeometry(new CoilCurve() as any, 64, 0.0025, 8, false);
    const mesh = new THREE.Mesh(geo, scene.matGold);
    mesh.userData.name = "Sprężyna zaworowa";
    return mesh;
  }

export function createRockerArm(scene) {
    const ra = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.016), scene.matGold);
    arm.userData.name = "Dźwigienka zaworowa (Rocker Arm)";
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.024, 16), scene.matSteel);
    pivot.rotation.x = Math.PI / 2;
    pivot.userData.name = "Oś dźwigienki zaworowej";
    ra.add(arm, pivot);
    ra.userData.name = "Dźwigienka zaworowa kompletna";
    return ra;
  }

export function createCamLobe(scene) {
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
    const mesh = new THREE.Mesh(geo, scene.matSteel);
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
