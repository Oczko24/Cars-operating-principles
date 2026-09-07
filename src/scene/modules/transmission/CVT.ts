import * as THREE from 'three';

export class CVT {
    public group: THREE.Group;
    private sceneContext: any;
    
    private cDistance = 0.25; // 250mm between pulleys
    private beltLength: number;
    
    // Pulleys
    private primaryFixed: THREE.Mesh;
    private primarySliding: THREE.Mesh;
    private secondaryFixed: THREE.Mesh;
    private secondarySliding: THREE.Mesh;
    private beltMesh: THREE.Mesh;
    
    private primaryAngle = 0;
    private secondaryAngle = 0;
    
    private coneAngle = 11 * Math.PI / 180;
    private minRadius = 0.03;
    private maxRadius = 0.11;

    // Current state
    private targetRatio = 2.6;
    private currentRatio = 2.6;

    constructor(sceneContext: any) {
        this.sceneContext = sceneContext;
        this.group = new THREE.Group();
        this.group.userData.name = "CVT Gearbox";

        // Calculate initial belt length at ratio 1.0 (R1 = R2 = 0.07)
        const R0 = 0.07;
        this.beltLength = 2 * this.cDistance + Math.PI * (2 * R0) + Math.pow(R0 - R0, 2) / (4 * this.cDistance);

        this.buildPulleys();
    }

    private buildPulleys() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matBelt = this.sceneContext.matBelt || new THREE.MeshStandardMaterial({ color: 0x111111 });

        // Sheave geometry (Cone)
        const sheaveGeom = new THREE.CylinderGeometry(0.12, 0.02, 0.12 / Math.tan(this.coneAngle) - 0.02 / Math.tan(this.coneAngle), 32);
        sheaveGeom.rotateX(Math.PI / 2); // align with Z axis

        // Primary (Input) - offset Z slightly
        this.primaryFixed = new THREE.Mesh(sheaveGeom, matSteel);
        this.primaryFixed.position.set(0, 0, -0.05);
        this.group.add(this.primaryFixed);

        this.primarySliding = new THREE.Mesh(sheaveGeom, matSteel);
        this.primarySliding.rotation.x = Math.PI; // Face the other way
        this.primarySliding.position.set(0, 0, 0.05);
        this.group.add(this.primarySliding);

        // Secondary (Output) - offset Y by cDistance
        this.secondaryFixed = new THREE.Mesh(sheaveGeom, matSteel);
        this.secondaryFixed.rotation.x = Math.PI; // Fixed is on the other side to keep belt aligned
        this.secondaryFixed.position.set(0, -this.cDistance, 0.05);
        this.group.add(this.secondaryFixed);

        this.secondarySliding = new THREE.Mesh(sheaveGeom, matSteel);
        this.secondarySliding.position.set(0, -this.cDistance, -0.05);
        this.group.add(this.secondarySliding);

        // Belt (visual approximation as a simple scaled torus/tube or dynamic shape)
        // A true dynamic belt requires custom geometry or a curve tube.
        // We'll use a simple group we can scale for now, but to be "zero magic" we really should generate a path.
        this.beltMesh = new THREE.Mesh(new THREE.BufferGeometry(), matBelt);
        this.group.add(this.beltMesh);
        
