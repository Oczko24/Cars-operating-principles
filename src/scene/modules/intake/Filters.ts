import * as THREE from 'three';

export class SportFilter {
  build(scene: any, layoutProps: any): THREE.Object3D {
    const intakeFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.040, 0.125, 0.24, 24), scene.matIntake
    );
    intakeFilter.userData.name = "Filtr powietrza stożkowy (Sportowy)";
    
    // We can also add a basic shield if requested, or keep it raw.
    // For a sandbox, the user can place a separate Shield module! 
    return intakeFilter;
  }
}

export class CivilAirbox {
  build(scene: any, layoutProps: any): THREE.Object3D {
    const boxW = 0.22, boxH = 0.16, boxD = 0.22;
    const intakeFilter = new THREE.Mesh(
      new THREE.BoxGeometry(boxW, boxH, boxD), scene.matDarkSteel
    );
    intakeFilter.userData.name = "Puszka filtra powietrza (Cywilny Airbox)";
    return intakeFilter;
  }
}
