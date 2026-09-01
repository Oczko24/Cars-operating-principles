# AI_DOCS: Cars-operating-principles

This document is strictly for AI agents maintaining the project.

## Project Philosophy
100% REALISM. Every mechanical element (crank angle, firing phase, cam lobes movement, valve spring compression) MUST be based on physics and math. No random visual hacks or intersecting textures.

## 1. Engine Math & Mechanics
- **Crank Pin Angle Calculation:**
  `crankPin = (firingAngle * Math.PI / 180) + bankAngle`
  - `firingAngle`: Firing phase (0-720°).
  - `bankAngle`: Bank angle of the cylinder (0 for Inline, 90/-90 for Boxer, etc.).
- **Engine Layouts:**
  - **Inline (L4, L6, L16)**: bank = 0. Firing orders: L4 (1-3-4-2), L6 (1-5-3-6-2-4).
  - **Boxer**: bank = ±90°. 180° angle, opposite cylinders fire in pairs to balance forces.
  - **V & VR Engines**: VR is 15°. Uses split-pin crankshaft design to avoid rod intersection.
- **Valvetrain (Camshaft & Cam Lobes)**:
  - 2:1 ratio (camshaft rotates half the speed of the crankshaft).
  - Physical interaction: cam lobe physically pushes the valve stem and compresses the spring.

## 2. Drivetrain & Rolling Chassis
- **Clutch**: Single-plate dry clutch and Dual-Clutch (DCT).
- **Manual Gearbox**: 3 shafts (input, counter, main). Gears R, N, 1-5. Changes physics `gearRatio` real-time. Direct drive on 4th gear (1:1).
- **Differential**:
  - **Open**: Basic differential.
  - **LSD (1.5 Way)**: Limited Slip Differential with friction plates.
  - **Locker**: 100% lock (off-road dog clutch).

## 3. Didactics & UI
- **4-Stroke Cycle Tracker**: Visualized on UI (Intake/Blue, Compression/Yellow, Power/Red, Exhaust/Gray).
- **Raycasting**: Hover tooltips for parts in Polish.
- **Block Cutaway**: Visualizing internal mechanics.

## 4. Code Guidelines
- Vanilla JavaScript (ES Modules), Three.js.
- Avoid unnecessary npm dependencies.
- Texts should be properly localized or in Polish as per the UI design.
