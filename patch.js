const fs = require('fs');
const path = 'src/scene/modules/intake/AirSystem.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Oblicz prawdziwe Z filtra.*?filterPos\.z \+= maxZ;/s;
const match = code.match(regex);
if (!match) {
  console.log("Not found");
  process.exit(1);
}

const replacement = `    // Oblicz prawdziwe Z filtra (tak jak w SceneAssemblerze użyto maxZ dla akcesoriów)
    filterPos.z += maxZ; 
    
    // ---------------------------------------------------------
    // MATEMATYCZNE OBLICZENIE WYSOKOŚCI (Y) - ZGODNIE Z ŻYCZENIEM
    // Szukamy najwyższego punktu silnika w osi Y
    // ---------------------------------------------------------
    const { deckHeight, boreScale, rodLength, crankRadius } = datum;
    const layout = scene.config.layout;
    const vAngle = scene.config.vAngle * Math.PI / 180;
    
    const headBase = deckHeight + 0.02 * boreScale;
    // Długość od wału do szczytu pokrywy zaworów (blok + uszczelka + głowica + pokrywa)
    const totalCylinderLength = headBase + 0.22 * boreScale; 
    
    let engineTopY = 0;
    if (layout === 'Inline' || layout === 'VR') {
      const angle = layout === 'VR' ? (15 * Math.PI / 180 / 2) : 0;
      engineTopY = totalCylinderLength * Math.cos(angle);
    } else if (layout === 'V' || layout === 'W') {
      engineTopY = totalCylinderLength * Math.cos(vAngle / 2);
    } else if (layout === 'Boxer') {
      // Cylindry leżą płasko, najwyższym punktem jest kolektor ssący nad blokiem
      engineTopY = (rodLength + crankRadius) * 0.75 + 0.10 * boreScale; 
    }
    
    // Nadpisz pozycję Y filtra precyzyjnie matematycznie
    filterPos.y = engineTopY;`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log("Patched");
