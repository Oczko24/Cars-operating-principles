# 🏎️ Cars: Operating Principles

> **Interactive 3D Educational Engine & Automotive Mechanics Simulator**  
> An open-source, mathematically grounded WebGL simulator designed to visualize and explain how an automobile works from the inside out.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebGL](https://img.shields.io/badge/WebGL-Three.js_r128-orange.svg)](https://threejs.org/)
[![Status](https://img.shields.io/badge/Status-Active_Development-success.svg)](#)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/)

---

## 🌟 Vision & Goal

The ultimate objective of this project is to **procedurally model and simulate an entire automobile**—from the micro-mechanics of piston rings, valve springs, and crankshaft balancing to the transmission, differential, multi-link suspension, chassis geometry, and exterior aerodynamics.

Instead of displaying static, pre-baked CAD meshes, all internal mechanisms are built using **real parametric geometry, kinematics, and automotive math**.

---

## ✨ Current Features

### 🔧 1. Procedural Engine Generator
- **Engine Configurations**: Inline (L2–L6, L11), V-engines (V2–V12), VR-engines (narrow-angle 15° staggered bores), Boxer engines, and custom layouts.
- **Parametric Geometry**: Dynamic bore ($mm$), stroke ($mm$), cylinder bank angles, deck heights, connecting rod lengths, and crank throws.
- **Valvetrain Options**: DOHC (Double Overhead Cam), SOHC (Single Overhead Cam), and OHV (Pushrod / Rocker arms). Physical cam-to-valve contact and dual valve spring compression.
- **Forced Induction & Exhaust**: Naturally Aspirated, Single/Twin Turbo with intercoolers, and modular exhaust manifolds (single, dual, X-pipe configurations).

### ⚖️ 2. Crankshaft Solver & Mass Balancing
- **3-Layer Hybrid Crankshaft Engine**:
  - **Layer 1 (Custom Override)**: Interactive 360° polar drag-and-drop crank throw editor (`RadialCrankUI`).
  - **Layer 2 (Engineered Presets)**: Authentic firing sequences (e.g. Crossplane V8 vs Flatplane V8, BMW L6 1-5-3-6-2-4, Audi 5-cyl 1-2-4-5-3, Yamaha CP2 270° twin).
  - **Layer 3 (Dynamic Even-Fire Fallback)**: Split-pin crankshaft generation for non-standard bank angles and cylinder counts.
- **Mass Balancing Analysis**: Real-time numerical integration of 1st and 2nd order primary/secondary inertial forces ($\cos\theta$, $\cos 2\theta$) and rocking/pitching couples.

### ⚙️ 3. Drivetrain & Transmission
- **Drivetrain Layouts**: RWD (Rear-Wheel Drive), FWD (Front-Wheel Drive / Transaxle), AWD, and 4x4 with transfer cases.
- **Transmissions**:
  - Opel F17 (5-speed FWD)
  - BMW ZF GS6-37BZ (6-speed RWD)
  - Tremec T56 Magnum (6-speed V8 Muscle)
  - Rally Dogbox (6-speed straight-cut motorsport transmission)
  - Custom gear ratio editor (Gears 1–6, Reverse, Final Drive)
- **Clutch**: Single-plate dry clutch and Dual-Clutch (DCT).
- **Differentials**: Open differential, Limited Slip Differential (LSD 1.5-way with friction clutch plates), and 100% Locking Differential.

### 🛞 4. Rolling Chassis & Suspension
- **Chassis**: Tubular ladder subframe with structural crossmembers, side sills, and engine cradle.
- **Suspension**: Front double-wishbone (A-arms), rear multi-link, coilover struts with dynamic springs, tie-rods, and steering rack.
- **Wheels & Brakes**: Radial tires, alloy split-spoke rims, ventilated brake discs, and multi-piston sport brake calipers.

### 🎓 5. Didactics & Inspection
- **4-Stroke Cycle Tracker**: Real-time cylinder phase indicator (Intake, Compression, Power, Exhaust) with live mechanical descriptions.
- **Inspector Pro**: Built-in developer drawer featuring real-time **OBB (Oriented Bounding Box) collision detection**, full parts catalog, datum vectors, and diagnostic telemetry.
- **Cutaway & Exploded Views**: Interactive slider to separate modules and view inner workings.
- **Bilingual Interface**: Full Polish (PL) and English (EN) localization with automatic browser detection.

---

## 🚀 Getting Started

No build step or Node.js toolchain is strictly required to run the client—it runs on native browser ES Modules.

### Prerequisites
- Any modern web browser supporting WebGL (Chrome, Firefox, Safari, Edge).
- A local HTTP server (ES Modules require HTTP/HTTPS protocol, not `file://`).

### Running Locally

Using Python 3:
```bash
# Clone the repository
git clone https://github.com/Oczko24/Cars-operating-principles.git
cd Cars-operating-principles

# Start local server with cache-busting headers
python3 serve.py
# or: python3 -m http.server 8000
```
Open your browser at:
```
http://localhost:8000
```

### Deploying to Vercel
The project is zero-config static compatible. Simply import the repository in Vercel and deploy without custom build overrides.

---

## 📁 Architecture Overview

```
├── index.html                 # Main entrypoint, markup & error boundary
├── style.css                  # Apple Pro Minimalist Dark UI styling
├── serve.py                   # Lightweight Python dev server (no-cache headers)
├── src/
│   ├── app.js                 # App controller, UI binding, i18n switcher
│   ├── scene3d.js             # Three.js scene coordinator, camera, animation loop
│   ├── crankshaft_solver.js   # Kinematic equations, firing orders, balance analyzer
│   ├── i18n.js                # Full PL / EN dictionaries & automotive encyclopedia
│   ├── parts.js               # Part metadata and engine power/torque specs
│   ├── schematics.js          # SVG diagram visualizer
│   └── scene/
│       ├── VehicleConfig.js   # Global chassis dimensions & wheel coordinates
│       ├── EngineBuilder.js   # Procedural engine geometry & datum math
│       ├── DrivetrainBuilder.js # Gearboxes, clutches, shafts & differentials
│       ├── ChassisBuilder.js  # Frame, double wishbone/multilink & wheels
│       ├── Telemetry.js       # Dynamic wheel speed, gear ratio & torque math
│       ├── DevUIController.js # UI event listener orchestrator
│       └── DebugTools.js      # Inspector Pro, OBB collisions, click raycaster
```

---

## 🗺️ Roadmap to a Complete Car

See [Todo.md](Todo.md) for detailed tasks and technical backlog:
- [x] Procedural Engine Core (Inline, V, VR, Boxer)
- [x] Multi-layer Crankshaft Solver & Mass Balancing
- [x] Drivetrain & Gearbox simulation (FWD / RWD / AWD)
- [x] Rolling Chassis & Double-Wishbone / Multi-link Suspension
- [ ] Exhaust pipe customization (Dual pipes, X-Pipe, H-Pipe, Cat-delete)
- [ ] Refined OHV valvetrain pushrods & lifters
- [ ] Dynamic engine placement (Front, Mid, Rear)
- [ ] Automatic transmission with Torque Converter & Planetary gear sets
- [ ] Monocoque / Spaceframe Body with transparent ghost panels
- [ ] Steering wheel linkage with Ackermann steering geometry
- [ ] Web Audio procedural engine sound synthesis

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
