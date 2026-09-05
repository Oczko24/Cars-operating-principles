import re

with open('src/scene/EngineBuilder.ts', 'r') as f:
    content = f.read()

crankStart = content.find('const crankMaster = new THREE.Group();')
bankStart = content.find('const banks = {};')
intakeStart = content.find('// ═══ 1. UNIWERSALNY KOLEKTOR SSĄCY')
exhaustManifoldStart = content.find('// ═══ 2. UNIWERSALNY KOLEKTOR WYDECHOWY')
exhaustSystemStart = content.find('// ═══ 3. PEŁNY UKŁAD WYDECHOWY')
endOfExhaust = content.find('this.scene.carGroup.add(fullExhaustG);', exhaustSystemStart) + 40

crank_code = content[crankStart:bankStart]
bank_code = content[bankStart:intakeStart]
intake_code = content[intakeStart:exhaustManifoldStart]
exhaust_man_code = content[exhaustManifoldStart:exhaustSystemStart]
exhaust_sys_code = content[exhaustSystemStart:endOfExhaust]

preamble = """    const scene = sceneContext;
    const {
      cylinderConfigs, centroid, maxZ, minZ, engineLength, zSpacing, 
      boreScale, strokeScale, boreRadius, sleeveRadius, crankRadius, 
      rodLength, pistonCrownH, sleeveCenter, deckHeight, sleeveLength
    } = datum;
    const explodeDist = scene.explodedFactor * 0.45;
    const layout = scene.config.layout;
    const cylCount = scene.config.cylinders;
    const vAngle = scene.config.vAngle * Math.PI / 180;
    const isTransverse = scene.config.orientation === 'transverse';
"""

# 1. CrankshaftAssembly
with open('src/scene/modules/engine/CrankshaftAssembly.ts', 'w') as f:
    f.write('''import * as THREE from 'three';
export class CrankshaftAssembly {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group) {
''' + preamble + crank_code.replace('this.scene', 'scene') + '''
    return null; // crankMaster added inside
  }
}
''')

# 2. ValvetrainAndCylinders
with open('src/scene/modules/engine/ValvetrainAndCylinders.ts', 'w') as f:
    f.write('''import * as THREE from 'three';
import { createConnectingRod, createPiston, createSparkPlug } from '../../engine/Crank';
import { createValve, createSpringMesh, createRockerArm, createCamLobe, getCamRadius } from '../../engine/Valvetrain';
export class ValvetrainAndCylinders {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group) {
''' + preamble + bank_code.replace('this.scene', 'scene') + '''
    return null; // banks added inside
  }
}
''')

# 3. IntakeManifold
with open('src/scene/modules/engine/IntakeManifold.ts', 'w') as f:
    f.write('''import * as THREE from 'three';
export class IntakeManifold {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group) {
''' + preamble + intake_code.replace('this.scene', 'scene') + '''
    return null; // Intake added inside
  }
}
''')

# 4. ExhaustManifold
with open('src/scene/modules/engine/ExhaustManifold.ts', 'w') as f:
    f.write('''import * as THREE from 'three';
export class ExhaustManifold {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group) {
''' + preamble + exhaust_man_code.replace('this.scene', 'scene') + '''
    return null; // added inside
  }
}
''')

# 5. ExhaustSystem
with open('src/scene/modules/engine/ExhaustSystem.ts', 'w') as f:
    f.write('''import * as THREE from 'three';
import { VehicleDimensions } from '../../VehicleConfig.js';
export class ExhaustSystem {
  build(sceneContext: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group) {
''' + preamble + exhaust_sys_code.replace('this.scene', 'scene') + '''
    return null; // added to carGroup inside
  }
}
''')

# Rewrite EngineBuilder.ts
new_content = content[:crankStart] + """
    // ═══ DYNAMICZNE WCZYTYWANIE MODUŁÓW (OSPRZĘT + KOMPONENTY) Z JSON ═══
    const engineLayout = await SceneAssembler.loadLayout('engine_layout.json');
    SceneAssembler.buildModules(engineLayout, this.scene, engineGroup, datum);
    
    // Jeżeli koło pasowe wału zostało dodane, podpinamy je pod wał (crankMaster) żeby się kręciło z nim.
    const builtCrankPulley = engineGroup.children.find(c => c.userData.id === 'crank_pulley_1');
    if (builtCrankPulley && this.scene.crankMaster) {
      engineGroup.remove(builtCrankPulley);
      this.scene.crankMaster.add(builtCrankPulley);
    }
""" + content[endOfExhaust:]

with open('src/scene/EngineBuilder.ts', 'w') as f:
    f.write(new_content)

