# AI_DOCS: Cars-operating-principles

This document is strictly for AI agents maintaining the project.

## Project Philosophy

100% REALISM AND MODULARITY. Every mechanical element (crank angle, firing phase, cam lobes movement, valve spring compression) MUST be based on pure math and procedural geometry. No hardcoded global coordinates. No random visual hacks or intersecting textures. 

## 1. Geometric Datum Architecture (NEW)

The entire engine is built procedurally based on a calculated mathematical datum. 
- **Bore Column Centerline**: Each cylinder has a mathematically perfect axis `u = (-sin(bank), cos(bank), 0)`.
- **Bore Midpoint (`M_i`)**: The exact center of the stroke `M_i = A_0 + sleeveCenter * u`.
- **Engine Centroid (`C_engine`)**: The global engine geometric center, calculated as the average of all `M_i`.
- **`computeEngineDatum()`**: This method computes the arrays of vectors and centroids. All sub-assemblies (crankcase, pistons, valvetrain, intake, exhaust) must position themselves strictly relative to this computed datum.

## 2. Dynamic Placement & Assembly

- **`engineMountGroup`**: A parent container that handles the engine's vehicle-space coordinates:
  - Placement: `front`, `mid`, `rear` (controls position).
  - Orientation: `longitudinal`, `transverse` (controls Y-axis rotation).
  - Tilt: Slant angle $0-90^\circ$ (controls Z-axis rotation).
- **`engineGroup`**: The child container where all parts are built procedurally.
- **Drivetrain**: The prop shaft is dynamically generated (using `lookAt` and `distanceTo`) to bridge the gap between the movable `engineMountGroup` (Gearbox Output) and the fixed `diffGroup` (Pinion Input).

## 3. Engine Math & Mechanics

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

## 4. Drivetrain & Rolling Chassis

- **Clutch**: Single-plate dry clutch and Dual-Clutch (DCT).
- **Manual Gearbox**: 3 shafts (input, counter, main). Gears R, N, 1-5. Changes physics `gearRatio` real-time. Direct drive on 4th gear (1:1).
- **Differential**:
  - **Open**: Basic differential.
  - **LSD (1.5 Way)**: Limited Slip Differential with friction plates.
  - **Locker**: 100% lock (off-road dog clutch).

## 5. Didactics & UI

- **4-Stroke Cycle Tracker**: Visualized on UI (Intake/Blue, Compression/Yellow, Power/Red, Exhaust/Gray).
- **Raycasting**: Hover tooltips for parts in Polish.
- **Block Cutaway**: Visualizing internal mechanics.
- **Datum Visuals**: Toggleable in UI. Shows cyan bore centerlines, yellow midpoints, and a magenta XYZ centroid tripod.

## 6. Code Guidelines

- Vanilla JavaScript (ES Modules), Three.js.
- Avoid unnecessary npm dependencies.
- Texts should be properly localized or in Polish as per the UI design.
