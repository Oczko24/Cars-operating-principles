import * as THREE from 'three';

export class Alternator {
  build(scene: any, layoutProps: any): THREE.Object3D {
    const altG = new THREE.Group();
    
    const altBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.1, 20), scene.matSilver
    );
    // Orientacja bazy cylindra
    altBody.rotation.x = Math.PI / 2;
    altBody.userData.name = "Alternator";
    altG.add(altBody);

    const altPulleyR = 0.033;
    const altPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(altPulleyR, altPulleyR, 0.018, 24), scene.matDarkSteel
    );
    altPulley.rotation.x = Math.PI / 2;
    const altPulleyGroup = new THREE.Group();
    altPulleyGroup.position.z = 0.058; // Relatywnie do alternatora
    altPulley.userData.name = "Koło pasowe alternatora";
    altPulleyGroup.add(altPulley);
    altG.add(altPulleyGroup);

    // Zapamiętanie właściwości pulleya dla paska
    altG.userData.pulleyRadius = altPulleyR;
    altG.userData.pulleyZ = 0.058;
    altG.userData.pulleyGroup = altPulleyGroup;

    return altG;
  }
}

export class WaterPump {
  build(scene: any, layoutProps: any): THREE.Object3D {
    const wpPulleyR = 0.045;
    const wpPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(wpPulleyR, wpPulleyR, 0.02, 24), scene.matDarkSteel
    );
    // Base geometry orientation is handled by the modeler, but we do standard adjustments here
    // wpPulley.rotation.x = Math.PI / 2;  // This is handled by SceneAssembler global rotation usually, 
    // but we can keep it here if it's intrinsic to the part definition
    wpPulley.rotation.x = Math.PI / 2;
    wpPulley.userData.name = "Koło pasowe pompy wody";
    wpPulley.userData.pulleyRadius = wpPulleyR;
    return wpPulley;
  }
}

export class CrankPulley {
  build(scene: any, layoutProps: any): THREE.Object3D {
    const crankPulleyR = 0.085;
    const crankPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(crankPulleyR, crankPulleyR, 0.02, 32), scene.matDarkSteel
    );
    crankPulley.rotation.x = Math.PI / 2;
    crankPulley.userData.name = "Koło pasowe wału korbowego";
    crankPulley.userData.pulleyRadius = crankPulleyR;
    return crankPulley;
  }
}

export class SerpentineBelt {
  build(scene: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>): THREE.Object3D {
    // This is a special module that needs to know positions of other modules
    
    // Default fallback values if references are missing
    let altPosX = 0.28, altPosY = 0.18, altPulleyR = 0.033;
    let wpPosX = 0.0, wpPosY = 0.14, wpPulleyR = 0.045;
    let crankPulleyR = 0.085;

    if (layoutProps.connections) {
       // We can dynamically resolve positions
       // This will be simpler: rely on the specific layout we have
       const alt = builtModules.get('alternator_1');
       if (alt) {
           altPosX = alt.position.x;
           altPosY = alt.position.y;
       }
       const wp = builtModules.get('water_pump_1');
       if (wp) {
           wpPosX = wp.position.x;
           wpPosY = wp.position.y;
       }
       // ... we could read radius from userData
    }

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
      new THREE.TubeGeometry(beltCurve, 80, 0.007, 6, true), scene.matRubber
    );
    altBelt.userData.name = "Pasek klinowy (Serpentine)";
    
    return altBelt;
  }
}
