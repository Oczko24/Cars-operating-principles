import * as THREE from 'three';

export class CVT {
    public group: THREE.Group;
    private sceneContext: any;
    
    private cDistance = 0.25; // 250mm between primary and secondary centers
    private beltLength: number;
    
    // Pulleys
    private primaryFixed: THREE.Mesh;
    private primarySliding: THREE.Mesh;
    private secondaryFixed: THREE.Mesh;
    private secondarySliding: THREE.Mesh;
    private beltMesh: THREE.Mesh;

    // Servo chambers
    private primaryServo: THREE.Mesh;
    private secondaryServo: THREE.Mesh;
    
    private primaryAngle = 0;
    private secondaryAngle = 0;
    
    private coneAngle = 11 * Math.PI / 180;
    private minRadius = 0.035;
    private maxRadius = 0.105;

    // Current state
    private targetRatio = 2.6;
    private currentRatio = 2.6;
    private lastRebuiltRatio = -1;

    private centerZ = -0.12;

    constructor(sceneContext: any) {
        this.sceneContext = sceneContext;
        this.group = new THREE.Group();
        this.group.userData.name = "CVT Continuously Variable Transmission (Multitronic)";

        // Initial belt length for R0 = 0.07 at ratio 1.0
        const R0 = 0.07;
        this.beltLength = 2 * this.cDistance + Math.PI * (2 * R0) + Math.pow(R0 - R0, 2) / (4 * this.cDistance);

        this.buildPulleysAndShafts();
        this.buildReversingUnitAndReduction();
        this.buildHousing();
    }

