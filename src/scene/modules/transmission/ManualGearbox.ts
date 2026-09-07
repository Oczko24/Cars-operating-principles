import * as THREE from 'three';
import { createGearGeometry } from './GearGenerator.js';

export class ManualGearbox {
    public group: THREE.Group;
    private sceneContext: any;
    private isTransverse: boolean;

    private dCenter = 0.09; 
    private inputShaftAngle = 0;
    private counterShaftAngle = 0;
    private mainShaftAngle = 0;

    private inputGear: THREE.Mesh;
    private counterInputGear: THREE.Mesh;
    
    private gearPairs: {
        gearName: string;
        mainGear: THREE.Mesh;
        counterGear: THREE.Mesh;
        idlerGear?: THREE.Mesh;
        zPos: number;
    }[] = [];

    private sleeves: {
        mesh: THREE.Mesh;
        zPosNeutral: number;
        zPosEngagedFront: number;
        zPosEngagedBack: number;
        currentZ: number;
        targetZ: number;
        gears: [string | null, string | null];
    }[] = [];

    constructor(sceneContext: any, isTransverse: boolean = false) {
        this.sceneContext = sceneContext;
        this.isTransverse = isTransverse;
        this.group = new THREE.Group();
        this.group.userData.name = "Manual Gearbox Assembly";

        this.buildGears();
    }

