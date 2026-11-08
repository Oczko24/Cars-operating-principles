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

    private shiftForks: {
        group: THREE.Group;
        sleeveIndex: number;
    }[] = [];

    constructor(sceneContext: any, isTransverse: boolean = false) {
        this.sceneContext = sceneContext;
        this.isTransverse = isTransverse;
        this.group = new THREE.Group();
        this.group.userData.name = "Manual Gearbox Assembly";

        this.buildGears();
        this.buildShiftMechanism();
        this.buildHousingAndBearings();
    }

    private buildGears() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Wałek sprzęgłowy (Input Shaft)
        const inputShaftGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 16);
        inputShaftGeom.rotateX(Math.PI / 2);
        const inputShaft = new THREE.Mesh(inputShaftGeom, matDark);
        inputShaft.position.z = -0.05;
        inputShaft.userData.name = "Wałek wejściowy (sprzęgłowy)";
        this.group.add(inputShaft);

        // Wałek główny (Main / Output Shaft)
        const mainShaftGeom = new THREE.CylinderGeometry(0.018, 0.018, this.isTransverse ? 0.3 : 0.5, 16);
        mainShaftGeom.rotateX(Math.PI / 2);
        const mainShaft = new THREE.Mesh(mainShaftGeom, matSteel);
        mainShaft.position.z = this.isTransverse ? -0.2 : -0.35;
        mainShaft.userData.name = "Wałek główny (zdawczy)";
        this.group.add(mainShaft);

        // Wałek pośredni (Countershaft / Layshaft)
        const counterShaftGeom = new THREE.CylinderGeometry(0.02, 0.02, this.isTransverse ? 0.35 : 0.55, 16);
        counterShaftGeom.rotateX(Math.PI / 2);
        const counterShaft = new THREE.Mesh(counterShaftGeom, matDark);
        counterShaft.position.y = -this.dCenter;
        counterShaft.position.z = this.isTransverse ? -0.2 : -0.35;
        counterShaft.userData.name = "Wałek pośredni (Layshaft)";
        this.group.add(counterShaft);

        if (this.isTransverse) {
            // Zębatka zdawcza przekładni głównej i koło talerzowe dyferencjału
            const pinion = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16).rotateX(Math.PI/2), matBronze);
            pinion.position.set(0, -this.dCenter, -0.3);
            pinion.userData.name = "Koło zębate zdawcze (Pinion)";
            this.group.add(pinion);
            
            const diffRing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32).rotateX(Math.PI/2), matSteel);
            diffRing.position.set(0.11, -this.dCenter, -0.3);
            diffRing.userData.name = "Koło talerzowe dyferencjału transaxle";
            this.group.add(diffRing);
        }

        const rIn = 0.03;
        const rLayIn = 0.06;
        
        this.inputGear = new THREE.Mesh(createGearGeometry(rIn, 0.02, 15, 0), matSteel);
        this.inputGear.position.z = -0.1;
        this.inputGear.userData.name = "Koło zębate stałego zazębienia wałka sprzęgłowego";
        this.inputGear.matrixAutoUpdate = false;
        this.inputGear.updateMatrix();
        this.group.add(this.inputGear);

        this.counterInputGear = new THREE.Mesh(createGearGeometry(rLayIn, 0.02, 30, 0), matSteel);
        this.counterInputGear.position.set(0, -this.dCenter, -0.1);
        this.counterInputGear.rotation.z = Math.PI / 30; 
        this.counterInputGear.userData.name = "Koło zębate napędowe wałka pośredniego";
        this.counterInputGear.matrixAutoUpdate = false;
        this.counterInputGear.updateMatrix();
        this.group.add(this.counterInputGear);

        let currentZ = -0.16;
        const zStep = this.isTransverse ? 0.03 : 0.05;

        const isDogbox = this.sceneContext?.config?.gearboxPreset === 'rally_dogbox';

        const addGearPair = (name: string, rMain: number, rLay: number, teethMain: number, teethLay: number, isReverse = false) => {
            const z = currentZ;
            
            const layGear = new THREE.Mesh(createGearGeometry(rLay, 0.02, teethLay), matSteel);
            layGear.position.set(0, -this.dCenter, z);
            layGear.userData.name = `Koło zębate wałka pośredniego (Bieg ${name})`;
            layGear.matrixAutoUpdate = false;
            layGear.updateMatrix();
            this.group.add(layGear);

            let mainGear: THREE.Mesh;
            let idlerGear: THREE.Mesh | undefined;

            if (isReverse) {
                const rIdler = 0.025;
                mainGear = new THREE.Mesh(createGearGeometry(rMain, 0.02, teethMain), matSteel);
                mainGear.position.set(0, 0, z);
                mainGear.userData.name = "Koło zębate wałka głównego (Bieg Wsteczny)";
                
                idlerGear = new THREE.Mesh(createGearGeometry(rIdler, 0.02, 12, 0), matBronze);
                idlerGear.userData.name = "Koło pośredniczące nawrotne (Bieg Wsteczny)";
                
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
                mainGear.userData.name = `Koło zębate wałka głównego (Bieg ${name})`;
                mainGear.matrixAutoUpdate = false;
                mainGear.updateMatrix();
            }
            this.group.add(mainGear);

            // Pierścienie synchronizatorów (lub kły czołowe dla skrzyni kłowej Dogbox)
            if (isDogbox) {
                // Kły czołowe sprzęgła kłowego (Dog Ring Motorsport)
                const dogGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.006, 6, 1, false);
                dogGeo.rotateX(Math.PI / 2);
                const dogRing = new THREE.Mesh(dogGeo, matSteel);
                dogRing.position.set(0, 0, z + 0.012);
                dogRing.userData.name = `Wieniec kłów czołowych (Dog Teeth Bieg ${name})`;
                this.group.add(dogRing);
            } else {
                // Stożki synchronizatorów ze stopu brązu fosforowego
                const syncConeGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.005, 20, 1, true);
                syncConeGeo.rotateX(Math.PI / 2);
                const syncCone = new THREE.Mesh(syncConeGeo, matBronze);
                syncCone.position.set(0, 0, z + 0.013);
                syncCone.userData.name = `Stożek synchronizatora (Bieg ${name})`;
                this.group.add(syncCone);
            }

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
        addGearPair('5', 0.027, 0.063, 13, 31);
        addGearPair('6', 0.022, 0.068, 11, 33);
        addGearPair('R', 0.040, 0.030, 20, 15, true); 

        const createSleeve = (zFront: number, zBack: number, gFront: string | null, gBack: string | null) => {
            const zNeutral = (zFront + zBack) / 2;
            const geom = new THREE.CylinderGeometry(0.028, 0.028, 0.015, 24);
            geom.rotateX(Math.PI / 2);
            const mesh = new THREE.Mesh(geom, isDogbox ? matSteel : matBronze);
            mesh.position.set(0, 0, zNeutral);
            mesh.userData.name = isDogbox ? `Przesuwka kłowa (Dog Ring ${gFront}/${gBack})` : `Przesuwka synchronizatora (${gFront}/${gBack})`;
            this.group.add(mesh);
            
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 24).rotateX(Math.PI/2), matDark);
            hub.position.set(0, 0, zNeutral);
            hub.userData.name = `Piasta synchronizatora (${gFront}/${gBack})`;
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
        createSleeve(this.gearPairs[4].zPos, this.gearPairs[5].zPos, '5', '6');
        createSleeve(this.gearPairs[6].zPos + 0.015, this.gearPairs[6].zPos - 0.015, 'R', null);
    }

    private buildShiftMechanism() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Główny wałek wybieraka (Selector Rail)
        const selectorRailGeo = new THREE.CylinderGeometry(0.007, 0.007, this.isTransverse ? 0.32 : 0.48, 12);
        selectorRailGeo.rotateX(Math.PI / 2);
        const selectorRail = new THREE.Mesh(selectorRailGeo, matDark);
        selectorRail.position.set(0, 0.055, this.isTransverse ? -0.22 : -0.32);
        selectorRail.userData.name = "Drążek wodzików wybieraka biegów";
        this.group.add(selectorRail);

        // 3 odlewane widłaki zmiany biegów (Shift Forks) obejmujące przesuwki
        this.sleeves.forEach((sleeve, idx) => {
            const forkGroup = new THREE.Group();
            forkGroup.position.set(0, 0, sleeve.zPosNeutral);

            // Tuleja mocująca na drążku wodzika
            const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.018, 16).rotateX(Math.PI/2), matDark);
            collar.position.set(0, 0.055, 0);
            collar.userData.name = `Wodziki i obsada widłaka #${idx + 1}`;
            forkGroup.add(collar);

            // Ramię widłaka biegnące w dół do osi przesuwki
            const armGeo = new THREE.BoxGeometry(0.009, 0.050, 0.012);
            const arm = new THREE.Mesh(armGeo, matSteel);
            arm.position.set(0, 0.030, 0);
            arm.userData.name = `Ramię widłaka #${idx + 1}`;
            forkGroup.add(arm);

            // Półkolisty łuk widłaka obejmujący rowek przesuwki
            const arcGeo = new THREE.TorusGeometry(0.031, 0.0045, 8, 16, Math.PI);
            arcGeo.rotateZ(Math.PI);
            const forkArc = new THREE.Mesh(arcGeo, matSteel);
            forkArc.position.set(0, 0, 0);
            forkArc.userData.name = `Łuk chwytający przesuwki #${idx + 1}`;
            forkGroup.add(forkArc);

            this.group.add(forkGroup);
            this.shiftForks.push({ group: forkGroup, sleeveIndex: idx });
        });
    }

    private buildHousingAndBearings() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        // 1. Łożyska toczne wałków (Bearings)
        const bearingGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.014, 20).rotateX(Math.PI/2);
        
        const frontBearingMain = new THREE.Mesh(bearingGeo, matSteel);
        frontBearingMain.position.set(0, 0, -0.09);
        frontBearingMain.userData.name = "Łożysko toczne przednie wałka głównego";
        this.group.add(frontBearingMain);

        const frontBearingLay = new THREE.Mesh(bearingGeo, matSteel);
        frontBearingLay.position.set(0, -this.dCenter, -0.09);
        frontBearingLay.userData.name = "Łożysko toczne przednie wałka pośredniego";
        this.group.add(frontBearingLay);

        const rearZ = this.isTransverse ? -0.34 : -0.48;
        const rearBearingMain = new THREE.Mesh(bearingGeo, matSteel);
        rearBearingMain.position.set(0, 0, rearZ);
        rearBearingMain.userData.name = "Łożysko toczne tylne wałka głównego";
        this.group.add(rearBearingMain);

        const rearBearingLay = new THREE.Mesh(bearingGeo, matSteel);
        rearBearingLay.position.set(0, -this.dCenter, rearZ);
        rearBearingLay.userData.name = "Łożysko toczne tylne wałka pośredniego";
        this.group.add(rearBearingLay);

        // 2. Dzwon skrzyni (Bellhousing) - mocowany do bloku silnika
        const bellGeo = new THREE.CylinderGeometry(0.18, 0.23, 0.09, 24, 1, true).rotateX(Math.PI/2);
        const bellMesh = new THREE.Mesh(bellGeo, matDark);
        bellMesh.position.set(0, -0.02, -0.045);
        bellMesh.userData.name = "Dzwon skrzyni biegów (Obudowa sprzęgła)";
        this.group.add(bellMesh);

        // 3. Korpus skrzyni (Cutaway Transmission Case) w stylu technicznym (zarys i żebra)
        const caseLength = this.isTransverse ? 0.26 : 0.40;
        const caseMidZ = -0.09 - caseLength / 2;
        const caseGeo = new THREE.BoxGeometry(0.19, 0.22, caseLength);
        const caseWire = new THREE.LineSegments(
            new THREE.EdgesGeometry(caseGeo),
            this.sceneContext.crankcaseLineMat || new THREE.LineBasicMaterial({ color: 0x475569 })
        );
        caseWire.position.set(0, -this.dCenter / 2, caseMidZ);
        caseWire.userData.name = "Korpus skrzyni biegów (Zarys przekroju)";
        this.group.add(caseWire);

        // Żebra usztywniające obudowy
        for (let r = 0; r < 3; r++) {
            const ribZ = -0.12 - r * (caseLength / 2.8);
            const ribRing = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.BoxGeometry(0.195, 0.225, 0.008)),
                this.sceneContext.crankcaseLineMat || new THREE.LineBasicMaterial({ color: 0x64748b })
            );
            ribRing.position.set(0, -this.dCenter / 2, ribZ);
            ribRing.userData.name = "Żebro usztywniające obudowy skrzyni";
            this.group.add(ribRing);
        }

        // Flansza wyjściowa dla napędu wzdłużnego RWD (Output Flange)
        if (!this.isTransverse) {
            const flangeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.016, 24).rotateX(Math.PI/2);
            const outFlange = new THREE.Mesh(flangeGeo, matSteel);
            outFlange.position.set(0, 0, -0.51);
            outFlange.userData.name = "Flansza wyjściowa wału napędowego (Giubo/Kardan)";
            this.group.add(outFlange);
        }
    }

    public updateKinematics(dt: number, inputSpeed: number, currentGear: string): number {
        let ANIMATE_GEARS = false;
        if (this.sceneContext && this.sceneContext.camera) {
            const worldPos = new THREE.Vector3();
            this.group.getWorldPosition(worldPos);
            const dist = this.sceneContext.camera.position.distanceTo(worldPos);
            ANIMATE_GEARS = dist < 2.5;
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

        for (let i = 0; i < this.sleeves.length; i++) {
            const sleeve = this.sleeves[i];
            if (currentGear === sleeve.gears[0]) {
                sleeve.targetZ = sleeve.zPosEngagedFront;
            } else if (currentGear === sleeve.gears[1]) {
                sleeve.targetZ = sleeve.zPosEngagedBack;
            } else {
                sleeve.targetZ = sleeve.zPosNeutral;
            }
            sleeve.currentZ += (sleeve.targetZ - sleeve.currentZ) * 15 * dt;
            sleeve.mesh.position.z = sleeve.currentZ;

            // Ruch widłaka powiązany z przesuwką synchronizatora
            const fork = this.shiftForks[i];
            if (fork) {
                fork.group.position.z = sleeve.currentZ;
            }
        }

        for (const pair of this.gearPairs) {
            let rMain, rLayActual;
            switch(pair.gearName) {
                case '1': rMain=0.065; rLayActual=0.025; break;
                case '2': rMain=0.055; rLayActual=0.035; break;
                case '3': rMain=0.045; rLayActual=0.045; break;
                case '4': rMain=0.035; rLayActual=0.055; break;
                case '5': rMain=0.027; rLayActual=0.063; break;
                case '6': rMain=0.022; rLayActual=0.068; break;
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
        
        if (currentGear === 'N') {
            outputSpeed = 0;
        }

        if (ANIMATE_GEARS) {
            for (const sleeve of this.sleeves) {
                sleeve.mesh.rotation.z = this.mainShaftAngle;
            }
        }

        return outputSpeed;
    }
}
