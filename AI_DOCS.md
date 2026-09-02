# 🤖 AI_DOCS: Cars-operating-principles

> **STRICT ARCHITECTURAL DIRECTIVES FOR AI AGENTS & CONTRIBUTORS**  
> Read this document thoroughly before proposing or writing code in this repository.

---

## ⚡ Fundamental Rules

1. **Static Educational Workbench Nature**: The application is an interactive **virtual automotive cutaway workbench / test stand** (similar to a vehicle on an exhibition turntable or mechanic's lift). It is **not** a driving game or track simulator. Focus is on mechanical clarity, kinematics, fluid/current/power flow, and anatomical cross-sections.
2. **Temporary Files**: All scratch scripts, test runners, and diagnostic files **MUST** be placed in the `temp/` folder (which is git-ignored). Never pollute the repository root.
3. **Realism & Kinematics**: Every mechanical element (crank throws, firing sequences, cam lobes, valve stems, springs, gears, suspension arms) **MUST** be governed by real physics, kinematics, and mathematical geometry. Never use fake visual hacks, hardcoded disjointed coordinates, or intersecting meshes.
4. **Bilingual Localization**: All UI labels, part names, didactic explanations, and inspector outputs **MUST** be defined in both Polish (`pl`) and English (`en`) within `src/i18n.js`. Never hardcode raw strings in templates or JavaScript logic.
5. **No Global Regressions**: Always ensure that changes in one module (e.g. changing bore/stroke or cylinder count) dynamically scale all dependent components (e.g. block height, conrods, crankshaft journals, intake/exhaust manifolds).

---

## 📐 Coordinate Systems & Frames of Reference

The project employs **three hierarchical coordinate frames**:

### 1. Vehicle / World Space (`carGroup`)
- **Origin**: Ground level ($Y = 0$).
- **$Y$-axis (Up)**: Ground level is $Y=0$. Wheel axis is at $Y = \text{tireRadius} = 0.32\text{m}$. Engine crankshaft axis is mounted at $Y = 0.40\text{m}$.
- **$Z$-axis (Longitudinal)**:
  - Front axle: $+Z = 1.35\text{m}$ (`wheelbaseFrontZ`)
  - Rear axle: $-Z = -1.35\text{m}$ (`wheelbaseRearZ`)
  - Total Wheelbase = $2.70\text{m}$.
- **$X$-axis (Lateral)**:
  - Left wheels: $-X = -0.78\text{m}$ (`-trackWidthHalf`)
  - Right wheels: $+X = +0.78\text{m}$ (`+trackWidthHalf`)
  - Total Track Width = $1.56\text{m}$.

### 2. Engine Space (`engineMountGroup`)
- Container for the engine and direct-attached bellhousing/transmission.
- Handles macro-placement within the vehicle chassis:
  - **Placement**: `front` ($Z \approx +1.10$), `mid` ($Z \approx -0.30$), `rear` ($Z \approx -1.65$).
  - **Orientation**: `longitudinal` (crankshaft along $Z$), `transverse` (crankshaft along $X$, rotated $90^\circ$ around $Y$).
  - **Tilt (Slant Angle)**: $0^\circ$ to $45^\circ$ rotation around $Z$.

### 3. Geometric Datum Frame (`computeEngineDatum()`)
All internal engine geometry (sleeves, pistons, wrist pins, conrods, crankpins, valves, cams, manifolds) is calculated relative to the **Computed Geometric Datum**:
- **Bore Column Centerline**: Vector $\vec{u} = (-\sin(\text{bank}), \cos(\text{bank}), 0)$.
- **Bore Midpoint ($M_i$)**: Exact center of the stroke $M_i = A_0 + \text{sleeveCenter} \cdot \vec{u}$.
- **Engine Centroid ($C_{engine}$)**: Calculated average of all $M_i$.
- **Bore Pitch ($zSpacing$)**: Calculated dynamically based on cylinder bore diameter and cooling jacket wall clearance ($zSpacing \ge 2 \cdot r_{sleeve} + \text{minWallClearance}$).

---

## 🛠️ Codebase Structure & Responsibilities

| File / Module | Responsibility |
| :--- | :--- |
| `index.html` | UI layout, Apple Pro sidebar, Inspector Pro drawer, and global error overlay boundary. |
| `style.css` | Glassmorphism, CSS variables, dark theme, responsive panels, collapsible sections. |
| `serve.py` | Python dev server with zero-cache HTTP headers and browser error logger. |
| `src/app.js` | Top-level application coordinator, language selection, slider event listeners, and parts selector. |
| `src/scene3d.js` | Core Three.js renderer, animation loop, camera controls, materials dictionary, and module delegator. |
| `src/crankshaft_solver.js` | Trójwarstwowy solver wału korbowego, kolejności zapłonów, RadialCrankUI (360° Drag & Drop), analiza wyważenia masowego (siły I i II rzędu). |
| `src/scene/EngineBuilder.js` | Procedural generation of block, sleeves, pistons, conrods, crankshaft, valvetrain (DOHC/SOHC/OHV), intake, exhaust. |
| `src/scene/DrivetrainBuilder.js` | Flywheel, clutches (single/DCT), manual & automatic gearboxes, prop shafts, differentials (Open, LSD, Locker), half-shafts. |
| `src/scene/ChassisBuilder.js` | Structural ladder frame/monocoque, double-wishbone front suspension, multi-link rear, coilovers, rack & pinion, wheels & brakes. |
| `src/scene/VehicleConfig.js` | Single source of truth for chassis dimensions, wheelbases, clearances, and mount heights. |
| `src/scene/Telemetry.js` | Physical calculations of wheel RPM, linear vehicle speed ($km/h$), overall drive ratios, and engine load. |
| `src/scene/DevUIController.js` | Event wiring for advanced dev controls, sliders, gearbox ratios, and dynamic UI forms. |
| `src/scene/DebugTools.js` | Inspector Pro drawer, OBB (Oriented Bounding Box) collision detection, part catalog search, and 3D raycasting coordinates. |
| `src/i18n.js` | Complete bilingual dictionary (PL & EN) for all UI tags, part encyclopedic descriptions, and diagnostics. |

---

## 🔬 Mechanical Implementation Guidelines

### 1. Valvetrain & Cam Timing
- The camshaft rotates at **half the crankshaft speed** ($1:2$ drive ratio).
- Cam lobes must physically contact the valve lifter/bucket.
- When the cam lobe lobe crest presses down, the valve stem displaces downward and the spring coils compress procedurally using mathematical scaling.
- **OHV (Overhead Valve / Pushrod)**: Camshaft is located in the engine block; lifters ride on cam lobes, transmitting motion through pushrods to rocker arms, which depress the valves.

### 2. Crankshaft Solver
- Never hardcode crank angles for variable layouts.
- Presets are defined in `CRANK_PRESETS` for standard configurations (L4 180°, L5 72°, L6 120°, V8 crossplane 90°, V8 flatplane 180°, Boxer).
- When arbitrary cylinder numbers or custom bank angles are chosen, the fallback layer calculates even-fire intervals $\Delta\gamma = 720^\circ / N$ and generates split-pin offsets $\delta = \Delta\gamma - \alpha$.

### 3. Drivetrain Connection
- The transmission tailhousing output connects dynamically to the differential pinion input via the prop shaft.
- Use `Vector3.distanceTo` and `Object3D.lookAt` to dynamically scale and orient the prop shaft, supporting any engine placement (`front`, `mid`, `rear`).

---

## 🔍 Debugging & Quality Verification

1. **Zero Console Errors**: Always verify that running the scene produces zero WebGL or JavaScript runtime exceptions.
2. **OBB Collision Detection**: Use the built-in **Sprawdź Kolizje OBB** tool in Inspector Pro (`#dev-check-overlap`) to ensure newly added components do not unnaturally intersect existing parts.
3. **Double Click Raycaster**: Double-clicking any part in the 3D viewport logs its full part name, Vehicle Space coordinates, and Engine Local coordinates to the browser console.
