import * as THREE from 'three';
import { Alternator, WaterPump, CrankPulley, SerpentineBelt } from './accessories/Accessories';
import { SportFilter, CivilAirbox, AirSystem } from './intake/Filters';
import { RadiatorSystem } from './cooling/RadiatorSystem';
import { EngineBlock } from './engine/EngineBlock';
import { CrankshaftAssembly } from './engine/CrankshaftAssembly';
import { ValvetrainAndCylinders } from './engine/ValvetrainAndCylinders';
import { IntakeManifold } from './engine/IntakeManifold';
import { ExhaustManifold } from './engine/ExhaustManifold';
import { ExhaustSystem } from './engine/ExhaustSystem';

const registry: Record<string, any> = {
  Alternator: Alternator,
  WaterPump: WaterPump,
  CrankPulley: CrankPulley,
  SerpentineBelt: SerpentineBelt,
  SportFilter: SportFilter,
  CivilAirbox: CivilAirbox,
  AirSystem: AirSystem,
  RadiatorSystem: RadiatorSystem,
  EngineBlock: EngineBlock,
  CrankshaftAssembly: CrankshaftAssembly,
  ValvetrainAndCylinders: ValvetrainAndCylinders,
  IntakeManifold: IntakeManifold,
  ExhaustManifold: ExhaustManifold,
  ExhaustSystem: ExhaustSystem
};

export class SceneAssembler {
  static layoutCache: Record<string, any> = {};

  static async loadLayout(url: string) {
    if (this.layoutCache[url]) {
      return this.layoutCache[url];
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      this.layoutCache[url] = data;
      return data;
    } catch (e: any) {
      console.warn("Could not load external layout, using fallback", e);
      const errEl = document.createElement('div');
      errEl.style.position = 'fixed'; errEl.style.top = '10px'; errEl.style.left = '10px';
      errEl.style.background = 'red'; errEl.style.color = 'white'; errEl.style.padding = '10px';
      errEl.style.zIndex = '9999';
      errEl.innerText = `Błąd ładowania pliku JSON układu: ${e.message}. Osprzęt nie zostanie załadowany. Sprawdź, czy plik engine_layout.json znajduje się w dobrym miejscu (public/).`;
      document.body.appendChild(errEl);
      setTimeout(() => errEl.remove(), 10000);
      return { components: [], accessories: [] };
    }
  }

  // Funkcja rozwiązująca wyrażenia typu "math(boreScale * 0.2)"
  static evaluateMath(val: any, datum: any, sceneContext: any) {
    if (typeof val === 'string' && val.startsWith('math(') && val.endsWith(')')) {
      const expr = val.substring(5, val.length - 1);
      const ctx = {
        ...datum,
        ...sceneContext.config, // pozwala na dostęp np. do vAngle czy cylinders
        Math: Math
      };
      const keys = Object.keys(ctx);
      const values = Object.values(ctx);
      try {
        const func = new Function(...keys, `return ${expr};`);
        return func(...values);
      } catch (e) {
        console.warn('Math evaluation failed for:', expr, e);
        return 0;
      }
    }
    return val;
  }

  // Pomocnicza funkcja dla tablic
  static evaluateArray(arr: any[], datum: any, sceneContext: any) {
    if (!arr) return arr;
    return arr.map(v => this.evaluateMath(v, datum, sceneContext));
  }

  // Pre-processowanie JSONa, by zamienić math() na liczby
  static evaluateItemProps(item: any, datum: any, sceneContext: any) {
    const newItem = { ...item };
    for (const key of Object.keys(newItem)) {
      if (Array.isArray(newItem[key])) {
        newItem[key] = this.evaluateArray(newItem[key], datum, sceneContext);
      } else {
        newItem[key] = this.evaluateMath(newItem[key], datum, sceneContext);
      }
    }
    return newItem;
  }

  // Metoda do rejestracji nowych fabryk
  static registerFactory(type: string, factoryClass: any) {
    registry[type] = factoryClass;
  }

  static buildModules(layout: any, sceneContext: any, engineGroup: THREE.Group, datum: any) {
    const builtModules = new Map<string, THREE.Object3D>();
    const engineType = sceneContext.config.layout;
    
    const layoutConfig = layout.layouts?.[engineType] || layout.layouts?.['Inline'] || layout;

    const itemsToBuild = [
      ...(layoutConfig.components || []),
      ...(layoutConfig.accessories || [])
    ];

    itemsToBuild.forEach((rawItem: any) => {
      const item = this.evaluateItemProps(rawItem, datum, sceneContext);
      
      const Factory = registry[item.type];
      if (!Factory) {
        console.warn(`Unknown module type: ${item.type}`);
        return;
      }

      const instance = new Factory();
      const mesh = instance.build(sceneContext, item, builtModules, datum, engineGroup);
      
      if (mesh) {
        // 1. Z: align logic
        let zPos = item.position ? item.position[2] : 0;
        if (item.alignZ === 'maxZ') {
          zPos = datum.maxZ + zPos;
        } else if (item.alignZ === 'minZ') {
          zPos = datum.minZ + zPos;
        }
        
        // 2. Base positioning
        if (item.position) {
          mesh.position.set(item.position[0], item.position[1], zPos);
        }

        // 3. Custom rotations from layout if needed 
        if (item.rotation) {
          mesh.rotation.x += item.rotation[0] * Math.PI / 180;
          mesh.rotation.y += item.rotation[1] * Math.PI / 180;
          mesh.rotation.z += item.rotation[2] * Math.PI / 180;
        }

        mesh.userData.id = item.id;
        builtModules.set(item.id, mesh);
        
        // Special references
        if (item.type === 'WaterPump') sceneContext.wpPulley = mesh;
        if (item.type === 'Alternator') sceneContext.alternatorGroup = mesh.userData.pulleyGroup;
        if (item.type === 'SportFilter' || item.type === 'CivilAirbox') sceneContext.intakeFilterMesh = mesh;

        engineGroup.add(mesh);
      }
    });

    return builtModules;
  }
}
