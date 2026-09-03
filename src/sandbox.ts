import { SandboxModeler } from './scene/SandboxModeler.js';

const modeler = new SandboxModeler('sandbox-container');

document.getElementById('btn-spawn-box')?.addEventListener('click', () => {
    modeler.spawnPrimitive('box', { w: 1, h: 1, d: 1 }, 0x3b82f6);
});

document.getElementById('btn-spawn-cyl')?.addEventListener('click', () => {
    modeler.spawnPrimitive('cylinder', { rt: 0.5, rb: 0.5, h: 1.5, s: 24 }, 0x10b981);
});

document.getElementById('btn-clear')?.addEventListener('click', () => {
    modeler.clear();
});

// Wystawiamy do window, żeby AI z konsoli mogło łatwo z tego korzystać
(window as any).AI_MODELER = modeler;
