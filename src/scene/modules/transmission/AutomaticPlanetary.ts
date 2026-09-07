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

    constructor(rSun: number, rPlanet: number, zPos: number, matSteel: any, matBronze: any, matDark: any) {
        this.group = new THREE.Group();
        this.group.position.z = zPos;
        
        this.rSun = rSun;
        this.rPlanet = rPlanet;
        this.rRing = rSun + 2 * rPlanet;

        // Note: Number of teeth must be proportional to radius to mesh properly.
        // Let's assume module m = 2*r / z  => z = 2*r / m
        // We'll use a constant module across the gearset.
        const module = 0.002;
        const zSun = Math.round(2 * rSun / module);
        const zPlanet = Math.round(2 * rPlanet / module);
        const zRing = Math.round(2 * this.rRing / module);

        // Sun
        this.sun = new THREE.Mesh(createGearGeometry(rSun, 0.02, zSun, 0.4), matSteel);
        this.group.add(this.sun);

        // Carrier
        this.carrier = new THREE.Group();
        this.group.add(this.carrier);
        
        const carrierPlate = new THREE.Mesh(new THREE.CylinderGeometry(this.rRing - 0.005, this.rRing - 0.005, 0.005, 32).rotateX(Math.PI/2), matDark);
        carrierPlate.position.z = -0.015;
        this.carrier.add(carrierPlate);

        // Planets (usually 3 or 4)
        const numPlanets = 4;
        for (let i = 0; i < numPlanets; i++) {
            const angle = (i * Math.PI * 2) / numPlanets;
            const planet = new THREE.Mesh(createGearGeometry(rPlanet, 0.02, zPlanet, 0.2), matBronze);
            
            const rCenter = rSun + rPlanet;
            planet.position.set(Math.cos(angle) * rCenter, Math.sin(angle) * rCenter, 0);
            
            // Initial mesh rotation logic
            // The teeth should mesh with sun and ring.
            
            this.planets.push(planet);
            this.carrier.add(planet);

            // Planet pin
            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 8).rotateX(Math.PI/2), matSteel);
            pin.position.set(Math.cos(angle) * rCenter, Math.sin(angle) * rCenter, -0.01);
            this.carrier.add(pin);
        }

        // Ring (internal gear)
        // Since createGearGeometry creates an external gear, we need to create an internal one.
        // For visual purposes, we can create a tube and subtract a gear, or just a thick tube with small inward teeth.
        const ringGeom = this.createInternalGearGeometry(this.rRing, 0.025, zRing, 0.01);
        this.ring = new THREE.Mesh(ringGeom, matSteel);
        this.group.add(this.ring);
    }

    private createInternalGearGeometry(pitchRadius: number, thickness: number, numTeeth: number, wallThickness: number) {
        const shape = new THREE.Shape();
        const outerRadius = pitchRadius + wallThickness;
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

        const module = (2 * pitchRadius) / numTeeth;
        const rootRadius = pitchRadius + 1.25 * module; // Root is further out
        const innerRadius = pitchRadius - module;       // Tooth tip is further in

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

    // Kinematic constraint: w_sun * R_sun + w_ring * R_ring = w_carrier * (R_sun + R_ring)
    // If we know 2 speeds, we can calculate the 3rd.
    // Also, w_planet can be derived.
    public updateKinematics(dt: number, wSun: number, wCarrier: number, wRing: number) {
        this.sun.rotation.z += wSun * dt;
        this.carrier.rotation.z += wCarrier * dt;
        this.ring.rotation.z += wRing * dt;

        // Relative speed of planet wrt carrier
        // v_sun_contact = w_sun * R_sun
        // v_carrier = w_carrier * R_center
        // w_planet_relative = (v_sun_contact - v_carrier) / R_planet ?? No, standard formula:
        // w_planet_absolute = w_carrier - (w_sun - w_carrier) * (R_sun / R_planet)
        const wPlanetAbs = wCarrier - (wSun - wCarrier) * (this.rSun / this.rPlanet);
        
        for (const planet of this.planets) {
            // Because planet is child of carrier, its rotation is relative to carrier.
            // w_planet_relative = w_planet_abs - w_carrier
            const wPlanetRel = -(wSun - wCarrier) * (this.rSun / this.rPlanet);
            planet.rotation.z += wPlanetRel * dt;
        }
    }
}

export class AutomaticPlanetary {
    public group: THREE.Group;
    private sceneContext: any;
    
