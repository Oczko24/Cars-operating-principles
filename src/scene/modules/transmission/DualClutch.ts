import * as THREE from 'three';
import { createGearGeometry } from './GearGenerator.js';

interface SceneContextMaterials {
    matSteel?: THREE.Material;
    matDarkSteel?: THREE.Material;
    matBronze?: THREE.Material;
    matSilver?: THREE.Material;
    matGold?: THREE.Material;
    crankcaseLineMat?: THREE.Material;
    camera?: THREE.Camera;
    config?: {
        currentGear?: string;
    };
}

export class DualClutch {
    public group: THREE.Group;
    private sceneContext: SceneContextMaterials;
    private isTransverse: boolean;

    // Dual Concentric Input Shafts
    private innerInputShaft: THREE.Mesh;
    private outerHollowShaft: THREE.Mesh;
    private innerShaftAngle = 0;
    private outerShaftAngle = 0;

    // Dual Clutch Packs K1 & K2
    private k1Drum: THREE.Group;
    private k2Drum: THREE.Group;
    private clutchHub: THREE.Mesh;

    // Two Output Shafts
    private outputShaft1: THREE.Mesh;
    private outputShaft2: THREE.Mesh;
    private outShaft1Angle = 0;
    private outShaft2Angle = 0;

    // Differential Crown Wheel
    private diffCrown: THREE.Mesh;
    private diffAngle = 0;

    // Gear Pairs
    private gearPairs: {
        gearName: string;
        shaftId: 1 | 2; // 1 = inner shaft (odd 1, 3, 5), 2 = outer hollow shaft (even 2, 4, 6, R)
        driveGear: THREE.Mesh;
        drivenGear: THREE.Mesh;
        idlerGear?: THREE.Mesh;
        zPos: number;
        ratio: number;
    }[] = [];

    // Shift Sleeves and Forks
    private sleeves: {
        mesh: THREE.Mesh;
        zPosNeutral: number;
        zPosEngagedFront: number;
        zPosEngagedBack: number;
        currentZ: number;
        targetZ: number;
        gears: [string | null, string | null];
        shaftId: 1 | 2;
    }[] = [];

    private shiftForks: {
        group: THREE.Group;
        sleeveIndex: number;
    }[] = [];

    // Shaft Center Distances
    private readonly dOut1X = -0.065;
    private readonly dOut1Y = -0.065;
    private readonly dOut2X = 0.065;
    private readonly dOut2Y = -0.065;
    private readonly dDiffX = 0.110;
    private readonly dDiffY = -0.110;

    constructor(sceneContext: SceneContextMaterials, isTransverse = true) {
        this.sceneContext = sceneContext;
        this.isTransverse = isTransverse;
        this.group = new THREE.Group();
        this.group.userData.name = "VW DSG Dual Clutch Transmission (DQ250 / DQ500 style)";

        this.buildDualClutchPack();
        this.buildConcentricShafts();
        this.buildGearsAndOutputShafts();
        this.buildMechatronicUnit();
        this.buildHousingAndDifferential();
    }

