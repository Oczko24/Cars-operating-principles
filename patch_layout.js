const fs = require('fs');
const layout = JSON.parse(fs.readFileSync('public/engine_layout.json'));
for (const key of Object.keys(layout.layouts)) {
  layout.layouts[key].components = [
    { "id": "block_1", "type": "EngineBlock" }
  ];
}
fs.writeFileSync('public/engine_layout.json', JSON.stringify(layout, null, 2));
