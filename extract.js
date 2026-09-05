const fs = require('fs');
const content = fs.readFileSync('src/scene/EngineBuilder.ts', 'utf-8');

const crankStart = content.indexOf('const crankMaster = new THREE.Group();');
const bankStart = content.indexOf('const banks = {};', crankStart);
const manifoldsStart = content.indexOf('// ═══ 1. UNIWERSALNY KOLEKTOR SSĄCY');
const exhaustStart = content.indexOf('// ═══ 3. PEŁNY UKŁAD WYDECHOWY');
const endOfBuild = content.indexOf('// ════════════════════════════════════════════════════════════════════════\n  }', exhaustStart);

console.log('crankStart:', crankStart);
console.log('bankStart:', bankStart);
console.log('manifoldsStart:', manifoldsStart);
console.log('exhaustStart:', exhaustStart);
console.log('endOfBuild:', endOfBuild);