    // Torque Converter
    private tcImpeller: THREE.Mesh;
    private tcTurbine: THREE.Mesh;
    private tcStator: THREE.Mesh;

    // Planets
    private p1: PlanetaryGearset;
    private p2: PlanetaryGearset;

    private inputAngle = 0;
    private turbineAngle = 0;

    constructor(sceneContext: any) {
        this.sceneContext = sceneContext;
        this.group = new THREE.Group();
        this.group.userData.name = "Automatic Gearbox (ZF style)";

        this.buildTorqueConverter();
        this.buildPlanetaryGearsets();
    }

    private buildTorqueConverter() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial({ color: 0xd97706 });
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Impeller (Pump) attached to engine
        this.tcImpeller = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 16, 32, Math.PI), matDark); // Half torus for cutaway
        this.tcImpeller.position.z = -0.05;
        this.group.add(this.tcImpeller);

        // Turbine attached to input shaft
        this.tcTurbine = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.035, 16, 32, Math.PI), matSteel);
        this.tcTurbine.position.z = -0.05;
        this.tcTurbine.rotation.z = Math.PI; // Opposite half
        this.group.add(this.tcTurbine);

        // Stator
        this.tcStator = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 16, 32), matBronze);
        this.tcStator.position.z = -0.05;
        this.group.add(this.tcStator);
    }

    private buildPlanetaryGearsets() {
        const matSteel = this.sceneContext.matSteel || new THREE.MeshStandardMaterial();
        const matBronze = this.sceneContext.matBronze || new THREE.MeshStandardMaterial();
        const matDark = this.sceneContext.matDarkSteel || new THREE.MeshStandardMaterial();

        // 2 planetary sets for demonstration (a real 8HP has 4 sets and 5 clutches, but we'll simplify visual representation while keeping math strict)
        this.p1 = new PlanetaryGearset(0.03, 0.02, -0.15, matSteel, matBronze, matDark);
        this.group.add(this.p1.group);

        this.p2 = new PlanetaryGearset(0.04, 0.015, -0.25, matSteel, matBronze, matDark);
        this.group.add(this.p2.group);
    }

    public updateKinematics(dt: number, engineSpeed: number, currentGear: string): number {
        let ANIMATE = false;
        if (this.sceneContext && this.sceneContext.camera) {
            const worldPos = new THREE.Vector3();
            this.group.getWorldPosition(worldPos);
            ANIMATE = this.sceneContext.camera.position.distanceTo(worldPos) < 2.5;
        }

        this.inputAngle += engineSpeed * dt;
        if (ANIMATE) this.tcImpeller.rotation.z = this.inputAngle;

        const lockup = currentGear !== '1' && currentGear !== 'R' && currentGear !== 'N'; 
        const slip = lockup ? 1.0 : 0.85;
        const turbineSpeed = engineSpeed * slip;
        
        this.turbineAngle += turbineSpeed * dt;
        if (ANIMATE) this.tcTurbine.rotation.z = this.turbineAngle;

        const statorSpeed = lockup ? turbineSpeed : 0;
        if (ANIMATE) this.tcStator.rotation.z += statorSpeed * dt;

        let wOut = 0;

        if (currentGear === '1') {
            const wSun1 = turbineSpeed;
            const wRing1 = 0;
            const wCarrier1 = (wSun1 * this.p1.rSun + wRing1 * this.p1.rRing) / (this.p1.rSun + this.p1.rRing);
            if (ANIMATE) this.p1.updateKinematics(dt, wSun1, wCarrier1, wRing1);
            wOut = wCarrier1;
            if (ANIMATE) this.p2.updateKinematics(dt, wOut, wOut, wOut); 
        } else if (currentGear === '2') {
            const wSun1 = turbineSpeed;
            const wRing1 = turbineSpeed * 0.5;
            const wCarrier1 = (wSun1 * this.p1.rSun + wRing1 * this.p1.rRing) / (this.p1.rSun + this.p1.rRing);
            if (ANIMATE) this.p1.updateKinematics(dt, wSun1, wCarrier1, wRing1);
            wOut = wCarrier1;
            if (ANIMATE) this.p2.updateKinematics(dt, wOut, wOut, wOut); 
        } else {
            if (ANIMATE) {
                this.p1.updateKinematics(dt, turbineSpeed, turbineSpeed, turbineSpeed);
                this.p2.updateKinematics(dt, turbineSpeed, turbineSpeed, turbineSpeed);
            }
            wOut = turbineSpeed;
        }
        return wOut;
    }
}

