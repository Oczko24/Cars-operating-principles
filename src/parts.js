/**
 * Cars-operating-principles - Logika i parametry fizyki podzespołów
 */

export const PARTS_DATA = {
  block: {
    block_i4: { baseHp: 140, baseTorque: 180, baseWeight: 120, maxRpm: 6800, handling: 85, complexity: 30, diagram: "piston_inline" },
    block_v6: { baseHp: 240, baseTorque: 310, baseWeight: 175, maxRpm: 6800, handling: 75, complexity: 60, diagram: "piston_v" },
    block_v8: { baseHp: 380, baseTorque: 500, baseWeight: 230, maxRpm: 6500, handling: 65, complexity: 75, diagram: "piston_v8" },
    block_boxer4: { baseHp: 160, baseTorque: 200, baseWeight: 135, maxRpm: 7200, handling: 92, complexity: 65, diagram: "piston_boxer" }
  },
  valvetrain: {
    valve_ohv: { hpMult: 0.9, torqueMult: 1.08, rpmAdd: -1000, weightMod: -15, complexity: -20, desc: "Niskie obroty, prostota" },
    valve_dohc: { hpMult: 1.15, torqueMult: 1.0, rpmAdd: 600, weightMod: 10, complexity: 25, desc: "Wysokie obroty, 4 zawory/cyl" },
    valve_vtec: { hpMult: 1.35, torqueMult: 1.05, rpmAdd: 1800, weightMod: 18, complexity: 50, desc: "Zmienny wznios krzywki, kick 5500+ RPM" }
  },
  aspiration: {
    asp_na: { hpMult: 1.0, torqueMult: 1.0, weightMod: 0, lag: 0, complexity: 0, desc: "Liniowa reakcja" },
    asp_turbo: { hpMult: 1.55, torqueMult: 1.65, weightMod: 25, lag: 0.4, complexity: 40, desc: "Pojedyncza turbina spalinowa" },
    asp_twinturbo: { hpMult: 1.85, torqueMult: 1.95, weightMod: 45, lag: 0.15, complexity: 70, desc: "Dwie turbosprężarki" },
    asp_supercharger: { hpMult: 1.45, torqueMult: 1.5, weightMod: 35, lag: 0.0, complexity: 35, desc: "Doładowanie mechaniczne paskiem" }
  },
  drivetrain: {
    drive_rwd: { weightMod: 60, handlingMod: 20, traction: 75, complexity: 20, type: "Tylny napęd" },
    drive_fwd: { weightMod: 20, handlingMod: 5, traction: 60, complexity: 10, type: "Przedni napęd" },
    drive_awd: { weightMod: 110, handlingMod: 10, traction: 98, complexity: 55, type: "Napęd 4x4" }
  },
  suspension: {
    susp_wishbone: { weightMod: 25, handlingMod: 30, comfort: 80, complexity: 40, type: "Wyścigowe / Sportowe" },
    susp_macpherson: { weightMod: 15, handlingMod: 15, comfort: 70, complexity: 15, type: "Ekonomiczne szosowe" },
    susp_leaf: { weightMod: 50, handlingMod: -25, comfort: 40, complexity: 5, type: "Ciężarowe / Pancerne" }
  }
};

export function calculateSpecs(config) {
  const block = PARTS_DATA.block[config.block];
  const valve = PARTS_DATA.valvetrain[config.valvetrain];
  const asp = PARTS_DATA.aspiration[config.aspiration];
  const drive = PARTS_DATA.drivetrain[config.drivetrain];
  const susp = PARTS_DATA.suspension[config.suspension];

  const totalHp = Math.round(block.baseHp * valve.hpMult * asp.hpMult);
  const totalTorque = Math.round(block.baseTorque * valve.torqueMult * asp.torqueMult);
  const totalRpm = Math.max(4500, block.maxRpm + valve.rpmAdd);
  const totalWeight = Math.round(block.baseWeight + valve.weightMod + asp.weightMod + drive.weightMod + susp.weightMod);
  
  // Handling composite calculation
  let handling = Math.min(99, Math.max(10, block.handling + drive.handlingMod + susp.handlingMod - (totalWeight > 350 ? 15 : 0)));
  let complexity = Math.min(100, Math.max(10, block.complexity + valve.complexity + asp.complexity + drive.complexity + susp.complexity));

  return {
    hp: totalHp,
    torque: totalTorque,
    redline: totalRpm,
    weight: totalWeight,
    handling,
    complexity
  };
}

