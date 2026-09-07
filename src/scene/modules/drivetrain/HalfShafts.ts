import * as THREE from 'three';
import { VehicleDimensions } from '../../VehicleConfig.js';

export class HalfShafts {
    public group: THREE.Group;
    private leftShaft: THREE.Mesh;
    private rightShaft: THREE.Mesh;
    private leftBoots: THREE.Group;
    private rightBoots: THREE.Group;
    private currentAngle = 0;
    private isTransverse = false;
    private sceneContext: any;

    constructor(sceneContext: any, isFront: boolean, isTransverse: boolean = false) {
        this.isTransverse = isTransverse;
        this.sceneContext = sceneContext;
        this.group = new THREE.Group();
        this.group.userData.name = `Half Shafts ${isFront ? 'Front' : 'Rear'}`;
        
        const zPos = isFront ? VehicleDimensions.wheelbaseFrontZ : VehicleDimensions.wheelbaseRearZ;
        this.group.position.set(0, VehicleDimensions.diffY, zPos);

        const matSteel = sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matRubber = sceneContext.matRubber || new THREE.MeshStandardMaterial({ color: 0x111111 });


        // If transverse front, diff is offset to the left (X = -0.3)
        const diffOffsetX = (isFront && isTransverse) ? 0.25 : 0;
        // If longitudinal front, diff is further back (Z = 1.00). Wheels are at Z = 1.35.
        // So the diff has a Z offset relative to the wheels.
        const diffOffsetZ = (isFront && !isTransverse) ? -0.35 : 0;

        const leftWheelX = VehicleDimensions.trackWidthHalf;
        const rightWheelX = -VehicleDimensions.trackWidthHalf;
        
        const innerJointOffset = 0.05; // radius of diff roughly

        const leftStartX = diffOffsetX + innerJointOffset;
        const leftEndX = leftWheelX - 0.1;
        const leftLenX = Math.abs(leftEndX - leftStartX);
        
        const rightStartX = diffOffsetX - innerJointOffset;
        const rightEndX = rightWheelX + 0.1;
        const rightLenX = Math.abs(rightEndX - rightStartX);

        // Actual length including Z sweep
        const leftLen = Math.sqrt(leftLenX * leftLenX + diffOffsetZ * diffOffsetZ);
        const rightLen = Math.sqrt(rightLenX * rightLenX + diffOffsetZ * diffOffsetZ);
        
        const leftSweepAngle = Math.atan2(diffOffsetZ, leftLenX);
        const rightSweepAngle = Math.atan2(-diffOffsetZ, rightLenX);

        const leftGeom = new THREE.CylinderGeometry(0.015, 0.015, leftLen, 16).rotateZ(Math.PI/2);
        this.leftShaft = new THREE.Mesh(leftGeom, matSteel);
        this.leftShaft.position.set((leftStartX + leftEndX) / 2, 0, diffOffsetZ / 2);
        this.leftShaft.rotation.y = leftSweepAngle;
        this.group.add(this.leftShaft);

        const rightGeom = new THREE.CylinderGeometry(0.015, 0.015, rightLen, 16).rotateZ(Math.PI/2);
        this.rightShaft = new THREE.Mesh(rightGeom, matSteel);
        this.rightShaft.position.set((rightStartX + rightEndX) / 2, 0, diffOffsetZ / 2);
        this.rightShaft.rotation.y = rightSweepAngle;
        this.group.add(this.rightShaft);

        // CV Boots
        const bootGeom = this.createBootGeometry();
        this.leftBoots = new THREE.Group();
        
        const innerBootL = new THREE.Mesh(bootGeom, matRubber);
        innerBootL.position.set(leftStartX, 0, diffOffsetZ);
        innerBootL.rotation.set(0, leftSweepAngle, Math.PI/2);
        this.leftBoots.add(innerBootL);
        
        const outerBootL = new THREE.Mesh(bootGeom, matRubber);
        outerBootL.position.set(leftEndX, 0, 0);
        outerBootL.rotation.set(0, leftSweepAngle, Math.PI/2);
        this.leftBoots.add(outerBootL);
        this.group.add(this.leftBoots);

        this.rightBoots = new THREE.Group();
        const innerBootR = new THREE.Mesh(bootGeom, matRubber);
        innerBootR.position.set(rightStartX, 0, diffOffsetZ);
        // Correct boot orientation for right side
        const eulerR = new THREE.Euler(0, rightSweepAngle, -Math.PI/2);
        innerBootR.rotation.copy(eulerR);
        this.rightBoots.add(innerBootR);
        
        const outerBootR = new THREE.Mesh(bootGeom, matRubber);
        outerBootR.position.set(rightEndX, 0, 0);
        outerBootR.rotation.copy(eulerR);
        this.rightBoots.add(outerBootR);
        this.group.add(this.rightBoots);
        
        // Add Differential Housing representation
        const diffGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 32).rotateZ(Math.PI/2);
        const diffMesh = new THREE.Mesh(diffGeom, matSteel);
        diffMesh.position.set(diffOffsetX, 0, diffOffsetZ);
        diffMesh.userData.name = "Obudowa mechanizmu różnicowego (Differential Housing)";
        this.group.add(diffMesh);
        
        // Add Intermediate Shaft Support Bearing for Transverse right shaft
        if (isFront && isTransverse) {

            const bearing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.015, 16, 32), matSteel);
            bearing.rotation.y = Math.PI/2;
            bearing.position.x = 0; // mounted on engine block
            this.group.add(bearing);
        }
    }
    private createBootGeometry(): THREE.BufferGeometry {
        const points = [];
        for (let i = 0; i < 5; i++) {
            points.push(new THREE.Vector2(0.015, i * 0.01));
            points.push(new THREE.Vector2(0.035, i * 0.01 + 0.005));
        }
        points.push(new THREE.Vector2(0.015, 5 * 0.01));
        return new THREE.LatheGeometry(points, 32);
    }

    public updateKinematics(dt: number, speed: number) {
        this.currentAngle += speed * dt;
        
        // LOD Check
        if (this.sceneContext && this.sceneContext.camera) {
            const worldPos = new THREE.Vector3();
            this.group.getWorldPosition(worldPos);
            if (this.sceneContext.camera.position.distanceTo(worldPos) > 3.5) {
                return; // skip mesh updates if far away
            }
        }

        this.leftShaft.rotation.x = this.currentAngle;
        this.rightShaft.rotation.x = -this.currentAngle; 
        
        this.leftBoots.rotation.x = this.currentAngle;
        this.rightBoots.rotation.x = -this.currentAngle;
    }
}

