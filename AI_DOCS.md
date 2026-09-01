# AI_DOCS: Cars-operating-principles

This document is strictly for AI agents maintaining the project.

Najwazniejsze: tymczasowe pliki zapisuj w folderze temp
## Project Philosophy

100% REALISM AND MODULARITY. Every mechanical element (crank angle, firing phase, cam lobes movement, valve spring compression) MUST be based on pure math and procedural geometry. No hardcoded global coordinates. No random visual hacks or intersecting textures. 

## 1. Geometric Datum Architecture (NEW)

The entire engine and chassis are built procedurally based on mathematical datums to ensure 100% physically accurate interactions, with a unified coordinate system where `Y = 0` is the ground level.

### Vehicle-level Geometry (`src/scene/VehicleConfig.js`)
All vehicle dimensions are strictly centralized in `VehicleConfig.js` to ensure the chassis, engine, and drivetrain align perfectly without hardcoded magic numbers:
- `tireRadius`: Determines ground clearance and wheel size.
- `wheelCenterY`: The Y-axis elevation for wheels, axles, and diffs.
- `groundClearance`: The exact lowest point for chassis frame rails and sills.
- `trackWidthHalf`: Defines the width of the chassis and axle lengths.
- `wheelbaseFrontZ / wheelbaseRearZ`: Defines axle placement.

### Engine-level Geometry
- **Bore Column Centerline**: Each cylinder has a mathematically perfect axis `u = (-sin(bank), cos(bank), 0)`.
- **Bore Midpoint (`M_i`)**: The exact center of the stroke `M_i = A_0 + sleeveCenter * u`.
- **Engine Centroid (`C_engine`)**: The global engine geometric center.
- **`computeEngineDatum()`**: Computes these vectors. All sub-assemblies position themselves strictly relative to this datum.

## 2. Dynamic Placement & Assembly

- **`engineMountGroup`**: A parent container that handles the engine's vehicle-space coordinates, pulling its Y-height dynamically from `VehicleDimensions.engineMountY`:
  - Placement: `front`, `mid`, `rear` (controls Z-axis position).
  - Orientation: `longitudinal`, `transverse` (controls Y-axis rotation). The gearbox dynamically scales in length (Z-axis) to fit transverse engine bays.
  - Tilt: Slant angle $0-90^\circ$ (controls Z-axis rotation).
- **`engineGroup`**: The child container where all parts are built procedurally.
- **Drivetrain**: The prop shaft is dynamically generated (using `lookAt` and `distanceTo`) to bridge the gap between the movable `engineMountGroup` (Gearbox Output) and the fixed `diffGroup` (Pinion Input).

## 3. Engine Math & Mechanics (Hybrid Crankshaft Pipeline)

- **Trójwarstwowy Crankshaft Solver (`src/crankshaft_solver.js`)**:
  - **Warstwa 1 (Custom Override)**: Pozwala użytkownikowi ręcznie modyfikować kąty wykorbień `customCrankPins` za pomocą interaktywnej tarczy biegunowej (`RadialCrankUI` 360° Drag & Drop).
  - **Warstwa 2 (Engineered Presets `CRANK_PRESETS`)**:
    - **L2**: Wał 270° (Crossplane Twin, Yamaha CP2 / Triumph).
    - **L3**: Even-fire 120° (1-2-3).
    - **L4**: Flat-plane 180° (1-3-4-2).
    - **L5**: Even-fire 72° (1-2-4-5-3, Audi 2.5 TFSI).
    - **L6**: Symetryczny wał 120° (1-5-3-6-2-4, BMW / Supra).
    - **V8**: Przełącznik `v8CrankType`: `crossplane` (90° z przeciwwagami) vs `flatplane` (180° wyścigowy).
    - **V10 / V12**: 72° / 60° even-fire.
    - **Boxer 4 / Boxer 6**: Przeciwsobne czopy 180° / 60°.
  - **Warstwa 3 (Fallback Even-Fire + Split-Pin)**:
    - Dla niestandardowych układów (np. V7, L11) wyznacza interwał $\Delta\gamma = \Phi / N$ oraz generuje dynamiczne czopy dzielone (split-pin) na wale z przesunięciem kątowym $\delta = \Delta\gamma - \alpha$.
- **Crank Pin Angle Calculation:**
  `crankPin = (firingAngle * Math.PI / 180) + bankAngle` (lub manualnie z `customCrankPins`).
- **Analiza Wyważenia Masowego (`analyzeEngineBalance`)**:
  - W czasie rzeczywistym całkuje siły bezwładności I rzędu ($\cos\theta$), II rzędu ($\cos 2\theta$) i momenty kiwające/przechylające, wyświetlając zwięzłą diagnostykę edukacyjną w UI.
- **Valvetrain (Camshaft & Cam Lobes)**:
  - 2:1 ratio (camshaft rotates half the speed of the crankshaft).
  - Physical interaction: cam lobe physically pushes the valve stem and compresses the spring.

## 4. Drivetrain & Rolling Chassis

- **Clutch**: Single-plate dry clutch and Dual-Clutch (DCT).
- **Manual Gearbox & Transmission Presets (`GEARBOX_PRESETS`)**:
  - **Opel F17 (5-speed FWD)**: 1: 3.73, 2: 2.14, 3: 1.41, 4: 1.12, 5: 0.89, R: -3.31 (Final Drive 3.94).
  - **BMW ZF GS6-37BZ (6-speed RWD)**: 1: 4.35, 2: 2.50, 3: 1.66, 4: 1.23, 5: 1.00, 6: 0.85, R: -3.93 (Final Drive 3.23).
  - **Tremec T56 Magnum (6-speed V8 Muscle)**: 1: 2.66, 2: 1.78, 3: 1.30, 4: 1.00, 5: 0.74, 6: 0.50, R: -2.90 (Final Drive 3.73).
  - **Rajdowa Kłowa (6-speed Dogbox)**: 1: 3.00, 2: 2.20, 3: 1.70, 4: 1.35, 5: 1.10, 6: 0.92, R: -3.00 (Final Drive 4.50).
  - **Własna (Custom Gear Ratios)**: Pełna edycja przełożeń biegów 1..6, wstecznego (R) oraz przełożenia głównego (Final Drive) z wyliczaniem prędkości kół w czasie rzeczywistym.
- **Differential**:
  - **Open**: Basic differential.
  - **LSD (1.5 Way)**: Limited Slip Differential with friction plates.
  - **Locker**: 100% lock (off-road dog clutch).
- **Vehicle Telemetry**: Real-time wheel speed (km/h), wheel RPM, and overall drive reduction calculated directly from engine RPM and active gear ratio.

## 5. Didactics & UI Architecture

- **Collapsible Panel Sections**: Wszystkie sekcje panelu bocznego (`.panel-section.collapsible`) posiadają płynne zwijanie/rozwijanie nagłówków z ikonami `▼/▶`.
- **Logiczny układ kontrolek**: Suwak obrotów silnika (RPM) umieszczony w sekcji napędu obok skrzyni biegów i telemetrii prędkości.
- **4-Stroke Cycle Tracker**: Visualized on UI (Intake/Blue, Compression/Yellow, Power/Red, Exhaust/Gray).
- **Raycasting**: Hover tooltips for parts in Polish.
- **Block Cutaway**: Visualizing internal mechanics.
- **Datum Visuals**: Toggleable in UI. Shows cyan bore centerlines, yellow midpoints, and a magenta XYZ centroid tripod.

## 6. Code Guidelines

- Vanilla JavaScript (ES Modules), Three.js.
- Avoid unnecessary npm dependencies.
- Texts should be properly localized or in Polish as per the UI design.