    private buildDualClutchPack() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });

        // Centralny zabierak od koła dwumasowego (Dual Mass Flywheel Input Hub)
        const hubGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.024, 24).rotateX(Math.PI / 2);
        this.clutchHub = new THREE.Mesh(hubGeo, matSteel);
        this.clutchHub.position.set(0, 0, -0.015);
        this.clutchHub.userData.name = "Zabierak wieloklinowy podwójnego sprzęgła DSG";
        this.group.add(this.clutchHub);

        // Kosz sprzęgła K1 (sprzęgło zewnętrzne, większa średnica, biegi nieparzyste 1, 3, 5)
        this.k1Drum = new THREE.Group();
        this.k1Drum.position.set(0, 0, -0.035);
        const k1OuterCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(0.098, 0.098, 0.032, 32, 1, true).rotateX(Math.PI / 2),
            matDark
        );
        k1OuterCylinder.userData.name = "Kosz zewnętrzny sprzęgła K1 (Biegi 1-3-5)";
        this.k1Drum.add(k1OuterCylinder);

        // Pakiet 4 tarcz ciernych i stalowych sprzęgła K1
        for (let d = 0; d < 4; d++) {
            const zOff = (d - 1.5) * 0.005;
            const plate = new THREE.Mesh(
                new THREE.CylinderGeometry(0.094, 0.094, 0.002, 28).rotateX(Math.PI / 2),
                d % 2 === 0 ? matBronze : matSteel
            );
            plate.position.set(0, 0, zOff);
            plate.userData.name = `Tarcza sprzęgła mokrego K1 #${d + 1}`;
            this.k1Drum.add(plate);
        }
        this.group.add(this.k1Drum);

        // Kosz sprzęgła K2 (sprzęgło wewnętrzne, mniejsza średnica, biegi parzyste 2, 4, 6, R)
        this.k2Drum = new THREE.Group();
        this.k2Drum.position.set(0, 0, -0.035);
        const k2OuterCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(0.072, 0.072, 0.026, 28, 1, true).rotateX(Math.PI / 2),
            matDark
        );
        k2OuterCylinder.userData.name = "Kosz wewnętrzny sprzęgła K2 (Biegi 2-4-6-R)";
        this.k2Drum.add(k2OuterCylinder);

        // Pakiet tarcz sprzęgła K2
        for (let d = 0; d < 3; d++) {
            const zOff = (d - 1.0) * 0.005;
            const plate = new THREE.Mesh(
                new THREE.CylinderGeometry(0.068, 0.068, 0.002, 24).rotateX(Math.PI / 2),
                d % 2 === 0 ? matBronze : matSteel
            );
            plate.position.set(0, 0, zOff);
            plate.userData.name = `Tarcza sprzęgła mokrego K2 #${d + 1}`;
            this.k2Drum.add(plate);
        }
        this.group.add(this.k2Drum);
    }

    private buildConcentricShafts() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });

        // 1. Zewnętrzny wałek drążony (Outer Hollow Shaft 2 - napędzany przez K2)
        // Obejmuje wałek wewnętrzny i sięga do kół zębatych biegów 2, 4, 6, R
        const hollowGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.14, 20).rotateX(Math.PI / 2);
        this.outerHollowShaft = new THREE.Mesh(hollowGeo, matDark);
        this.outerHollowShaft.position.set(0, 0, -0.12);
        this.outerHollowShaft.userData.name = "Zewnętrzny wałek sprzęgłowy drążony (K2 - Parzyste)";
        this.group.add(this.outerHollowShaft);

        // 2. Wewnętrzny wałek lity (Inner Solid Shaft 1 - napędzany przez K1)
        // Przechodzi przez wnętrze wałka drążonego i sięga głębiej do kół biegów 1, 3, 5
        const solidGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.30, 16).rotateX(Math.PI / 2);
        this.innerInputShaft = new THREE.Mesh(solidGeo, matSteel);
        this.innerInputShaft.position.set(0, 0, -0.20);
        this.innerInputShaft.userData.name = "Wewnętrzny wałek sprzęgłowy lity (K1 - Nieparzyste)";
        this.group.add(this.innerInputShaft);
    }

    private buildGearsAndOutputShafts() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });

        // Wałek zdawczy 1 (Output Shaft 1 - biegi 1, 2, 3, 4)
        const out1Geo = new THREE.CylinderGeometry(0.018, 0.018, 0.30, 16).rotateX(Math.PI / 2);
        this.outputShaft1 = new THREE.Mesh(out1Geo, matSteel);
        this.outputShaft1.position.set(this.dOut1X, this.dOut1Y, -0.20);
        this.outputShaft1.userData.name = "Wałek zdawczy 1 (Output Shaft 1: 1-4)";
        this.group.add(this.outputShaft1);

        // Wałek zdawczy 2 (Output Shaft 2 - biegi 5, 6, R, Park Lock)
        const out2Geo = new THREE.CylinderGeometry(0.018, 0.018, 0.30, 16).rotateX(Math.PI / 2);
        this.outputShaft2 = new THREE.Mesh(out2Geo, matSteel);
        this.outputShaft2.position.set(this.dOut2X, this.dOut2Y, -0.20);
        this.outputShaft2.userData.name = "Wałek zdawczy 2 (Output Shaft 2: 5-6-R)";
        this.group.add(this.outputShaft2);

        // Koła zębate zdawcze (Output Pinions) na obu wałkach napędzające koło talerzowe dyferencjału
        const pinion1 = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.024, 20).rotateX(Math.PI / 2), matBronze);
        pinion1.position.set(this.dOut1X, this.dOut1Y, -0.32);
        pinion1.userData.name = "Koło zębate zdawcze wałka 1 (Pinion 1)";
        this.group.add(pinion1);

        const pinion2 = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.024, 20).rotateX(Math.PI / 2), matBronze);
        pinion2.position.set(this.dOut2X, this.dOut2Y, -0.32);
        pinion2.userData.name = "Koło zębate zdawcze wałka 2 (Pinion 2)";
        this.group.add(pinion2);

        // Koło blokady parkingowej (Park Lock Gear) na wałku 2
        const parkLockGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.014, 12).rotateX(Math.PI / 2);
        const parkLock = new THREE.Mesh(parkLockGeo, matDark);
        parkLock.position.set(this.dOut2X, this.dOut2Y, -0.30);
        parkLock.userData.name = "Koło zębate zapadki blokady parkingowej (Park Lock)";
        this.group.add(parkLock);

        // Generowanie kół zębatych dla 6 biegów i biegu wstecznego
        const addDsgGearPair = (
            gearName: string,
            shaftId: 1 | 2,
            rDrive: number,
            rDriven: number,
            teethDrive: number,
            teethDriven: number,
            z: number,
            ratio: number,
            isReverse = false
        ) => {
            const outX = shaftId === 1 ? this.dOut1X : this.dOut2X;
            const outY = shaftId === 1 ? this.dOut1Y : this.dOut2Y;

            // Koło napędowe na wałku wejściowym (Drive Gear)
            const driveMesh = new THREE.Mesh(createGearGeometry(rDrive, 0.018, teethDrive, 0.25), matDark);
            driveMesh.position.set(0, 0, z);
            driveMesh.userData.name = `Koło napędowe DSG (Bieg ${gearName}, Wałek ${shaftId === 1 ? 'K1' : 'K2'})`;
            driveMesh.matrixAutoUpdate = false;
            driveMesh.updateMatrix();
            this.group.add(driveMesh);

            // Koło napędzane na wałku zdawczym (Driven Gear)
            let drivenMesh: THREE.Mesh;
            let idlerMesh: THREE.Mesh | undefined;

            if (isReverse) {
                drivenMesh = new THREE.Mesh(createGearGeometry(rDriven, 0.018, teethDriven, 0.25), matSteel);
                drivenMesh.position.set(outX, outY, z);
                drivenMesh.userData.name = "Koło załączane biegu wstecznego DSG";

                const rIdler = 0.022;
                idlerMesh = new THREE.Mesh(createGearGeometry(rIdler, 0.018, 12, 0), matBronze);
                idlerMesh.position.set(outX * 0.5, outY * 0.5 - 0.015, z);
                idlerMesh.userData.name = "Koło pośredniczące nawrotne biegu wstecznego DSG";
                idlerMesh.matrixAutoUpdate = false;
                idlerMesh.updateMatrix();
                this.group.add(idlerMesh);
            } else {
                drivenMesh = new THREE.Mesh(createGearGeometry(rDriven, 0.018, teethDriven, 0.25), matSteel);
                drivenMesh.position.set(outX, outY, z);
                drivenMesh.rotation.z = Math.PI / teethDriven;
                drivenMesh.userData.name = `Koło załączane DSG (Bieg ${gearName})`;
            }

            drivenMesh.matrixAutoUpdate = false;
            drivenMesh.updateMatrix();
            this.group.add(drivenMesh);

            // Synchronizator i pierścień stożkowy
            const syncRing = new THREE.Mesh(
                new THREE.CylinderGeometry(0.026, 0.030, 0.005, 18, 1, true).rotateX(Math.PI / 2),
                matBronze
            );
            syncRing.position.set(outX, outY, z + 0.011);
            syncRing.userData.name = `Pierścień synchronizatora DSG (Bieg ${gearName})`;
            this.group.add(syncRing);

            this.gearPairs.push({
                gearName,
                shaftId,
                driveGear: driveMesh,
                drivenGear: drivenMesh,
                idlerGear: idlerMesh,
                zPos: z,
                ratio
            });
        };

        // Zestopniowanie DSG (DQ250 / 6-Speed)
        // Biegi nieparzyste na wałku K1 (Shaft 1 -> OutShaft 1):
        addDsgGearPair('1', 1, 0.026, 0.066, 13, 33, -0.22, 3.46);
        addDsgGearPair('3', 1, 0.038, 0.054, 19, 27, -0.26, 1.46);
        addDsgGearPair('5', 1, 0.048, 0.044, 24, 22, -0.30, 0.85);

        // Biegi parzyste na wałku K2 (Shaft 2 drążony -> OutShaft 2):
        addDsgGearPair('2', 2, 0.032, 0.060, 16, 30, -0.10, 2.15);
        addDsgGearPair('4', 2, 0.044, 0.048, 22, 24, -0.14, 1.08);
        addDsgGearPair('6', 2, 0.052, 0.040, 26, 20, -0.18, 0.76);
        addDsgGearPair('R', 2, 0.030, 0.058, 15, 29, -0.06, -3.99, true);

        // Przesuwki synchronizatorów (Selector Sleeves) na wałkach zdawczych
        const createDsgSleeve = (
            zFront: number,
            zBack: number,
            gFront: string | null,
            gBack: string | null,
            shaftId: 1 | 2
        ) => {
            const outX = shaftId === 1 ? this.dOut1X : this.dOut2X;
            const outY = shaftId === 1 ? this.dOut1Y : this.dOut2Y;
            const zNeutral = (zFront + zBack) / 2;

            const mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.027, 0.027, 0.014, 20).rotateX(Math.PI / 2),
                matBronze
            );
            mesh.position.set(outX, outY, zNeutral);
            mesh.userData.name = `Przesuwka synchronizatora DSG (${gFront}/${gBack})`;
            this.group.add(mesh);

            const hub = new THREE.Mesh(
                new THREE.CylinderGeometry(0.021, 0.021, 0.010, 20).rotateX(Math.PI / 2),
                matDark
            );
            hub.position.set(outX, outY, zNeutral);
            hub.userData.name = `Piasta przesuwki DSG (${gFront}/${gBack})`;
            this.group.add(hub);

            this.sleeves.push({
                mesh,
                zPosNeutral: zNeutral,
                zPosEngagedFront: zFront - 0.008,
                zPosEngagedBack: zBack + 0.008,
                currentZ: zNeutral,
                targetZ: zNeutral,
                gears: [gFront, gBack],
                shaftId
            });
        };

        createDsgSleeve(-0.22, -0.26, '1', '3', 1);
        createDsgSleeve(-0.10, -0.14, '2', '4', 2);
        createDsgSleeve(-0.18, -0.06, '6', 'R', 2);

        // Widłaki wybieraków hydraulicznych mechatroniki (Hydraulic Shift Forks)
        this.sleeves.forEach((sleeve, idx) => {
            const forkGroup = new THREE.Group();
            const outX = sleeve.shaftId === 1 ? this.dOut1X : this.dOut2X;
            const outY = sleeve.shaftId === 1 ? this.dOut1Y : this.dOut2Y;
            forkGroup.position.set(outX, outY, sleeve.zPosNeutral);

            const forkArm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.040, 0.010), matSteel);
            forkArm.position.set(0, 0.024, 0);
            forkArm.userData.name = `Ramię widłaka hydraulicznego DSG #${idx + 1}`;
            forkGroup.add(forkArm);

            const forkTorus = new THREE.Mesh(
                new THREE.TorusGeometry(0.029, 0.004, 8, 16, Math.PI).rotateZ(Math.PI),
                matSteel
            );
            forkTorus.userData.name = `Uchwyt widłaka przesuwki #${idx + 1}`;
            forkGroup.add(forkTorus);

            this.group.add(forkGroup);
            this.shiftForks.push({ group: forkGroup, sleeveIndex: idx });
        });
    }

    private buildMechatronicUnit() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        const mechaGroup = new THREE.Group();
        mechaGroup.position.set(0, 0.080, -0.18);

        // Aluminiowy korpus mechatroniki z pompą oleju i filtrem (Mechatronic Housing)
        const blockGeo = new THREE.BoxGeometry(0.18, 0.038, 0.28);
        const block = new THREE.Mesh(blockGeo, matDark);
        block.userData.name = "Moduł elektrohydrauliczny Mechatronik DSG (DQ250)";
        mechaGroup.add(block);

        // Elektrozawory ciśnienia oleju i sprzęgieł K1/K2 (Solenoids N215, N216 etc.)
        const solColors = [0x2563eb, 0xd97706, 0x16a34a, 0xdc2626, 0x9333ea, 0x0891b2];
        solColors.forEach((color, idx) => {
            const solMat = new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.2 });
            const solGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.022, 16);
            const sol = new THREE.Mesh(solGeo, solMat);
            sol.position.set(-0.060 + (idx % 2) * 0.120, 0.016, -0.090 + idx * 0.034);
            sol.userData.name = `Elektrozawór ciśnieniowy mechatroniki DSG #${idx + 1}`;
            mechaGroup.add(sol);
        });

        // Komputer sterujący skrzynią (TCU - Transmission Control Unit)
        const tcu = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.010, 0.08), matSteel);
        tcu.position.set(0, 0.022, 0.08);
        tcu.userData.name = "Elektroniczny sterownik pokładowy skrzyni TCU (DSG)";
        mechaGroup.add(tcu);

        this.group.add(mechaGroup);
    }

    private buildHousingAndDifferential() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Koło talerzowe dyferencjału transaxle (Differential Crown Wheel)
        const crownGeo = new THREE.CylinderGeometry(0.086, 0.086, 0.024, 32).rotateX(Math.PI / 2);
        this.diffCrown = new THREE.Mesh(crownGeo, matSteel);
        this.diffCrown.position.set(this.dDiffX, this.dDiffY, -0.32);
        this.diffCrown.userData.name = "Koło talerzowe dyferencjału transaxle DSG";
        this.group.add(this.diffCrown);

        // Obudowa mechanizmu różnicowego
        const diffBody = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 16), matDark);
        diffBody.position.set(this.dDiffX, this.dDiffY, -0.32);
        diffBody.userData.name = "Kosz mechanizmu różnicowego z satelitami stożkowymi";
        this.group.add(diffBody);

        // Aluminiowy dzwon skrzyni (Bellhousing)
        const bellGeo = new THREE.CylinderGeometry(0.17, 0.23, 0.07, 24, 1, true).rotateX(Math.PI / 2);
        const bell = new THREE.Mesh(bellGeo, matDark);
        bell.position.set(0, -0.02, -0.035);
        bell.userData.name = "Dzwon skrzyni dwusprzęgłowej DSG";
        this.group.add(bell);

        // Korpus cutaway (Cutaway Transmission Casing) w stylu technicznym
        const caseGeo = new THREE.BoxGeometry(0.24, 0.24, 0.34);
        const caseWire = new THREE.LineSegments(
            new THREE.EdgesGeometry(caseGeo),
            this.sceneContext.crankcaseLineMat || new THREE.LineBasicMaterial({ color: 0x475569 })
        );
        caseWire.position.set(0.02, -0.04, -0.20);
        caseWire.userData.name = "Korpus skrzyni DSG (Zarys przekroju technicznego)";
        this.group.add(caseWire);

        // Żebra usztywniające obudowy
        for (let r = 0; r < 3; r++) {
            const ribRing = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.BoxGeometry(0.245, 0.245, 0.008)),
                this.sceneContext.crankcaseLineMat || new THREE.LineBasicMaterial({ color: 0x64748b })
            );
            ribRing.position.set(0.02, -0.04, -0.10 - r * 0.10);
            ribRing.userData.name = "Żebro usztywniające odlewu skrzyni DSG";
            this.group.add(ribRing);
        }
    }

    public updateKinematics(dt: number, inputSpeed: number, currentGear: string): number {
        let ANIMATE = false;
        if (this.sceneContext && this.sceneContext.camera) {
            const worldPos = new THREE.Vector3();
            this.group.getWorldPosition(worldPos);
            ANIMATE = this.sceneContext.camera.position.distanceTo(worldPos) < 2.5;
        }

        // Zabierak zawsze obraca się z wałem korbowym
        if (ANIMATE) this.clutchHub.rotation.z += inputSpeed * dt;

        // Określenie stanu sprzęgieł K1 i K2 w zależności od wybranego biegu
        // Odd gears (1, 3, 5) -> K1 engaged
        // Even gears (2, 4, 6, R) -> K2 engaged
        // N -> both disengaged
        const isOdd = ['1', '3', '5'].includes(currentGear);
        const isEven = ['2', '4', '6', 'R'].includes(currentGear);
        const isNeutral = currentGear === 'N';

        const k1Speed = (isOdd && !isNeutral) ? inputSpeed : (isNeutral ? 0 : inputSpeed * 0.05);
        const k2Speed = (isEven && !isNeutral) ? inputSpeed : (isNeutral ? 0 : inputSpeed * 0.05);

        this.innerShaftAngle += k1Speed * dt;
        this.outerShaftAngle += k2Speed * dt;

        if (ANIMATE) {
            this.k1Drum.rotation.z = this.innerShaftAngle;
            this.innerInputShaft.rotation.z = this.innerShaftAngle;

            this.k2Drum.rotation.z = this.outerShaftAngle;
            this.outerHollowShaft.rotation.z = this.outerShaftAngle;
        }

        // Aktualizacja położeń przesuwek i widłaków zmiany biegów
        for (let i = 0; i < this.sleeves.length; i++) {
            const sleeve = this.sleeves[i];
            if (currentGear === sleeve.gears[0]) {
                sleeve.targetZ = sleeve.zPosEngagedFront;
            } else if (currentGear === sleeve.gears[1]) {
                sleeve.targetZ = sleeve.zPosEngagedBack;
            } else {
                sleeve.targetZ = sleeve.zPosNeutral;
            }
            sleeve.currentZ += (sleeve.targetZ - sleeve.currentZ) * 16 * dt;
            sleeve.mesh.position.z = sleeve.currentZ;

            const fork = this.shiftForks[i];
            if (fork) fork.group.position.z = sleeve.currentZ;
        }

        let outputSpeed = 0;

        for (const pair of this.gearPairs) {
            const shaftSpeed = pair.shaftId === 1 ? k1Speed : k2Speed;
            const shaftAngle = pair.shaftId === 1 ? this.innerShaftAngle : this.outerShaftAngle;

            if (ANIMATE) {
                pair.driveGear.rotation.z = shaftAngle;
                pair.driveGear.updateMatrix();
            }

            let drivenSpeed = 0;
            if (pair.idlerGear) {
                const idlerSpeed = -shaftSpeed * 1.35;
                if (ANIMATE) {
                    pair.idlerGear.rotation.z += idlerSpeed * dt;
                    pair.idlerGear.updateMatrix();
                }
                drivenSpeed = -idlerSpeed * 0.75;
            } else {
                drivenSpeed = -shaftSpeed / (pair.ratio === 0 ? 1 : Math.abs(pair.ratio));
            }

            if (ANIMATE) {
                pair.drivenGear.rotation.z += drivenSpeed * dt;
                pair.drivenGear.updateMatrix();
            }

            if (currentGear === pair.gearName) {
                outputSpeed = drivenSpeed;
            }
        }

        if (isNeutral) {
            outputSpeed = 0;
        }

        if (ANIMATE) {
            this.outShaft1Angle += outputSpeed * dt;
            this.outShaft2Angle += outputSpeed * dt;
            this.outputShaft1.rotation.z = this.outShaft1Angle;
            this.outputShaft2.rotation.z = this.outShaft2Angle;

            const diffSpeed = outputSpeed * (0.030 / 0.086);
            this.diffAngle += diffSpeed * dt;
            this.diffCrown.rotation.z = this.diffAngle;
        }

        return outputSpeed;
    }
}
