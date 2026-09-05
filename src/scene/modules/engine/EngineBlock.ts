import * as THREE from 'three';

export class EngineBlock {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group): THREE.Object3D | null {
    const layout = sceneContext.config.layout;
    const { crankRadius, engineLength, maxZ, minZ, sleeveCenter, sleeveRadius } = datum;
    const vAngle = (sceneContext.config.vAngle || 0) * Math.PI / 180;
    
    let blockWidth = Math.max(0.56, 2 * sleeveRadius + 0.36);
    if (layout === 'V' || layout === 'W') {
      blockWidth = Math.max(0.68, (sleeveCenter + sleeveRadius) * 2 * Math.sin(vAngle / 2) + 0.25);
    } else if (layout === 'Boxer') {
      blockWidth = Math.max(1.10, (sleeveCenter + sleeveRadius) * 2 + 0.20);
    }

    const crankcaseHeight = Math.max(0.20, crankRadius * 1.3 + 0.04);
    const crankcase = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(blockWidth, crankcaseHeight, engineLength + 0.12)), 
      sceneContext.crankcaseLineMat
    );
    crankcase.position.set(0, -crankcaseHeight / 2, (maxZ+minZ)/2);
    crankcase.userData.name = "Miska olejowa (Zarys)";
    
    return crankcase; // will be added to engineGroup by SceneAssembler
  }
}