    private buildGears() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        const inputShaftGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 16);
        inputShaftGeom.rotateX(Math.PI / 2);
        const inputShaft = new THREE.Mesh(inputShaftGeom, matDark);
        inputShaft.position.z = -0.05;
        this.group.add(inputShaft);

        const mainShaftGeom = new THREE.CylinderGeometry(0.018, 0.018, this.isTransverse ? 0.3 : 0.5, 16);
        mainShaftGeom.rotateX(Math.PI / 2);
        const mainShaft = new THREE.Mesh(mainShaftGeom, matSteel);
        mainShaft.position.z = this.isTransverse ? -0.2 : -0.35;
        this.group.add(mainShaft);

        const counterShaftGeom = new THREE.CylinderGeometry(0.02, 0.02, this.isTransverse ? 0.35 : 0.55, 16);
        counterShaftGeom.rotateX(Math.PI / 2);
        const counterShaft = new THREE.Mesh(counterShaftGeom, matDark);
        counterShaft.position.y = -this.dCenter;
        counterShaft.position.z = this.isTransverse ? -0.2 : -0.35;
        this.group.add(counterShaft);

        if (this.isTransverse) {
            const pinion = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16).rotateX(Math.PI/2), matBronze);
            pinion.position.set(0, -this.dCenter, -0.3);
            this.group.add(pinion);
            
            const diffRing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32).rotateX(Math.PI/2), matSteel);
            diffRing.position.set(0.11, -this.dCenter, -0.3);
            this.group.add(diffRing);
        }

        const rIn = 0.03;
        const rLayIn = 0.06;
        
        this.inputGear = new THREE.Mesh(createGearGeometry(rIn, 0.02, 15, 0), matSteel);
        this.inputGear.position.z = -0.1;
        // Optimization: Disable matrix auto update for static objects to save FPS
        this.inputGear.matrixAutoUpdate = false;
        this.inputGear.updateMatrix();
        this.group.add(this.inputGear);

        this.counterInputGear = new THREE.Mesh(createGearGeometry(rLayIn, 0.02, 30, 0), matSteel);
        this.counterInputGear.position.set(0, -this.dCenter, -0.1);
        this.counterInputGear.rotation.z = Math.PI / 30; 
        this.counterInputGear.matrixAutoUpdate = false;
        this.counterInputGear.updateMatrix();
        this.group.add(this.counterInputGear);

        let currentZ = -0.16;
        const zStep = this.isTransverse ? 0.03 : 0.05;

        const addGearPair = (name: string, rMain: number, rLay: number, teethMain: number, teethLay: number, isReverse = false) => {
            const z = currentZ;
            
            const layGear = new THREE.Mesh(createGearGeometry(rLay, 0.02, teethLay), matSteel);
            layGear.position.set(0, -this.dCenter, z);
            layGear.matrixAutoUpdate = false;
            layGear.updateMatrix();
            this.group.add(layGear);

            let mainGear: THREE.Mesh;
            let idlerGear: THREE.Mesh | undefined;

            if (isReverse) {
                const rIdler = 0.025;
                mainGear = new THREE.Mesh(createGearGeometry(rMain, 0.02, teethMain), matSteel);
                mainGear.position.set(0, 0, z);
                
                idlerGear = new THREE.Mesh(createGearGeometry(rIdler, 0.02, 12, 0), matBronze);
                
                const d = this.dCenter;
                const r0 = rMain + rIdler;
                const r1 = rLay + rIdler;
                const a = (r0*r0 - r1*r1 + d*d) / (2*d);
                const h = Math.sqrt(Math.max(0, r0*r0 - a*a));
                idlerGear.position.set(h, -a, z);
                
                mainGear.rotation.z = Math.PI / teethMain;
                mainGear.matrixAutoUpdate = false;
                mainGear.updateMatrix();
                
                idlerGear.matrixAutoUpdate = false;
                idlerGear.updateMatrix();
                
                this.group.add(idlerGear);
            } else {
                mainGear = new THREE.Mesh(createGearGeometry(rMain, 0.02, teethMain), matSteel);
                mainGear.position.set(0, 0, z);
                mainGear.rotation.z = Math.PI / teethMain;
                mainGear.matrixAutoUpdate = false;
                mainGear.updateMatrix();
            }
            this.group.add(mainGear);

            this.gearPairs.push({
                gearName: name,
                mainGear,
                counterGear: layGear,
                idlerGear,
                zPos: z
            });

            currentZ -= zStep;
        };

        addGearPair('1', 0.065, 0.025, 32, 12);
        addGearPair('2', 0.055, 0.035, 27, 17);
        addGearPair('3', 0.045, 0.045, 22, 22);
        addGearPair('4', 0.035, 0.055, 17, 27);
        addGearPair('5', 0.025, 0.065, 12, 32);
        addGearPair('R', 0.040, 0.030, 20, 15, true); 

        const createSleeve = (zFront: number, zBack: number, gFront: string | null, gBack: string | null) => {
            const zNeutral = (zFront + zBack) / 2;
            const geom = new THREE.CylinderGeometry(0.025, 0.025, 0.015, 20);
            geom.rotateX(Math.PI / 2);
            const mesh = new THREE.Mesh(geom, matBronze);
            mesh.position.set(0, 0, zNeutral);
            this.group.add(mesh);
            
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 20).rotateX(Math.PI/2), matDark);
            hub.position.set(0, 0, zNeutral);
            this.group.add(hub);

            this.sleeves.push({
                mesh,
                zPosNeutral: zNeutral,
                zPosEngagedFront: zFront - 0.01,
                zPosEngagedBack: zBack + 0.01,
                currentZ: zNeutral,
                targetZ: zNeutral,
                gears: [gFront, gBack]
            });
        };

        createSleeve(this.gearPairs[0].zPos, this.gearPairs[1].zPos, '1', '2');
        createSleeve(this.gearPairs[2].zPos, this.gearPairs[3].zPos, '3', '4');
        createSleeve(this.gearPairs[4].zPos, this.gearPairs[5].zPos, '5', 'R');
    }

    public updateKinematics(dt: number, inputSpeed: number, currentGear: string): number {
        // LOD check to save FPS and reduce aliasing/light artifacts when zoomed out
        let ANIMATE_GEARS = false;
        if (this.sceneContext && this.sceneContext.camera) {
            const worldPos = new THREE.Vector3();
            this.group.getWorldPosition(worldPos);
            const dist = this.sceneContext.camera.position.distanceTo(worldPos);
            ANIMATE_GEARS = dist < 2.5; // Only rotate teeth if closer than 2.5 meters
        }

        this.inputShaftAngle += inputSpeed * dt;
        if (ANIMATE_GEARS) {
            this.inputGear.rotation.z = this.inputShaftAngle;
            this.inputGear.updateMatrix();
        }

        const counterSpeed = -inputSpeed * (0.03 / 0.06);
        this.counterShaftAngle += counterSpeed * dt;
        if (ANIMATE_GEARS) {
            this.counterInputGear.rotation.z = this.counterShaftAngle;
            this.counterInputGear.updateMatrix();
        }

        let outputSpeed = 0;

        for (const sleeve of this.sleeves) {
            if (currentGear === sleeve.gears[0]) {
                sleeve.targetZ = sleeve.zPosEngagedFront;
            } else if (currentGear === sleeve.gears[1]) {
                sleeve.targetZ = sleeve.zPosEngagedBack;
            } else {
                sleeve.targetZ = sleeve.zPosNeutral;
            }
            // Zawsze animujemy przesuwki, bo to mały koszt i pokazuje zmianę biegów
            sleeve.currentZ += (sleeve.targetZ - sleeve.currentZ) * 15 * dt;
            sleeve.mesh.position.z = sleeve.currentZ;
        }

        for (const pair of this.gearPairs) {
            let rMain, rLayActual;
            switch(pair.gearName) {
                case '1': rMain=0.065; rLayActual=0.025; break;
                case '2': rMain=0.055; rLayActual=0.035; break;
                case '3': rMain=0.045; rLayActual=0.045; break;
                case '4': rMain=0.035; rLayActual=0.055; break;
                case '5': rMain=0.025; rLayActual=0.065; break;
                case 'R': rMain=0.040; rLayActual=0.030; break;
                default: rMain=0.05; rLayActual=0.05;
            }

            if (ANIMATE_GEARS) {
                pair.counterGear.rotation.z = this.counterShaftAngle;
                pair.counterGear.updateMatrix();
            }

            let gearSpeed = 0;
            if (pair.idlerGear) {
                const rIdler = 0.025;
                const idlerSpeed = -counterSpeed * (rLayActual / rIdler);
                if (ANIMATE_GEARS) {
                    pair.idlerGear.rotation.z += idlerSpeed * dt;
                    pair.idlerGear.updateMatrix();
                }
                gearSpeed = -idlerSpeed * (rIdler / rMain);
            } else {
                gearSpeed = -counterSpeed * (rLayActual / rMain);
            }

            if (ANIMATE_GEARS) {
                pair.mainGear.rotation.z += gearSpeed * dt;
                pair.mainGear.updateMatrix();
            }

            if (currentGear === pair.gearName) {
                outputSpeed = gearSpeed;
                this.mainShaftAngle += gearSpeed * dt; 
            }
        }
        
        if (ANIMATE_GEARS) {
            for (const sleeve of this.sleeves) {
                sleeve.mesh.rotation.z = this.mainShaftAngle;
            }
        }

        if (this.isTransverse) {
            return counterSpeed;
        }

        return outputSpeed;
    }
}