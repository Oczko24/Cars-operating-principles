import * as THREE from 'three';

export function createGearGeometry(pitchRadius: number, thickness: number, numTeeth: number, innerHoleRatio: number = 0.3): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    const module = (2 * pitchRadius) / numTeeth; 
    const outerRadius = pitchRadius + module;
    const rootRadius = pitchRadius - 1.25 * module;
    
    const anglePerTooth = (Math.PI * 2) / numTeeth;
    
    for (let i = 0; i < numTeeth; i++) {
        const startAngle = i * anglePerTooth;
        const midAngle1 = startAngle + anglePerTooth * 0.25;
        const midAngle2 = startAngle + anglePerTooth * 0.75;
        const endAngle = startAngle + anglePerTooth;
        
        if (i === 0) {
            shape.moveTo(rootRadius * Math.cos(startAngle), rootRadius * Math.sin(startAngle));
        } else {
            shape.lineTo(rootRadius * Math.cos(startAngle), rootRadius * Math.sin(startAngle));
        }
        
        shape.lineTo(outerRadius * Math.cos(midAngle1), outerRadius * Math.sin(midAngle1));
        shape.lineTo(outerRadius * Math.cos(midAngle2), outerRadius * Math.sin(midAngle2));
        shape.lineTo(rootRadius * Math.cos(endAngle), rootRadius * Math.sin(endAngle));
    }
    
    if (innerHoleRatio > 0) {
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, pitchRadius * innerHoleRatio, 0, Math.PI * 2, false);
        shape.holes.push(holePath);
    }
    
    const extrudeSettings = {
        depth: thickness,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.002,
        bevelThickness: 0.002
    };
    
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center(); // Center the geometry on Z axis
    return geom;
}
