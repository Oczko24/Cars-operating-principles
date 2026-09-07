import * as THREE from 'three';
import { VehicleDimensions } from './VehicleConfig.js';
import { ManualGearbox } from './modules/transmission/ManualGearbox.js';
import { AutomaticPlanetary } from './modules/transmission/AutomaticPlanetary.js';
import { CVT } from './modules/transmission/CVT.js';
import { HalfShafts } from './modules/drivetrain/HalfShafts.js';
import { PropShaft } from './modules/drivetrain/PropShaft.js';

export class DrivetrainBuilder {
  [key: string]: any;

  constructor(scene) {
    this.scene = scene;
  }

  buildDrivetrainAssembly() {
    this.scene.drivetrainGroup = new THREE.Group();
    this.scene.carGroup.add(this.scene.drivetrainGroup);

    const isTransverse = this.scene.config.orientation === 'transverse';
    const layout = this.scene.config.drivetrainLayout || "RWD";

    // 1. SPRZĘGŁO / KONWERTER I SKRZYNIA BIEGÓW
    const transGroup = new THREE.Group();

    // Setup Clutch/Flywheel if not automatic (Automatics use Torque Converter in their module)
    if (this.scene.config.gearboxPreset !== 'zf_8hp') {
      const clutchGroup = new THREE.Group();
      clutchGroup.position.set(0, 0, this.scene.engineZMin - 0.05);

      const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), this.scene.matDarkSteel);
      flywheel.rotation.x = Math.PI / 2;
      flywheel.userData.name = "Koło Zamachowe";
      clutchGroup.add(flywheel);

      const frictionDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 32), this.scene.matBronze);
      frictionDisk.rotation.x = Math.PI / 2;
      frictionDisk.position.z = -0.03;
      frictionDisk.userData.name = "Tarcza Sprzęgła (Cierna)";
      clutchGroup.add(frictionDisk);

      const pressurePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32), this.scene.matSteel);
      pressurePlate.rotation.x = Math.PI / 2;
      pressurePlate.position.z = -0.06;
      pressurePlate.userData.name = "Docisk Sprzęgła";
      clutchGroup.add(pressurePlate);

      this.scene.flywheelMesh = flywheel;
      this.scene.pressurePlateMesh = pressurePlate;
      this.scene.frictionDiskMesh = frictionDisk;
      transGroup.add(clutchGroup);
    }

    // Skrzynia Biegów (Modular)
    const preset = this.scene.config.gearboxPreset;
    
    // We instantiate the correct modular transmission and store it on this.scene.transmissionModule
    let transmissionModule;
    if (preset === 'cvt_multitronic') {
      transmissionModule = new CVT(this.scene);
    } else if (preset === 'zf_8hp') {
      transmissionModule = new AutomaticPlanetary(this.scene);
    } else {
      transmissionModule = new ManualGearbox(this.scene, isTransverse);
    }

    // Attach to transGroup
    transmissionModule.group.position.set(0, 0, this.scene.engineZMin - 0.15);
    
    // Orient correctly if transverse
    if (isTransverse) {
      // Shift gearbox backwards to align with the front axle at Z=1.35
      // Engine is at Z=1.51 (frontZ + 0.16). Local X is World -Z.
      // So shift local X by 0.16.
      transmissionModule.group.position.x = 0.16;
    } else if (layout === "FWD" || layout === "AWD" || layout === "4x4") {
      // For longitudinal FWD/AWD (like Passat), the engine is in front of the axle.
      // We will adjust the engine placement in EngineBuilder, but for now we make sure 
      // the gearbox diff aligns with Z=1.35
    }
    
    transGroup.add(transmissionModule.group);
    this.scene.engineMountGroup.add(transGroup);
    this.scene.transmissionModule = transmissionModule;

    // 2. WAŁY I PÓŁOSIE (Driveline Modules)
    // Front and Rear halfshafts
    this.scene.drivelineModules = [];
    
    if (layout === "FWD" || layout === "AWD" || layout === "4x4") {
      const frontShafts = new HalfShafts(this.scene, true, isTransverse);
      this.scene.drivetrainGroup.add(frontShafts.group);
      this.scene.drivelineModules.push(frontShafts);
    }
    
    if (layout === "RWD" || layout === "AWD" || layout === "4x4") {
      const rearShafts = new HalfShafts(this.scene, false, isTransverse);
      this.scene.drivetrainGroup.add(rearShafts.group);
      this.scene.drivelineModules.push(rearShafts);
      
      // Add prop shaft for RWD/AWD
      // Simple layout: from gearbox output to rear axle
      const engineZ = this.scene.engineZMin - 0.5; // Approx gearbox end in world Z? Wait, engineMountGroup handles this.
      // For simplicity, from z = 0.5 to z = -1.35
      const propShaft = new PropShaft(this.scene, 0.5, VehicleDimensions.wheelbaseRearZ, VehicleDimensions.engineMountY, VehicleDimensions.diffY);
      this.scene.drivetrainGroup.add(propShaft.group);
      this.scene.drivelineModules.push(propShaft);
    }

    // Simple diff casings just for visualization since halfshafts attach to them
    const addDiffVisual = (zPos) => {
        const diffGeom = new THREE.SphereGeometry(0.12, 16, 16);
        const diffCasing = new THREE.LineSegments(
          new THREE.EdgesGeometry(diffGeom),
          this.scene.crankcaseLineMat
        );
        diffCasing.position.set(0, VehicleDimensions.diffY, zPos);
        diffCasing.userData.name = "Obudowa Dyferencjału";
        this.scene.drivetrainGroup.add(diffCasing);
    };

    if (layout === "FWD" || layout === "AWD" || layout === "4x4") addDiffVisual(VehicleDimensions.wheelbaseFrontZ);
    if (layout === "RWD" || layout === "AWD" || layout === "4x4") addDiffVisual(VehicleDimensions.wheelbaseRearZ);
  }
}
