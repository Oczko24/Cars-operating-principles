import re

with open('src/scene/EngineBuilder.ts', 'r') as f:
    content = f.read()

crankStart = content.find('const crankMaster = new THREE.Group();')
bankStart = content.find('const banks = {};')
manifoldsStart = content.find('// ═══ 1. UNIWERSALNY KOLEKTOR SSĄCY')
exhaustManifoldStart = content.find('// ═══ 2. UNIWERSALNY KOLEKTOR WYDECHOWY')
exhaustSystemStart = content.find('// ═══ 3. PEŁNY UKŁAD WYDECHOWY')
endOfExhaust = content.find('this.scene.carGroup.add(fullExhaustG);', exhaustSystemStart) + 40

crank_code = content[crankStart:bankStart]
bank_code = content[bankStart:manifoldsStart]
intake_code = content[manifoldsStart:exhaustManifoldStart]
exhaust_man_code = content[exhaustManifoldStart:exhaustSystemStart]
exhaust_sys_code = content[exhaustSystemStart:endOfExhaust]

# Write out CrankshaftAssembly
with open('src/scene/modules/engine/CrankshaftAssembly.ts', 'w') as f:
    f.write('''import * as THREE from 'three';
export class CrankshaftAssembly {
  build(scene: any, layoutProps: any, builtModules: Map<string, THREE.Object3D>, datum: any, engineGroup: THREE.Group): THREE.Object3D {
    const { cylinderConfigs, maxZ, minZ, boreScale, strokeScale, crankRadius } = datum;
    const throwHalfWidth = 0.054; // default, need to extract
''' + crank_code + '''
    return crankMaster;
  }
}
''')

