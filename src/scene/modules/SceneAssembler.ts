import * as THREE from 'three';
import { Alternator, WaterPump, CrankPulley, SerpentineBelt } from './accessories/Accessories';
import { SportFilter, CivilAirbox } from './intake/Filters';

const registry: Record<string, any> = {
  Alternator: Alternator,
  WaterPump: WaterPump,
  CrankPulley: CrankPulley,
  SerpentineBelt: SerpentineBelt,
  SportFilter: SportFilter,
  CivilAirbox: CivilAirbox
};

export class SceneAssembler {
  static async loadLayout(url: string) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return await resp.json();
    } catch (e: any) {
      console.warn("Could not load external layout, using fallback", e);
      // Alert the user on screen so they know JSON failed
      const errEl = document.createElement('div');
      errEl.style.position = 'fixed'; errEl.style.top = '10px'; errEl.style.left = '10px';
      errEl.style.background = 'red'; errEl.style.color = 'white'; errEl.style.padding = '10px';
      errEl.style.zIndex = '9999';
      errEl.innerText = `Błąd ładowania pliku JSON układu: ${e.message}. Osprzęt nie zostanie załadowany. Sprawdź, czy plik engine_layout.json znajduje się w dobrym miejscu (public/).`;
      document.body.appendChild(errEl);
      setTimeout(() => errEl.remove(), 10000);
      return { accessories: [] }; // Return empty or default
    }
  }

  static buildModules(layout: any, sceneContext: any, engineGroup: THREE.Group, datum: any) {
    const builtModules = new Map<string, THREE.Object3D>();
    const engineType = sceneContext.config.layout;
    
    // Fallback to Inline if not found
    const layoutConfig = layout.layouts?.[engineType] || layout.layouts?.['Inline'] || layout;

    if (layoutConfig.accessories) {
      layoutConfig.accessories.forEach((item: any) => {
        const Factory = registry[item.type];
        if (!Factory) {
          console.warn(`Unknown module type: ${item.type}`);
          return;
        }

        const instance = new Factory();
        const mesh = instance.build(sceneContext, item, builtModules);
        
        // 1. Z: align logic
        let zPos = item.position[2];
        if (item.alignZ === 'maxZ') {
          zPos = datum.maxZ + zPos;
        } else if (item.alignZ === 'minZ') {
          zPos = datum.minZ + zPos;
        }
        
        // 2. Base positioning
        mesh.position.set(item.position[0], item.position[1], zPos);

        // 3. Custom rotations from layout if needed 
        if (item.rotation) {
          mesh.rotation.x += item.rotation[0] * Math.PI / 180;
          mesh.rotation.y += item.rotation[1] * Math.PI / 180;
          mesh.rotation.z += item.rotation[2] * Math.PI / 180;
        }

        mesh.userData.id = item.id;
        builtModules.set(item.id, mesh);
        
        // Special case: wpPulley and alternatorGroup for Scene3D references
        if (item.type === 'WaterPump') sceneContext.wpPulley = mesh;
        if (item.type === 'Alternator') sceneContext.alternatorGroup = mesh.userData.pulleyGroup;
        if (item.type === 'SportFilter' || item.type === 'CivilAirbox') sceneContext.intakeFilterMesh = mesh;

        engineGroup.add(mesh);
      });
    }

    return builtModules;
  }
}
