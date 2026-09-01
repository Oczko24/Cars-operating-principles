import fs from 'fs';
import { parse } from 'acorn';

try {
  const code = fs.readFileSync('src/scene3d.js', 'utf8');
  parse(code, { sourceType: 'module', ecmaVersion: 'latest' });
  console.log('Main Syntax OK');
} catch (e) {
  console.error('Error in main', e);
}
