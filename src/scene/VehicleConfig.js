export const VehicleDimensions = {
  // Ground level is Y = 0
  tireRadius: 0.32,         // 32cm promień, ok. 64cm średnicy (typowe koło osobowe)
  wheelCenterY: 0.32,       // Oś obrotu kół na wysokości promienia
  groundClearance: 0.15,    // Prześwit (15cm)
  trackWidthHalf: 0.78,     // Połowa rozstawu kół (cały rozstaw ~1.56m)
  wheelbaseFrontZ: 1.35,    // Oś przednia (Z = 1.35)
  wheelbaseRearZ: -1.35,    // Oś tylna (Z = -1.35) - Rozstaw osi = 2.70m
  engineMountY: 0.40,       // Środek wału korbowego silnika względem ziemi
  diffY: 0.32,              // Środek dyferencjału (w osi kół)
};