    private buildPulleysAndShafts() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matChrome = this.sceneContext.matChrome || new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.98, roughness: 0.08 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });
        const matBelt = this.sceneContext.matBelt || new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

        // Wałki czynny i bierny (Primary & Secondary Shafts)
        const primShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 16).rotateX(Math.PI/2), matDark);
        primShaft.position.set(0, 0, this.centerZ);
        primShaft.userData.name = "Wałek czynny wariatora (Primary Input Shaft)";
        this.group.add(primShaft);

        const secShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 16).rotateX(Math.PI/2), matDark);
        secShaft.position.set(0, -this.cDistance, this.centerZ);
        secShaft.userData.name = "Wałek bierny wariatora (Secondary Output Shaft)";
        this.group.add(secShaft);

        // Precyzyjnie szlifowane stożki wariatora (Polished Conical Sheaves)
        const coneHeight = (this.maxRadius - this.minRadius) / Math.tan(this.coneAngle);
        const sheaveGeom = new THREE.CylinderGeometry(this.maxRadius + 0.01, this.minRadius, coneHeight, 32);
        sheaveGeom.rotateX(Math.PI / 2);

        // Stożki koła czynnego (Primary Pulley)
        this.primaryFixed = new THREE.Mesh(sheaveGeom, matChrome);
        this.primaryFixed.position.set(0, 0, this.centerZ - 0.045);
        this.primaryFixed.userData.name = "Stożek stały koła czynnego wariatora";
        this.group.add(this.primaryFixed);

        this.primarySliding = new THREE.Mesh(sheaveGeom, matChrome);
        this.primarySliding.rotation.x = Math.PI;
        this.primarySliding.position.set(0, 0, this.centerZ + 0.045);
        this.primarySliding.userData.name = "Stożek przesuwny koła czynnego (Sterowany hydraulicznie)";
        this.group.add(this.primarySliding);

        // Siłownik hydrauliczny docisku stożka czynnego (Primary Hydraulic Servo Cylinder)
        const servoGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.032, 24).rotateX(Math.PI/2);
        this.primaryServo = new THREE.Mesh(servoGeo, matSteel);
        this.primaryServo.position.set(0, 0, this.centerZ + 0.075);
        this.primaryServo.userData.name = "Komora siłownika hydraulicznego docisku stożka czynnego";
        this.group.add(this.primaryServo);

        // Stożki koła biernego (Secondary Pulley)
        this.secondaryFixed = new THREE.Mesh(sheaveGeom, matChrome);
        this.secondaryFixed.rotation.x = Math.PI;
        this.secondaryFixed.position.set(0, -this.cDistance, this.centerZ + 0.045);
        this.secondaryFixed.userData.name = "Stożek stały koła biernego wariatora";
        this.group.add(this.secondaryFixed);

        this.secondarySliding = new THREE.Mesh(sheaveGeom, matChrome);
        this.secondarySliding.position.set(0, -this.cDistance, this.centerZ - 0.045);
        this.secondarySliding.userData.name = "Stożek przesuwny koła biernego ze sprężyną dociskową";
        this.group.add(this.secondarySliding);

        // Siłownik dociskowy koła biernego
        this.secondaryServo = new THREE.Mesh(servoGeo, matSteel);
        this.secondaryServo.position.set(0, -this.cDistance, this.centerZ - 0.075);
        this.secondaryServo.userData.name = "Siłownik docisku i sprężyna talerzowa koła biernego";
        this.group.add(this.secondaryServo);

        // Stalowy pas pchany Van Doorne'a (Van Doorne Steel Pushbelt)
        this.beltMesh = new THREE.Mesh(new THREE.BufferGeometry(), matBelt);
        this.beltMesh.userData.name = "Stalowy pas pchany Van Doorne'a";
        this.group.add(this.beltMesh);
        
        this.updateGeometry(this.currentRatio);
    }

    private buildReversingUnitAndReduction() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706 });

        // Planetarny nawrotnik kierunku (Forward/Reverse Planetary Pack) na wejściu skrzyni
        const revPack = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.024, 24).rotateX(Math.PI/2), matDark);
        revPack.position.set(0, 0, -0.025);
        revPack.userData.name = "Nawrotnik planetarny kierunku jazdy (Forward/Reverse Set)";
        this.group.add(revPack);

        // Przekładnia redukcyjna wyjściowa (Output Reduction Gear)
        const pinionOut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.024, 24).rotateX(Math.PI/2), matBronze);
        pinionOut.position.set(0, -this.cDistance, this.centerZ - 0.065);
        pinionOut.userData.name = "Koło zębate zdawcze wariatora";
        this.group.add(pinionOut);

        // Koło talerzowe dyferencjału transaxle
        const diffCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.022, 32).rotateX(Math.PI/2), matSteel);
        diffCrown.position.set(0.12, -this.cDistance, this.centerZ - 0.065);
        diffCrown.userData.name = "Koło talerzowe przekładni głównej i dyferencjału CVT";
        this.group.add(diffCrown);
    }

    private buildHousing() {
        const caseGeo = new THREE.BoxGeometry(0.24, this.cDistance + 0.24, 0.28);
        const caseWire = new THREE.LineSegments(
            new THREE.EdgesGeometry(caseGeo),
            this.sceneContext.crankcaseLineMat || new THREE.LineBasicMaterial({ color: 0x475569 })
        );
        caseWire.position.set(0.04, -this.cDistance / 2, this.centerZ);
        caseWire.userData.name = "Obudowa skrzyni bezstopniowej CVT (Zarys przekroju)";
        this.group.add(caseWire);
    }

    private calculateRadii(ratio: number): { r1: number, r2: number } {
        const C = this.cDistance;
        const L = this.beltLength;
        const i = Math.max(0.4, Math.min(3.5, ratio));

        const A = Math.pow(i - 1, 2) / (4 * C);
        const B = Math.PI * (1 + i);
        const C_eq = 2 * C - L;

        let r1 = 0;
        if (Math.abs(A) < 1e-6) {
            r1 = -C_eq / B;
        } else {
            const discriminant = Math.max(0, B * B - 4 * A * C_eq);
            r1 = (-B + Math.sqrt(discriminant)) / (2 * A);
        }

        r1 = Math.max(this.minRadius, Math.min(this.maxRadius, r1));
        const r2 = Math.max(this.minRadius, Math.min(this.maxRadius, r1 * i));
        return { r1, r2 };
    }

    private updateGeometry(ratio: number) {
        if (Math.abs(ratio - this.lastRebuiltRatio) < 0.015) {
            return;
        }
        this.lastRebuiltRatio = ratio;

        const { r1, r2 } = this.calculateRadii(ratio);

        const z1 = (r1 - this.minRadius) * Math.tan(this.coneAngle);
        const z2 = (r2 - this.minRadius) * Math.tan(this.coneAngle);

        this.primarySliding.position.z = this.centerZ + 0.020 + z1;
        this.primaryFixed.position.z = this.centerZ - 0.020 - z1;
        this.primaryServo.position.z = this.centerZ + 0.055 + z1;

        this.secondarySliding.position.z = this.centerZ - 0.020 - z2;
        this.secondaryFixed.position.z = this.centerZ + 0.020 + z2;
        this.secondaryServo.position.z = this.centerZ - 0.055 - z2;

        // Generowanie krzywej obwiedniowej pasa (2 łuki styczne + 2 proste styczne)
        const deltaR = (r2 - r1) / this.cDistance;
        const theta = Math.asin(Math.max(-0.95, Math.min(0.95, deltaR)));

        const path = new THREE.Path();
        const p1x = r1 * Math.cos(theta);
        const p1y = r1 * Math.sin(theta);
        const p2x = r2 * Math.cos(theta);
        const p2y = -this.cDistance + r2 * Math.sin(theta);

        path.moveTo(p1x, p1y);
        path.lineTo(p2x, p2y);
        path.absarc(0, -this.cDistance, r2, theta, Math.PI - theta, false);
        path.lineTo(-p1x, p1y);
        path.absarc(0, 0, r1, Math.PI - theta, theta, false);

        const beltShape = new THREE.Shape(path.getPoints(24));
        const innerPath = new THREE.Path();
        const beltThick = 0.009;
        innerPath.absarc(0, -this.cDistance, r2 - beltThick, theta, Math.PI - theta, false);
        innerPath.absarc(0, 0, r1 - beltThick, Math.PI - theta, theta, false);
        beltShape.holes.push(innerPath);

        const extrude = new THREE.ExtrudeGeometry(beltShape, {
            depth: 0.024,
            bevelEnabled: true,
            bevelSegments: 1,
            bevelSize: 0.001,
            bevelThickness: 0.001,
            curveSegments: 20
        });
        extrude.translate(0, 0, this.centerZ);

        this.beltMesh.geometry.dispose();
        this.beltMesh.geometry = extrude;
    }

    public updateKinematics(dt: number, engineSpeed: number, currentGear: string): number {
        const customCvtRatio = this.sceneContext?.config?.cvtRatio !== undefined ? Number(this.sceneContext.config.cvtRatio) : null;

        if (currentGear === 'D' && customCvtRatio !== null) {
            this.targetRatio = customCvtRatio;
        } else {
            switch(currentGear) {
                case '1': this.targetRatio = customCvtRatio !== null ? customCvtRatio : 2.6; break;
                case '2': this.targetRatio = 1.9; break;
                case '3': this.targetRatio = 1.4; break;
                case '4': this.targetRatio = 1.0; break;
                case '5': this.targetRatio = 0.65; break;
                case '6': this.targetRatio = 0.55; break;
                case 'R': this.targetRatio = 2.6; break;
                case 'N': this.targetRatio = 2.6; break;
                default: this.targetRatio = customCvtRatio !== null ? customCvtRatio : 2.6;
            }
        }

        // Płynna zmiana przełożenia wariatora
        const absTarget = Math.abs(this.targetRatio);
        this.currentRatio += (absTarget - this.currentRatio) * 3.5 * dt;

        this.updateGeometry(this.currentRatio);

        this.primaryAngle += engineSpeed * dt;
        this.primaryFixed.rotation.z = this.primaryAngle;
        this.primarySliding.rotation.z = this.primaryAngle;

        let outputSpeed = engineSpeed / (this.currentRatio === 0 ? 1 : this.currentRatio);
        if (currentGear === 'R') {
            outputSpeed = -outputSpeed;
        } else if (currentGear === 'N') {
            outputSpeed = 0;
        }
        
        this.secondaryAngle += outputSpeed * dt;
        this.secondaryFixed.rotation.z = this.secondaryAngle;
        this.secondarySliding.rotation.z = this.secondaryAngle;

        return outputSpeed;
    }
}
