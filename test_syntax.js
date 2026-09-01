const fs = require('fs');
try {
  const code = fs.readFileSync('src/scene3d.js', 'utf8');
  new Function(code);
  console.log('Syntax OK');
} catch (e) {
  console.error(e);
}
