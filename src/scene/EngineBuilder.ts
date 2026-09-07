import * as THREE from 'three';

import { createCylConfig, computeEngineDatum, buildDatumVisuals, createDatumLabel } from './engine/Block';
import { createConnectingRod, createPiston, createSparkPlug } from './engine/Crank';
import { createValve, createSpringMesh, createRockerArm, createCamLobe, getCamRadius } from './engine/Valvetrain';

import { resolveFiringSequence, resolveCrankPinAngles, analyzeEngineBalance } from '../crankshaft_solver.js';
import { VehicleDimensions } from './VehicleConfig.js';
import { SceneAssembler } from './modules/SceneAssembler';

export class EngineBuilder {
  [key: string]: any;

  constructor(scene) {
    this.scene = scene;
  }


createCylConfig(id, z, bank, firingAngleDeg, crankPinAngle) {
    return createCylConfig(this.scene.config, id, z, bank, firingAngleDeg, crankPinAngle);
  }

computeEngineDatum() {
    return computeEngineDatum(this.scene);
  }

createDatumLabel(text, color = '#ffffff', bgColor = 'rgba(15, 23, 42, 0.85)') {
    return createDatumLabel(text, color, bgColor);
  }

buildDatumVisuals(engineGroup, datum) {
    return buildDatumVisuals(this.scene, engineGroup, datum);
  }

async buildEngineAssembly() {
    const datum = this.computeEngineDatum();
    this.scene.currentEngineDatum = datum;
    const { 
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength 
    } = datum;

    const isTransverse = this.scene.config.orientation === 'transverse';
    const compactGbLen = isTransverse ? 0.32 : 0.65;
    const gbEndLocal = minZ - 0.05 - compactGbLen;
    const midZLocal = (maxZ + gbEndLocal) / 2.0;

    this.scene.engineMountGroup = new THREE.Group();
    
    // 1. Placement (Vehicle Coordinates)
    const mountY = VehicleDimensions.engineMountY;
    const frontZ = VehicleDimensions.wheelbaseFrontZ;
    const rearZ = VehicleDimensions.wheelbaseRearZ;
    
    if (this.scene.config.placement === 'front') {
      let longZ = 0.85 - minZ;
      if (this.scene.config.drivetrainLayout === 'FWD' || this.scene.config.drivetrainLayout === 'AWD' || this.scene.config.drivetrainLayout === '4x4') {
         // Longitudinal FWD/AWD: engine sits ahead of the front axle.
         // Passat W8 overhangs (differential is at Z=1.00, wheels at Z=1.35).
         // The engine MUST start at or after Z=1.35 so the halfshafts pass behind it!
         longZ = 1.35 - minZ; 
      }
      this.scene.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (frontZ + 0.16) : longZ);
    } else if (this.scene.config.placement === 'mid') {
      const longZ = rearZ + 0.40 - minZ; // Wyrównanie tyłu silnika w okolicach tylnej osi
      this.scene.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (rearZ + 0.8) : longZ);
    } else if (this.scene.config.placement === 'rear') {
      const longZ = rearZ - 0.20 - minZ; // Wyrównanie tyłu silnika do tylnego zderzaka
      this.scene.engineMountGroup.position.set(isTransverse ? midZLocal : 0, mountY, isTransverse ? (rearZ - 0.20) : longZ);
    }

    // 2. Orientation (Transverse vs Longitudinal)
    if (isTransverse) {
      this.scene.engineMountGroup.rotation.y = -Math.PI / 2;
    }

    // 3. Tilt / Slant
    if (this.scene.config.tiltAngle) {
      this.scene.engineMountGroup.rotation.z = (this.scene.config.tiltAngle * Math.PI) / 180;
    }

    const engineGroup = new THREE.Group();
    this.scene.engineMountGroup.add(engineGroup);

    this.buildDatumVisuals(engineGroup, datum);

    const layout = this.scene.config.layout;
    const cylCount = this.scene.config.cylinders;
    const vAngle = this.scene.config.vAngle * Math.PI / 180;
    const strokeLength = crankRadius * 2;
    const pistonLength = Math.max(0.12, boreRadius * 1.5);


    
    // ═══ DYNAMICZNE WCZYTYWANIE MODUŁÓW (OSPRZĘT + KOMPONENTY) Z JSON ═══
    const engineLayout = await SceneAssembler.loadLayout('engine_layout.json');
    
    // Upewnijmy się że carGroup i engineMountGroup mają aktualne macierze
    // Zanim moduły (np. wydech) zaczną liczyć globalne koordynaty z matrixWorld!
    this.scene.carGroup.add(this.scene.engineMountGroup);
    this.scene.carGroup.updateMatrixWorld(true);
    
    SceneAssembler.buildModules(engineLayout, this.scene, engineGroup, datum);
    
    this.scene.engineGroup = engineGroup;
    this.scene.engineZMin = datum.minZ;
    this.scene.engineMountGroup.updateMatrixWorld(true);
    
    // Jeżeli koło pasowe wału zostało dodane, podpinamy je pod wał (crankMaster) żeby się kręciło z nim.
    const builtCrankPulley = engineGroup.children.find(c => c.userData.id === 'crank_pulley_1');
    if (builtCrankPulley && this.scene.crankMaster) {
      engineGroup.remove(builtCrankPulley);
      this.scene.crankMaster.add(builtCrankPulley);
    }
    // ════════════════════════════════════════════════════════════════════════
  }

  createValve(material, name, vDiscR) {
    return createValve(this.scene, material, name, vDiscR);
  }

  createSpringMesh() {
    return createSpringMesh(this.scene);
  }

  createRockerArm() {
    return createRockerArm(this.scene);
  }

  createCamLobe() {
    return createCamLobe(this.scene);
  }

  getCamRadius(angle) {
    return getCamRadius(angle);
  }

  createSparkPlug() {
    return createSparkPlug(this.scene);
  }

  createPiston(radius, length) {
    return createPiston(this.scene, radius, length);
  }

  createConnectingRod(length) {
    return createConnectingRod(this.scene, length);
  }
}