        this.updateGeometry(this.currentRatio);
    }

    private calculateRadii(ratio: number): { r1: number, r2: number } {
        // L = 2C + pi*(R1+R2) + (R2-R1)^2 / 4C
        // R2 = ratio * R1
        const C = this.cDistance;
        const L = this.beltLength;
        const i = ratio;

        const A = Math.pow(i - 1, 2) / (4 * C);
        const B = Math.PI * (1 + i);
        const C_eq = 2 * C - L;

        let r1 = 0;
        if (Math.abs(A) < 1e-6) { // ratio ~= 1
            r1 = -C_eq / B;
        } else {
            const discriminant = B * B - 4 * A * C_eq;
            r1 = (-B + Math.sqrt(discriminant)) / (2 * A);
        }

        return { r1, r2: r1 * i };
    }

    private updateGeometry(ratio: number) {
        const { r1, r2 } = this.calculateRadii(ratio);

        // Axially shift sheaves based on radius.
        // r = z * tan(theta) => z = r / tan(theta)
        const z1 = r1 * Math.tan(this.coneAngle);
        const z2 = r2 * Math.tan(this.coneAngle);

        // Center of V is at z=0. 
        // Fixed sheaves don't move, sliding ones do.
        // Let's say primaryFixed is at z = -base, primarySliding is at z = +base
        this.primarySliding.position.z = z1;
        this.primaryFixed.position.z = -z1; // If we want to keep belt centered. Actually one is fixed, one slides.
        // Let's keep belt centered at Z=0 for simplicity of visual.
        
        this.secondarySliding.position.z = -z2;
        this.secondaryFixed.position.z = z2;

        // Rebuild belt geometry exactly tangent to r1 and r2
        const shape = new THREE.Shape();
        // Calculate tangent lines between two circles
        // Angle of tangent:
        const theta = Math.asin((r2 - r1) / this.cDistance);
        
        const p1x = r1 * Math.sin(theta);
        const p1y = r1 * Math.cos(theta);
        const p2x = r2 * Math.sin(theta);
        const p2y = -this.cDistance + r2 * Math.cos(theta);
        
        const p3x = -r2 * Math.sin(theta);
        const p3y = -this.cDistance - r2 * Math.cos(theta);
        const p4x = -r1 * Math.sin(theta);
        const p4y = -r1 * Math.cos(theta);

        // Create a 2D path and extrude it slightly to form the belt
        const path = new THREE.Path();
        path.moveTo(p1x, p1y);
        path.lineTo(p2x, p2y);
        path.absarc(0, -this.cDistance, r2, Math.PI/2 - theta, -Math.PI/2 + theta, false);
        path.lineTo(p4x, p4y);
        path.absarc(0, 0, r1, -Math.PI/2 + theta, Math.PI/2 - theta, false);

        const beltShape = new THREE.Shape();
        beltShape.add(path);
        
        const extrude = new THREE.ExtrudeGeometry(beltShape, {
            depth: 0.02,
            bevelEnabled: false,
            curveSegments: 32
        });
        extrude.translate(0, 0, -0.01);
        
        this.beltMesh.geometry.dispose();
        this.beltMesh.geometry = extrude;
    }

    public updateKinematics(dt: number, engineSpeed: number, currentGear: string): number {
        // Gear '1' means lowest ratio (e.g. 2.6). Gear '5' means highest (e.g. 0.5)
        // Smoothly interpolate current ratio
        switch(currentGear) {
            case '1': this.targetRatio = 2.6; break;
            case '2': this.targetRatio = 2.0; break;
            case '3': this.targetRatio = 1.4; break;
            case '4': this.targetRatio = 1.0; break;
            case '5': this.targetRatio = 0.6; break;
            case 'R': this.targetRatio = -2.6; break; // Note: real CVT has planetary gear for reverse
            default: this.targetRatio = 2.6;
        }

        // Real CVT uses a planetary reverser, but we'll just allow negative speed here for simplicity
        const absTarget = Math.abs(this.targetRatio);
        this.currentRatio += (absTarget - this.currentRatio) * 2 * dt;

        this.updateGeometry(this.currentRatio);

        this.primaryAngle += engineSpeed * dt;
        this.primaryFixed.rotation.z = this.primaryAngle;
        this.primarySliding.rotation.z = this.primaryAngle;

        let outputSpeed = engineSpeed / (this.targetRatio === 0 ? 1 : this.targetRatio);
        // Note: ratio = output/input ? Wait.
        // Usually CVT ratio = R_secondary / R_primary.
        // speed_secondary = speed_primary * (R_primary / R_secondary) = speed_primary / ratio.
        
        this.secondaryAngle += outputSpeed * dt;
        this.secondaryFixed.rotation.z = this.secondaryAngle;
        this.secondarySliding.rotation.z = this.secondaryAngle;

        return outputSpeed;
    }
}

