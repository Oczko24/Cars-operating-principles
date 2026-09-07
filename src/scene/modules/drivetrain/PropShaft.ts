import * as THREE from 'three';
import { VehicleDimensions } from '../../VehicleConfig.js';

export class PropShaft {
    public group: THREE.Group;
    private shaft: THREE.Mesh;
    private currentAngle = 0;

    constructor(sceneContext: any, startZ: number, endZ: number, startY: number, endY: number) {
        this.group = new THREE.Group();
        this.group.userData.name = "Propeller Shaft";

        const matSteel = sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        const dx = 0;
        const dy = endY - startY;
        const dz = endZ - startZ;
        const length = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        // Main tube
        const geom = new THREE.CylinderGeometry(0.025, 0.025, length, 16);
        geom.rotateX(Math.PI / 2); // align with Z initially
        
        this.shaft = new THREE.Mesh(geom, matSteel);
        
        // Position at midpoint
        this.shaft.position.set(0, startY + dy/2, startZ + dz/2);
        
        // Rotate to look at end
        this.shaft.lookAt(0, endY, endZ);
        
        this.group.add(this.shaft);

        // Simple representation of Cardan U-joints
        const uJointGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 16).rotateX(Math.PI/2);
        
        const frontJoint = new THREE.Mesh(uJointGeom, matDark);
        frontJoint.position.set(0, startY, startZ);
        frontJoint.lookAt(0, endY, endZ);
        this.group.add(frontJoint);
        
        const rearJoint = new THREE.Mesh(uJointGeom, matDark);
        rearJoint.position.set(0, endY, endZ);
        rearJoint.lookAt(0, endY, endZ);
        this.group.add(rearJoint);
    }

    public updateKinematics(dt: number, speed: number) {
        this.currentAngle += speed * dt;
        // Shaft rotates along its local Z axis
        this.shaft.rotation.z = this.currentAngle;
    }
}

