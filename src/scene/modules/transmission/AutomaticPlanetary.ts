import * as THREE from 'three';
import { createGearGeometry } from './GearGenerator.js';

class PlanetaryGearset {
    public group: THREE.Group;
    public sun: THREE.Mesh;
    public carrier: THREE.Group;
    public ring: THREE.Mesh;
    private planets: THREE.Mesh[] = [];

    public rSun: number;
    public rPlanet: number;
    public rRing: number;

    constructor(rSun: number, rPlanet: number, zPos: number, matSteel: any, matBronze: any, matDark: any, namePrefix = "Planetary Set") {
        this.group = new THREE.Group();
        this.group.position.z = zPos;
        this.group.userData.name = namePrefix;
        
        this.rSun = rSun;
        this.rPlanet = rPlanet;
        this.rRing = rSun + 2 * rPlanet;

        const module = 0.002;
        const zSun = Math.round(2 * rSun / module);
        const zPlanet = Math.round(2 * rPlanet / module);
        const zRing = Math.round(2 * this.rRing / module);

        // Koło słoneczne (Sun Gear)
        this.sun = new THREE.Mesh(createGearGeometry(rSun, 0.02, zSun, 0.35), matSteel);
        this.sun.userData.name = `Koło słoneczne (${namePrefix})`;
        this.group.add(this.sun);

        // Jarzmo satelitów (Planet Carrier)
        this.carrier = new THREE.Group();
        this.carrier.userData.name = `Jarzmo satelitów (${namePrefix})`;
        this.group.add(this.carrier);
        
        const carrierFrontPlate = new THREE.Mesh(new THREE.CylinderGeometry(this.rRing - 0.006, this.rRing - 0.006, 0.005, 32).rotateX(Math.PI/2), matDark);
        carrierFrontPlate.position.z = 0.014;
        carrierFrontPlate.userData.name = `Tarcza przednia jarzma (${namePrefix})`;
        this.carrier.add(carrierFrontPlate);

        const carrierBackPlate = new THREE.Mesh(new THREE.CylinderGeometry(this.rRing - 0.006, this.rRing - 0.006, 0.005, 32).rotateX(Math.PI/2), matDark);
        carrierBackPlate.position.z = -0.014;
        carrierBackPlate.userData.name = `Tarcza tylna jarzma (${namePrefix})`;
        this.carrier.add(carrierBackPlate);

        // Satelity (Planet Gears) - 4 koła obiegowe
        const numPlanets = 4;
        for (let i = 0; i < numPlanets; i++) {
            const angle = (i * Math.PI * 2) / numPlanets;
            const planet = new THREE.Mesh(createGearGeometry(rPlanet, 0.02, zPlanet, 0.25), matBronze);
            
            const rCenter = rSun + rPlanet;
            planet.position.set(Math.cos(angle) * rCenter, Math.sin(angle) * rCenter, 0);
            planet.userData.name = `Koło obiegowe satelity #${i+1} (${namePrefix})`;
            
            this.planets.push(planet);
            this.carrier.add(planet);

            // Sworzeń satelity (Planet Pin)
            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.032, 12).rotateX(Math.PI/2), matSteel);
            pin.position.set(Math.cos(angle) * rCenter, Math.sin(angle) * rCenter, 0);
            pin.userData.name = `Sworzeń satelity #${i+1} (${namePrefix})`;
            this.carrier.add(pin);
        }

        // Koło koronowe o uzębieniu wewnętrznym (Annulus Ring Gear)
        const ringGeom = this.createInternalGearGeometry(this.rRing, 0.024, zRing, 0.009);
        this.ring = new THREE.Mesh(ringGeom, matSteel);
        this.ring.userData.name = `Koło koronowe o uzębieniu wewnętrznym (${namePrefix})`;
        this.group.add(this.ring);
    }

    private createInternalGearGeometry(pitchRadius: number, thickness: number, numTeeth: number, wallThickness: number) {
        const shape = new THREE.Shape();
        const outerRadius = pitchRadius + wallThickness;
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

        const module = (2 * pitchRadius) / numTeeth;
        const rootRadius = pitchRadius + 1.25 * module;
        const innerRadius = pitchRadius - module;

        const holePath = new THREE.Path();
        const anglePerTooth = (Math.PI * 2) / numTeeth;

        for (let i = 0; i < numTeeth; i++) {
            const startAngle = i * anglePerTooth;
            const midAngle1 = startAngle + anglePerTooth * 0.25;
            const midAngle2 = startAngle + anglePerTooth * 0.75;
            const endAngle = startAngle + anglePerTooth;

            if (i === 0) {
                holePath.moveTo(rootRadius * Math.cos(startAngle), rootRadius * Math.sin(startAngle));
            } else {
                holePath.lineTo(rootRadius * Math.cos(startAngle), rootRadius * Math.sin(startAngle));
            }
            
            holePath.lineTo(innerRadius * Math.cos(midAngle1), innerRadius * Math.sin(midAngle1));
            holePath.lineTo(innerRadius * Math.cos(midAngle2), innerRadius * Math.sin(midAngle2));
            holePath.lineTo(rootRadius * Math.cos(endAngle), rootRadius * Math.sin(endAngle));
        }
        shape.holes.push(holePath);

        return new THREE.ExtrudeGeometry(shape, {
            depth: thickness,
            bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.001, bevelThickness: 0.001
        }).center();
    }

    public updateKinematics(dt: number, wSun: number, wCarrier: number, wRing: number) {
        this.sun.rotation.z += wSun * dt;
        this.carrier.rotation.z += wCarrier * dt;
        this.ring.rotation.z += wRing * dt;

        for (const planet of this.planets) {
            const wPlanetRel = -(wSun - wCarrier) * (this.rSun / this.rPlanet);
            planet.rotation.z += wPlanetRel * dt;
        }
    }
}

export class AutomaticPlanetary {
    public group: THREE.Group;
    private sceneContext: any;
    
    // Torque Converter
    private tcImpellerGroup: THREE.Group;
    private tcTurbineGroup: THREE.Group;
    private tcStatorGroup: THREE.Group;

    // Planetary gearsets
    private p1: PlanetaryGearset;
    private p2: PlanetaryGearset;
    private p3: PlanetaryGearset;

    private inputAngle = 0;
    private turbineAngle = 0;

    constructor(sceneContext: any) {
        this.sceneContext = sceneContext;
        this.group = new THREE.Group();
        this.group.userData.name = "Automatic Planetary Gearbox (ZF 8HP style)";

        this.buildTorqueConverter();
        this.buildPlanetaryGearsets();
        this.buildClutchPacks();
        this.buildMechatronicUnit();
        this.buildTransmissionCasing();
    }

    private buildTorqueConverter() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });
        const matGold = this.sceneContext.matGold || new THREE.MeshStandardMaterial({ color: 0xf59e0b });

        // 1. Pompa konwertera (Impeller) napędzana z koła zamachowego
        this.tcImpellerGroup = new THREE.Group();
        this.tcImpellerGroup.position.z = -0.05;

        const impellerBowl = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.038, 16, 32, Math.PI), matDark);
        impellerBowl.userData.name = "Obudowa pompy konwertera (Impeller)";
        this.tcImpellerGroup.add(impellerBowl);

        // Łopatki wirnika pompy (Pump Vanes)
        const numPumpBlades = 12;
        for (let i = 0; i < numPumpBlades; i++) {
            const angle = (i * Math.PI) / numPumpBlades;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.034, 0.016), matSteel);
            blade.position.set(Math.cos(angle) * 0.11, Math.sin(angle) * 0.11, 0);
            blade.rotation.z = angle + Math.PI / 4;
            blade.userData.name = `Łopatka pompy konwertera #${i+1}`;
            this.tcImpellerGroup.add(blade);
        }
        this.group.add(this.tcImpellerGroup);

        // 2. Turbina konwertera (Turbine Runner) połączona z wałkiem wejściowym
        this.tcTurbineGroup = new THREE.Group();
        this.tcTurbineGroup.position.z = -0.05;

        const turbineBowl = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.034, 16, 32, Math.PI), matSteel);
        turbineBowl.rotation.z = Math.PI;
        turbineBowl.userData.name = "Wirnik turbiny konwertera (Turbine Runner)";
        this.tcTurbineGroup.add(turbineBowl);

        // Łopatki turbiny (Turbine Vanes) o przeciwnym zakrzywieniu
        for (let i = 0; i < numPumpBlades; i++) {
            const angle = Math.PI + (i * Math.PI) / numPumpBlades;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.030, 0.015), matBronze);
            blade.position.set(Math.cos(angle) * 0.10, Math.sin(angle) * 0.10, 0);
            blade.rotation.z = angle - Math.PI / 4;
            blade.userData.name = `Łopatka turbiny konwertera #${i+1}`;
            this.tcTurbineGroup.add(blade);
        }
        this.group.add(this.tcTurbineGroup);

        // 3. Kierownica strumienia (Stator) ze sprzęgłem jednokierunkowym (Sprag Clutch)
        this.tcStatorGroup = new THREE.Group();
        this.tcStatorGroup.position.z = -0.05;

        const statorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.022, 24).rotateX(Math.PI/2), matDark);
        statorHub.userData.name = "Piasta kierownicy strumienia (Stator Hub)";
        this.tcStatorGroup.add(statorHub);

        const statorVaneRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 12, 24), matGold);
        statorVaneRing.userData.name = "Wieniec łopatek kierownicy (Stator Aerofoils)";
        this.tcStatorGroup.add(statorVaneRing);
        this.group.add(this.tcStatorGroup);

        // 4. Sprzęgło blokujące konwerter (Lock-up Clutch Plate)
        const lockupPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.004, 32).rotateX(Math.PI/2), matBronze);
        lockupPlate.position.set(0, 0, -0.025);
        lockupPlate.userData.name = "Tarcza sprzęgła blokady lock-up ze sprężynami tłumiącymi";
        this.group.add(lockupPlate);

        // Wałek turbiny (Turbine Shaft) biegnący do przekładni planetarnych
        const turbineShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 16).rotateX(Math.PI/2), matSteel);
        turbineShaft.position.set(0, 0, -0.22);
        turbineShaft.userData.name = "Wałek wejściowy turbiny konwertera";
        this.group.add(turbineShaft);
    }

    private buildPlanetaryGearsets() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial();
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial();
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial();

        // 3 zespoły przekładni planetarnych odpowiadające architekturze ZF 8HP
        this.p1 = new PlanetaryGearset(0.030, 0.018, -0.14, matSteel, matBronze, matDark, "Zespół Planetarny 1 (Przedni)");
        this.group.add(this.p1.group);

        this.p2 = new PlanetaryGearset(0.036, 0.015, -0.23, matSteel, matBronze, matDark, "Zespół Planetarny 2 (Środkowy)");
        this.group.add(this.p2.group);

        this.p3 = new PlanetaryGearset(0.040, 0.014, -0.32, matSteel, matBronze, matDark, "Zespół Planetarny 3 (Tylny)");
        this.group.add(this.p3.group);
    }

    private buildClutchPacks() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Mokre sprzęgła wielopłytkowe (Multi-Plate Clutch Packs A i B)
        [-0.185, -0.275].forEach((clutchZ, idx) => {
            const drumGeo = new THREE.CylinderGeometry(0.076, 0.076, 0.032, 28, 1, true).rotateX(Math.PI/2);
            const drum = new THREE.Mesh(drumGeo, matDark);
            drum.position.set(0, 0, clutchZ);
            drum.userData.name = `Kosz sprzęgła mokrego #${idx+1} (Clutch Drum)`;
            this.group.add(drum);

            // Pakiet tarcz ciernych i przekładek stalowych
            for (let d = 0; d < 4; d++) {
                const zOffset = (d - 1.5) * 0.005;
                const plateMat = (d % 2 === 0) ? matBronze : matSteel;
                const plateGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.002, 24).rotateX(Math.PI/2);
                const plate = new THREE.Mesh(plateGeo, plateMat);
                plate.position.set(0, 0, clutchZ + zOffset);
                plate.userData.name = `Tarcza sprzęgła wielopłytkowego #${d+1} (${(d % 2 === 0) ? 'Cierna' : 'Stalowa'})`;
                this.group.add(plate);
            }
        });
    }

    private buildMechatronicUnit() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        const mechaGroup = new THREE.Group();
        mechaGroup.position.set(0, -0.11, -0.23);

        // Aluminiowa płyta zaworowa z labiryntem kanałów hydraulicznych (Valve Body)
        const plateGeo = new THREE.BoxGeometry(0.14, 0.024, 0.32);
        const valvePlate = new THREE.Mesh(plateGeo, matDark);
        valvePlate.userData.name = "Płyta hydrauliczna sterownika mechatroniki (Valve Body)";
        mechaGroup.add(valvePlate);

        // Rząd elektrozaworów ciśnienia i zmiany biegów (Solenoids)
        const solColors = [0x2563eb, 0xd97706, 0x16a34a, 0xdc2626, 0x9333ea, 0x0891b2];
        solColors.forEach((color, idx) => {
            const solMat = new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.2 });
            const solGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.024, 16);
            const sol = new THREE.Mesh(solGeo, solMat);
            sol.position.set(-0.045 + (idx % 2) * 0.09, -0.018, -0.11 + idx * 0.042);
            sol.userData.name = `Elektrozawór sterujący mechatroniki #${idx+1} (Solenoid EDS)`;
            mechaGroup.add(sol);
        });

        // Moduł sterownika elektronicznego (TCU / ECU)
        const tcuBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.08), matSteel);
        tcuBox.position.set(0, -0.020, 0.10);
        tcuBox.userData.name = "Komputer pokładowy skrzyni biegów (TCU/Mechatronic Module)";
        mechaGroup.add(tcuBox);

        this.group.add(mechaGroup);
    }

    private buildTransmissionCasing() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Dzwon konwertera
        const bellGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.10, 24, 1, true).rotateX(Math.PI/2);
        const bellMesh = new THREE.Mesh(bellGeo, matDark);
        bellMesh.position.set(0, 0, -0.05);
        bellMesh.userData.name = "Obudowa dzwonu konwertera automatycznej skrzyni";
        this.group.add(bellMesh);

        // Zarys przekroju obudowy skrzyni automatycznej (Cutaway Housing)
        const caseGeo = new THREE.BoxGeometry(0.20, 0.23, 0.36);
        const caseWire = new THREE.LineSegments(
            new THREE.EdgesGeometry(caseGeo),
            this.sceneContext.crankcaseLineMat || new THREE.LineBasicMaterial({ color: 0x475569 })
        );
        caseWire.position.set(0, -0.03, -0.24);
        caseWire.userData.name = "Korpus skrzyni automatycznej ZF (Zarys przekroju)";
        this.group.add(caseWire);

        // Miska olejowa (Oil Pan) na spodzie skrzyni
        const panGeo = new THREE.BoxGeometry(0.16, 0.035, 0.34);
        const oilPan = new THREE.Mesh(panGeo, matDark);
        oilPan.position.set(0, -0.14, -0.24);
        oilPan.userData.name = "Miska olejowa skrzyni automatycznej z filtrem hydraulicznym";
        this.group.add(oilPan);

        // Flansza zdawcza wału napędowego (Output Flange)
        const flangeGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.018, 24).rotateX(Math.PI/2);
        const outFlange = new THREE.Mesh(flangeGeo, matSteel);
        outFlange.position.set(0, 0, -0.44);
        outFlange.userData.name = "Flansza zdawcza skrzyni automatycznej";
        this.group.add(outFlange);
    }

    public updateKinematics(dt: number, engineSpeed: number, currentGear: string): number {
        let ANIMATE = false;
        if (this.sceneContext && this.sceneContext.camera) {
            const worldPos = new THREE.Vector3();
            this.group.getWorldPosition(worldPos);
            ANIMATE = this.sceneContext.camera.position.distanceTo(worldPos) < 2.5;
        }

        this.inputAngle += engineSpeed * dt;
        if (ANIMATE) this.tcImpellerGroup.rotation.z = this.inputAngle;

        const lockup = currentGear !== '1' && currentGear !== 'R' && currentGear !== 'N'; 
        const slip = lockup ? 1.0 : 0.85;
        const turbineSpeed = engineSpeed * slip;
        
        this.turbineAngle += turbineSpeed * dt;
        if (ANIMATE) this.tcTurbineGroup.rotation.z = this.turbineAngle;

        const statorSpeed = lockup ? turbineSpeed : 0;
        if (ANIMATE) this.tcStatorGroup.rotation.z += statorSpeed * dt;

        let wOut = 0;

        if (currentGear === '1') {
            const wSun1 = turbineSpeed;
            const wRing1 = 0;
            const wCarrier1 = (wSun1 * this.p1.rSun + wRing1 * this.p1.rRing) / (this.p1.rSun + this.p1.rRing);
            if (ANIMATE) {
                this.p1.updateKinematics(dt, wSun1, wCarrier1, wRing1);
                this.p2.updateKinematics(dt, wCarrier1, wCarrier1 * 0.6, 0);
                this.p3.updateKinematics(dt, wCarrier1 * 0.6, wCarrier1 * 0.4, 0);
            }
            wOut = wCarrier1;
        } else if (currentGear === '2') {
            const wSun1 = turbineSpeed;
            const wRing1 = turbineSpeed * 0.5;
            const wCarrier1 = (wSun1 * this.p1.rSun + wRing1 * this.p1.rRing) / (this.p1.rSun + this.p1.rRing);
            if (ANIMATE) {
                this.p1.updateKinematics(dt, wSun1, wCarrier1, wRing1);
                this.p2.updateKinematics(dt, wCarrier1, wCarrier1 * 0.7, 0);
                this.p3.updateKinematics(dt, wCarrier1 * 0.7, wCarrier1 * 0.5, 0);
            }
            wOut = wCarrier1;
        } else if (currentGear === 'R') {
            const wSun1 = turbineSpeed;
            const wCarrier1 = 0;
            const wRing1 = -wSun1 * (this.p1.rSun / this.p1.rRing);
            if (ANIMATE) {
                this.p1.updateKinematics(dt, wSun1, wCarrier1, wRing1);
                this.p2.updateKinematics(dt, wRing1, wRing1, wRing1);
                this.p3.updateKinematics(dt, wRing1, wRing1, wRing1);
            }
            wOut = wRing1;
        } else if (currentGear === 'N') {
            if (ANIMATE) {
                this.p1.updateKinematics(dt, turbineSpeed, 0, 0);
                this.p2.updateKinematics(dt, 0, 0, 0);
                this.p3.updateKinematics(dt, 0, 0, 0);
            }
            wOut = 0;
        } else {
            if (ANIMATE) {
                this.p1.updateKinematics(dt, turbineSpeed, turbineSpeed, turbineSpeed);
                this.p2.updateKinematics(dt, turbineSpeed, turbineSpeed, turbineSpeed);
                this.p3.updateKinematics(dt, turbineSpeed, turbineSpeed, turbineSpeed);
            }
            wOut = turbineSpeed;
        }
        return wOut;
    }
}
