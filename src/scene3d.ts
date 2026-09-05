/**
 * Cars-operating-principles - Edukacyjny Silnik 3D
 * Dynamiczny generator układów: Inline, V, VR, Boxer
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ChassisBuilder } from './scene/ChassisBuilder.js';
import { EngineBuilder } from './scene/EngineBuilder.js';
import { DrivetrainBuilder } from './scene/DrivetrainBuilder.js';
import { DevUIController } from './scene/DevUIController.js';
import { Telemetry } from './scene/Telemetry.js';
import { setupDebugClicker } from './scene/DebugTools.js';
import { PartsExplorer } from './scene/PartsExplorer.js';

import {
  CRANK_PRESETS,
  resolveFiringSequence,
  resolveCrankPinAngles,
  analyzeEngineBalance,
  RadialCrankUI
} from './crankshaft_solver.js';
import { i18n } from './i18n.js';

export const GEARBOX_PRESETS = {
  opel_f17: {
    name: "Saab 9-3 1.8i (5-biegowa FWD)",
    desc: "Klasyczna 5-biegowa skrzynia (bazowe przełożenia Saab 9-3 1.8i). Dobre stopniowanie miejskie.",
    ratios: { '1': 3.73, '2': 2.14, '3': 1.41, '4': 1.12, '5': 0.89, '6': 0.75, 'R': -3.31, 'N': 0 },
    finalDrive: 3.94,
    speeds: 5
  },
  bmw_zf_gs6: {
    name: "BMW ZF GS6-37BZ (6-biegowa RWD)",
    desc: "Sportowa 6-biegowa skrzynia wzdłużna (BMW E46/E90 330i, Z4). Bieg 5 bezpośredni (1.00), bieg 6 to nadbieg.",
    ratios: { '1': 4.35, '2': 2.50, '3': 1.66, '4': 1.23, '5': 1.00, '6': 0.85, 'R': -3.93, 'N': 0 },
    finalDrive: 3.23,
    speeds: 6
  },
  tremec_t56: {
    name: "Tremec T56 Magnum (6-biegowa V8)",
    desc: "Wytrzymała skrzynia do potężnego momentu obrotowego (Corvette, Viper, Mustang Cobra). Podwójny nadbieg (5 i 6).",
    ratios: { '1': 2.66, '2': 1.78, '3': 1.30, '4': 1.00, '5': 0.74, '6': 0.50, 'R': -2.90, 'N': 0 },
    finalDrive: 3.73,
    speeds: 6
  },
  rally_dogbox: {
    name: "Rajdowa Kłowa (6-biegowa Dogbox)",
    desc: "Wyczynowa krótka skrzynia ze sprzęgłami kłowymi do motorsportu. Ciasno zestopniowane biegi i wysokie przełożenie główne.",
    ratios: { '1': 3.00, '2': 2.20, '3': 1.70, '4': 1.35, '5': 1.10, '6': 0.92, 'R': -3.00, 'N': 0 },
    finalDrive: 4.50,
    speeds: 6
  },
  cvt_multitronic: {
    name: "Multitronic / Lineartronic (CVT)",
    desc: "Bezstopniowa skrzynia automatyczna CVT. Dwie pary przesuwnych stożków i stalowy pas Van Doorne'a płynnie zmieniają przełożenie od 2.60:1 do 0.60:1.",
    ratios: { '1': 2.60, '2': 1.95, '3': 1.45, '4': 1.05, '5': 0.78, '6': 0.60, 'R': -2.40, 'N': 0 },
    finalDrive: 3.90,
    speeds: 6,
    type: 'cvt'
  },
  zf_8hp: {
    name: "Klasyczny Automat (np. ZF 8HP)",
    desc: "Klasyczna skrzynia automatyczna z przekładniami planetarnymi. Wyświetlane uproszczone przekładnie i sprzęgła hydrokinetyczne (Konwerter).",
    ratios: { '1': 4.71, '2': 3.14, '3': 2.10, '4': 1.66, '5': 1.28, '6': 1.00, 'R': -3.30, 'N': 0 },
    finalDrive: 3.15,
    speeds: 6,
    type: 'automatic'
  }
};

export class Scene3D {
  [key: string]: any;

  constructor(container, onFrameStats) {
    this.container = container;
    this.onFrameStats = onFrameStats || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1d21);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(2.5, 1.8, 3.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x1a1d21, 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 25;
    this.controls.target.set(0, 0.4, 0);

    this.crankAngle = 0; 
    this.speedMult = 0.35; 
    this.isPlaying = true;
    this.explodedFactor = 0.0;
    this.isCutaway = true;
    this.radialUI = null;
    this.currentBalanceReport = null;
    this.lang = "pl";
    this.config = {
      layout: "Inline",
      stroke: 4,
      rpm: 1000,
      valves: 4,
      cylinders: 4,
      boreMm: 84.0,
      strokeMm: 90.0,
      exhaustPipes: "single",
      vAngle: 60,
      v8CrankType: "crossplane",
      customOverride: false,
      customCrankPins: null,
      customFiringAngles: null,
      drivetrain: "drive_rwd",
      drivetrainLayout: "RWD",
      suspension: "susp_wishbone",
      clutchType: "single",
      clutchEngaged: true,
      diffType: "open",
      gearboxPreset: "opel_f17",
      gearboxCustomRatios: {
        '1': 3.73,
        '2': 2.14,
        '3': 1.41,
        '4': 1.12,
        '5': 0.89,
        '6': 0.75,
        'R': -3.31,
        'N': 0
      },
      currentGear: "1",
      finalDrive: 3.94,
      placement: "front",
      orientation: "longitudinal",
      tiltAngle: 0,
      showDatum: false,
      showChassis: false,
      cvtRatio: 2.60
    };

    this.focusMode = 'all';
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.fps = 60;

    
    this.chassisBuilder = new ChassisBuilder(this);
    this.engineBuilder = new EngineBuilder(this);
    this.drivetrainBuilder = new DrivetrainBuilder(this);
    this.devUIController = new DevUIController(this);
    this.telemetry = new Telemetry(this);

    this.initMaterials();

    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);
    this.partsExplorer = new PartsExplorer(this);

    // --- Narzędzie do debugowania (Klikacz) ---
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    setupDebugClicker(this);
    this.movingCylinders = [];
    this.camshafts = [];
    this.valvesToDrive = [];
    this.forceTrail = [];
    this.momentTrail = [];

    this.setupLighting();
    this.setupEnvironment();
    this.devUIController.setupTooltip();
    this.devUIController.setupDevPanel();

    // Cache elementów DOM do telemetrii w pętli animacji
    this.cachedDom = {
      wheelSpeed: document.getElementById('dev_wheel_speed'),
      wheelRpm: document.getElementById('dev_wheel_rpm'),
      totalRed: document.getElementById('dev_total_reduction')
    };

    // Podłączenie canvas wibracji (panel Fizyka & Wyważenie)
    this.vibCanvas = document.getElementById('dev_vibration_canvas');
    if (this.vibCanvas) {
      this.vibCtx = this.vibCanvas.getContext('2d');
    }

    this.rebuildFullCar();

    window.addEventListener("resize", () => this.onResize());
    this.isDisposed = false;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.animate = this.animate.bind(this);
    if (!this.isDisposed) requestAnimationFrame(this.animate);
  }



  initMaterials() {
    this.matChassis = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    this.matEngineBlock = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.4 });
    this.matSteel = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.15 });
    this.matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
    this.matBronze = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
    this.matGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    this.matPiston = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.8, roughness: 0.2 });
    this.matIntake = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    this.matExhaust = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.7, roughness: 0.3 });
        const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 32, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 1);
    this.matBelt = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    this.matTire = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    this.matRim = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    this.matBrake = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.3 });
    this.matCeramic = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    this.matSilver = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 });
    this.matRubber = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.95 });
    this.matCoolant = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.6 });
    this.matIntakeGas = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 });
    this.matExhaustGas = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0 });
    this.matFuelSpray = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0 });
    this.matExhaustPipe = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.35 });
    this.matChrome = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.98, roughness: 0.08 });
    this.matMuffler = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.35 });
    this.matCatalyst = new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.75, roughness: 0.4 });
    this.matFlexPipe = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.5, wireframe: true });
    
    // Streamline Flow Line Materials (Dynamic Glowing Lines)
    this.matStreamlineIntake = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0, depthWrite: false });
    this.matStreamlineExhaust = new THREE.LineBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0, depthWrite: false });
    this.matStreamlineFuel = new THREE.LineBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0, depthWrite: false });
    this.matStreamlineMainExhaust = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.4, depthWrite: false });
    
    this.lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45 });
    this.crankcaseLineMat = new THREE.LineBasicMaterial({ color: 0xa8a29e, transparent: true, opacity: 0.3 });
    
    // Datum / Engineering Reference Materials
    this.matDatumLine = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8, depthWrite: false });
    this.matDatumNode = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    this.matDatumOrigin = new THREE.MeshBasicMaterial({ color: 0xff007f });
    this.matDatumAxisX = new THREE.LineBasicMaterial({ color: 0xef4444, depthWrite: false });
    this.matDatumAxisY = new THREE.LineBasicMaterial({ color: 0x10b981, depthWrite: false });
    this.matDatumAxisZ = new THREE.LineBasicMaterial({ color: 0xf59e0b, depthWrite: false });
  }

  setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xf7f3ee, 0x2d2a29, 1.1);
    this.scene.add(hemiLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(8, 12, 10);
    this.scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0xd7a673, 1.0);
    fillLight.position.set(-8, 6, -8);
    this.scene.add(fillLight);
  }

  setupEnvironment() {
    const grid = new THREE.GridHelper(30, 60, 0x8d6f53, 0x2e3135);
    grid.position.y = -0.45;
    grid.material.transparent = true;
    grid.material.opacity = 0.38;
    this.scene.add(grid);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setSpeed(mult) { this.speedMult = mult; }
  setManualCrankAngle(deg) { this.crankAngle = (deg * Math.PI) / 180; }
  jumpToStroke(strokeNumber) {
    const strokeAngles = [0, 90, 270, 450, 630];
    this.setManualCrankAngle(strokeAngles[strokeNumber] || 0);
    this.isPlaying = false;
  }
  setExploded(val) {
    this.explodedFactor = val;
    this.rebuildFullCar();
  }
  toggleCutaway() {
    this.isCutaway = !this.isCutaway;
    this.rebuildFullCar();
    return this.isCutaway;
  }

  setConfig(config, category) {
    if (category === 'block' || !category) {
      if (config.block === 'block_i4') { this.config.layout = 'Inline'; this.config.cylinders = 4; this.config.vAngle = 0; }
      else if (config.block === 'block_v6') { this.config.layout = 'V'; this.config.cylinders = 6; this.config.vAngle = 60; }
      else if (config.block === 'block_v8') { this.config.layout = 'V'; this.config.cylinders = 8; this.config.vAngle = 90; }
      else if (config.block === 'block_boxer4') { this.config.layout = 'Boxer'; this.config.cylinders = 4; this.config.vAngle = 180; }
    }
    if (category === 'valvetrain' || !category) {
      if (config.valvetrain === 'valve_ohv') { this.config.valvetrain = 'OHV'; this.config.valves = 2; }
      else if (config.valvetrain === 'valve_dohc') { this.config.valvetrain = 'DOHC'; this.config.valves = 4; }
      else if (config.valvetrain === 'valve_vtec') { this.config.valvetrain = 'DOHC'; this.config.valves = 4; }
    }
    if (category === 'drivetrain' || !category) {
      if (config.drivetrain === 'drive_rwd') { this.config.drivetrainLayout = 'RWD'; this.config.placement = 'front'; this.config.orientation = 'longitudinal'; }
      else if (config.drivetrain === 'drive_fwd') { this.config.drivetrainLayout = 'FWD'; this.config.placement = 'front'; this.config.orientation = 'transverse'; }
      else if (config.drivetrain === 'drive_awd') { this.config.drivetrainLayout = 'AWD'; this.config.placement = 'front'; this.config.orientation = 'longitudinal'; }
    }
    if (category === 'aspiration' || !category) {
      if (config.aspiration === 'asp_na') { this.config.intakeType = 'standard'; }
      else { this.config.intakeType = 'sport'; }
    }
    if (category === 'suspension' || !category) {
       // Only visual impact on handling in stats right now
    }
    
    // Notify Dev UI if it exists to sync sliders
    const evt = new CustomEvent('sync_dev_ui', { detail: this.config });
    document.dispatchEvent(evt);
    
    this.rebuildFullCar();
  }

  setFocusMode(target: string, updateCamera: boolean = true) {
    this.focusMode = target;
    
    // Ustawienie widoczności głównych modułów
    if (this.engineGroup) this.engineGroup.visible = (target === 'all' || target === 'engine');
    if (this.transGroup) this.transGroup.visible = (target === 'all' || target === 'gearbox');
    if (this.drivetrainGroup) this.drivetrainGroup.visible = (target === 'all' || target === 'drivetrain');
    
    // Pozostałe części auta (zawieszenie, koła, rama)
    const isChassisVisible = (target === 'all');
    this.carGroup.children.forEach(child => {
        if (child !== this.drivetrainGroup && child !== this.engineMountGroup) {
            child.visible = isChassisVisible;
        }
    });

    if (updateCamera) {
      // Funkcja pomocnicza do centrowania kamery na obiekcie
      const focusOnGroup = (group: any, offset: any) => {
        const box = new THREE.Box3().setFromObject(group);
        const center = new THREE.Vector3();
        box.getCenter(center);
        this.controls.target.copy(center);
        
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 1.0);
        
        // Skalujemy dystans kamery na podstawie wielkości obiektu
        const distMult = maxDim * 0.8;
        this.camera.position.copy(center).add(offset.clone().multiplyScalar(distMult));
      };

      // Ustawienie kamery
      if (target === 'engine' && this.engineGroup) {
        focusOnGroup(this.engineGroup, new THREE.Vector3(1.5, 1.0, 1.5));
      } else if (target === 'gearbox' && this.transGroup) {
        focusOnGroup(this.transGroup, new THREE.Vector3(1.5, 1.0, -1.0));
      } else if (target === 'drivetrain' && this.drivetrainGroup) {
        focusOnGroup(this.drivetrainGroup, new THREE.Vector3(2.0, 1.5, -2.0));
      } else {
        this.controls.target.set(0, 0, -0.5);
        this.camera.position.set(3, 2, 3);
      }
      
      this.controls.update();
    }
  }

  async yieldAndSetLoadingText(text: string) {
    if (this.firstFrameRendered) return;
    const el = document.getElementById('loading-status-text');
    if (el) el.innerText = text;
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  isBuilding = false;

  async rebuildFullCar() {
      this.isBuilding = true;
      // Pokaż overlay na wypadek ponownego budowania
      const overlay = document.getElementById('loading-overlay');
      if (overlay && !this.firstFrameRendered) {
        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');
      }

      await this.yieldAndSetLoadingText('Czyszczenie sceny...');
      while (this.carGroup.children.length > 0) {
        this.carGroup.remove(this.carGroup.children[0]);
      }
      this.movingCylinders = [];
      this.camshafts = [];
      this.valvesToDrive = [];
      this.carWheels = [];
      this.forceTrail = [];
      this.momentTrail = [];
      this.flowStreamlines = [];
      this.exhaustMainStreamlines = [];

      if (this.config.showChassis) {
        await this.yieldAndSetLoadingText('Budowa nadwozia i podwozia...');
        this.chassisBuilder.buildChassisFrame();
      }
      
      await this.yieldAndSetLoadingText('Budowa bloku silnika i rozrządu...');
      await this.engineBuilder.buildEngineAssembly();
      
      await this.yieldAndSetLoadingText('Składanie układu napędowego i skrzyni biegów...');
      this.drivetrainBuilder.buildDrivetrainAssembly();
      
      if (this.config.showChassis) {
        await this.yieldAndSetLoadingText('Montaż zawieszenia i kół...');
        this.chassisBuilder.buildSuspensionAssembly();
      }

      await this.yieldAndSetLoadingText('Podłączanie zegarów i wskaźników...');
      this.devUIController.updateCrankshaftUI();
      if (this.focusMode) {
          this.setFocusMode(this.focusMode, false);
      }
      window.dispatchEvent(new CustomEvent('parts-tree-rebuild'));

      // Koniec budowy. Reszta ukrywania nakładki dzieje się w pierwszej klatce w animate()
      
      this.isBuilding = false;
  }

  firstFrameRendered = false;
  animate(time) {
    if (!this.isBuilding) {
      this.firstFrameRendered = true;
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        // removed removeChild
      }
    }
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.frameCount++;

    if (time - this.lastFpsUpdate >= 250) {
      this.fps = Math.round((this.frameCount * 1000) / (time - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = time;
      this.onFrameStats({
        fps: this.fps,
        frameTime: Math.round(dt * 1000),
        crankAngleDeg: Math.round((this.crankAngle * 180 / Math.PI) % 720),
        cylinders: this.telemetry.getCylindersState()
      });
    }

    if (this.isPlaying) {
      const crankSpeed = this.speedMult * Math.PI * 2;
      const delta = crankSpeed * dt;
      this.crankAngle = (this.crankAngle + delta) % (Math.PI * 4);
      this.drivetrainAngle = (this.drivetrainAngle || 0) + delta;
      if (this.matBelt && this.matBelt.map) {
        this.matBelt.map.offset.x -= (crankSpeed * dt * 0.3); // Belt speed
      }
    }


    if (this.crankMaster) {
      this.crankMaster.rotation.z = -this.crankAngle;
    }

    // Używamy ciągłego drivetrainAngle, by uniknąć resetowania rotacji (przeskoków) gdy crankAngle wraca do 0
    let dtAngle = this.drivetrainAngle;
    if (!this.isPlaying) dtAngle = this.crankAngle; // podczas suwaka ręcznego, używamy crankAngle

    // ═══ ALTERNATOR — obroty proporcjonalne do wału korbowego ═══
    // ω_alt = ω_crank · (D_korbowy / D_alternator) = ω_crank · 2.6
    if (this.alternatorGroup) {
      const altPulleyRatio = 0.085 / 0.033; // ≈ 2.58
      this.alternatorGroup.children.forEach(child => {
        if (child.userData.name === "Koło pasowe alternatora") {
          child.rotation.y = dtAngle * altPulleyRatio;
        }
      });
    }

    // ═══ PRZEPUSTNICA — kąt klapy motylkowej f(RPM) ═══
    // θ(RPM) = θ_min + (θ_max - θ_min) · (1 - e^(-RPM/τ))
    // θ_min = 5° (idle), θ_max = 85° (WOT), τ = 2000 RPM
    if (this.throttleFlapG) {
      const thetaMin = 5 * Math.PI / 180;
      const thetaMax = 85 * Math.PI / 180;
      const tau = 2000;
      const throttleAngle = thetaMin + (thetaMax - thetaMin) * (1 - Math.exp(-this.config.rpm / tau));
      this.throttleFlapG.rotation.x = throttleAngle;
    }

    // --- DRIVETRAIN ANIMATION ---
    const engineSpeed = -dtAngle;
    let inputSpeed = this.config.clutchEngaged ? engineSpeed : 0;
    
    if (this.flywheelMesh) this.flywheelMesh.rotation.y = engineSpeed;
    if (this.pressurePlateMesh) this.pressurePlateMesh.rotation.y = engineSpeed;
    if (this.frictionDiskMesh) this.frictionDiskMesh.rotation.y = inputSpeed;
    
    // Skrzynia biegów
    if (this.gbInputGroup) this.gbInputGroup.rotation.z = inputSpeed;
    
    // Przełożenie zębatek wejściowych (Input -> Countershaft) 0.06 -> 0.08
    const inputRatio = 0.06 / 0.08; 
    const counterSpeed = -inputSpeed * inputRatio;
    if (this.gbCounterGroup) this.gbCounterGroup.rotation.z = counterSpeed;
    
    // ═══ SKRZYNIA BIEGÓW I NAPĘD (DYNAMIC RATIOS & TELEMETRIA) ═══
    const currentG = this.config.currentGear || '1';
    const realRatio = this.devUIController.getCurrentGearRatio();

    let outputSpeed = 0;
    let overallGearRatio = 0;

    if (currentG === 'N' || realRatio === 0) {
      outputSpeed = 0;
      overallGearRatio = 0;
    } else {
      overallGearRatio = 1.0 / Math.abs(realRatio);
      outputSpeed = (realRatio < 0) ? (-inputSpeed / Math.abs(realRatio)) : (inputSpeed / realRatio);
    }

    // Obliczanie prędkości kół (km/h), obrotów koła (RPM) i redukcji na podstawie RPM silnika
    const wheelSpeedEl = this.cachedDom.wheelSpeed;
    const wheelRpmEl = this.cachedDom.wheelRpm;
    const totalRedEl = this.cachedDom.totalRed;

    let txtSpeed, txtRpm, txtRed;

    if (this.config.clutchEngaged && overallGearRatio !== 0 && currentG !== 'N') {
      const totalRatio = Math.abs(realRatio) * this.config.finalDrive;
      const wheelRPM = this.config.rpm / totalRatio;
      // Założony obwód koła ~1.98m (koło 205/55 R16)
      const kmh = (wheelRPM * 1.98 * 60) / 1000;
      txtSpeed = Math.abs(Math.round(kmh)) + ' km/h' + (realRatio < 0 ? ' (R)' : '');
      txtRpm = Math.abs(Math.round(wheelRPM)) + ' RPM';
      txtRed = totalRatio.toFixed(2) + ':1';
    } else {
      txtSpeed = '0 km/h (Luz / Sprzęgło)';
      txtRpm = '0 RPM';
      txtRed = '-';
    }

    if (wheelSpeedEl && wheelSpeedEl.innerText !== txtSpeed) wheelSpeedEl.innerText = txtSpeed;
    if (wheelRpmEl && wheelRpmEl.innerText !== txtRpm) wheelRpmEl.innerText = txtRpm;
    if (totalRedEl && totalRedEl.innerText !== txtRed) totalRedEl.innerText = txtRed;

    if (this.gbOutputGroup) this.gbOutputGroup.rotation.z = outputSpeed;
    
    // Animuj luźne zębatki (są podgrupą gbOutputGroup, więc ich rotacja Y musi być różnicą)
    if (this.gbOutGears) {
      this.gbOutGears.forEach((g, i) => {
        if (g.userData.ratio !== undefined) {
          // Jeśli to transaxle, zazębiają się bezpośrednio z wałkiem wejściowym
          const driveSpeed = g.userData.isTransaxle ? inputSpeed : counterSpeed;
          g.rotation.y = (-driveSpeed * g.userData.ratio) - outputSpeed;
        } else {
          // Fallback dla klasycznej skrzyni wzdłużnej
          const ratios = [0.04 / 0.10, 0.06 / 0.08, 0.08 / 0.06, 0.10 / 0.04, -0.04 / 0.10];
          if (i < ratios.length) {
            g.rotation.y = (-counterSpeed * ratios[i]) - outputSpeed;
          }
        }
      });
    }
    
    // Animacja rozsuwania/zsuwania stożków CVT w zależności od przełożenia
    if (this.cvtConePrimMovable && this.cvtConeSecMovable) {
      const clampedRatio = Math.max(0.6, Math.min(2.6, Math.abs(realRatio || 1.5)));
      const norm = (clampedRatio - 0.6) / (2.6 - 0.6); // 1.0 (krótki bieg 2.6:1), 0.0 (nadbieg 0.6:1)
      const targetPrimZ = 0.035 + (norm - 0.5) * 0.024;
      const targetSecZ = -0.035 + (0.5 - norm) * 0.024;
      this.cvtConePrimMovable.position.z = THREE.MathUtils.lerp(this.cvtConePrimMovable.position.z, targetPrimZ, 0.1);
      this.cvtConeSecMovable.position.z = THREE.MathUtils.lerp(this.cvtConeSecMovable.position.z, targetSecZ, 0.1);
    }

    // Ruch synchronizatorów
    const isTransverse = this.config.orientation === 'transverse';
    const isF17 = this.config.gearboxPreset === 'opel_f17';
    
    if (this.gbSync12) {
      let targetSync12Z = 0;
      if (isF17) {
        targetSync12Z = (currentG === '1') ? 0.04 : (currentG === '2') ? 0.00 : 0.02;
      } else {
        targetSync12Z = (currentG === '1') ? (isTransverse ? 0.02 : 0.20) : (currentG === '2') ? (isTransverse ? -0.02 : 0.14) : (isTransverse ? 0.0 : 0.17);
      }
      this.gbSync12.position.z = THREE.MathUtils.lerp(this.gbSync12.position.z, targetSync12Z, 0.1);
    }
    if (this.gbSync34) {
      let targetSync34Z = 0;
      if (isF17) {
        targetSync34Z = (currentG === '3') ? -0.04 : (currentG === '4') ? -0.08 : -0.06;
      } else {
        targetSync34Z = (currentG === '3') ? (isTransverse ? -0.06 : 0.04) : (currentG === '4') ? (isTransverse ? -0.10 : -0.00) : (isTransverse ? -0.08 : 0.02);
      }
      this.gbSync34.position.z = THREE.MathUtils.lerp(this.gbSync34.position.z, targetSync34Z, 0.1);
    }
    if (this.gbSync56) {
      let targetSync56Z = 0;
      if (isF17) {
        targetSync56Z = (currentG === '5') ? -0.12 : (currentG === 'R') ? 0.07 : -0.09; // Hack for R as it uses 5th sync visually if we wanted, but let's just make it jump to R gear
      } else {
        targetSync56Z = (currentG === '5') ? (isTransverse ? -0.14 : -0.06) : (currentG === '6') ? (isTransverse ? -0.18 : -0.12) : (isTransverse ? -0.14 : -0.09);
      }
      this.gbSync56.position.z = THREE.MathUtils.lerp(this.gbSync56.position.z, targetSync56Z, 0.1);
    }
    
    if (this.propShaftMesh) this.propShaftMesh.rotation.z = outputSpeed;
    if (this.pinionMesh) this.pinionMesh.rotation.y = outputSpeed;

    const finalDriveRatio = this.config.finalDrive || 3.94;
    const ringSpeed = outputSpeed / finalDriveRatio;
    
    if (this.ringGearMesh) this.ringGearMesh.rotation.x = ringSpeed;
    if (this.diffCarrier) this.diffCarrier.rotation.x = ringSpeed;
    if (this.leftAxleG) this.leftAxleG.rotation.x = ringSpeed;
    if (this.rightAxleG) this.rightAxleG.rotation.x = ringSpeed;

    // ═══ OBRÓT 4 KÓŁ POJAZDU (Zsynchronizowany z półosiami i dyferencjałem) ═══
    if (this.carWheels && this.carWheels.length > 0) {
      this.carWheels.forEach(w => {
        w.rotation.x = ringSpeed;
      });
    }
    // --- END DRIVETRAIN ANIMATION ---


    const camAngle = this.config.stroke === 2 ? this.crankAngle : this.crankAngle / 2;
    this.camshafts.forEach(cam => {
      cam.rotation.z = -camAngle;
    });

    const explodeDist = this.explodedFactor * 0.45;
    const strokeMm = this.config.strokeMm || 90.0;
    const boreMm = this.config.boreMm || 84.0;
    const strokeScale = strokeMm / 90.0;
    const boreScale = boreMm / 84.0;
    const crankRadius = 0.16 * strokeScale;
    const rodLength = 0.48 * strokeScale;
    const pistonLength = Math.max(0.12, (0.105 * boreScale) * 1.4);
    const pistonCrownH = 0.035 + pistonLength / 2.0;
    const sleeveCenter = rodLength + pistonCrownH * 0.5;
    const deckHeight = rodLength + crankRadius + pistonCrownH;
    const headBase = deckHeight + 0.02 * boreScale + explodeDist * 1.5;
    const isOHV = this.config.valvetrain === "OHV" || this.config.valvetrain === "valve_ohv";
    const valveBaseY = headBase + 0.084 + 0.025 * (boreScale || 1.0);
    const trueCamY = isOHV ? (rodLength * 0.5 + explodeDist * 0.5) : (valveBaseY + 0.095 * (boreScale || 1.0));
    const camOffsetX = (this.config.valves === 4 ? 0.048 : 0.038) * boreScale;

    if (this.banksData) {
      this.banksData.forEach(bank => {
        if (isOHV) {
            const globalCamX = (this.config.layout === 'Inline' || this.config.layout === 'VR') ? 0.16 * boreScale : 0;
            const globalCamY = (this.config.layout === 'Inline' || this.config.layout === 'VR') ? (rodLength * 0.5 + explodeDist * 0.5) : (rodLength * 0.35 + explodeDist * 0.5);
            const localX = globalCamX * Math.cos(bank.bankAngle) + globalCamY * Math.sin(bank.bankAngle);
            const localY = -globalCamX * Math.sin(bank.bankAngle) + globalCamY * Math.cos(bank.bankAngle);
            if (bank.camBaseEx) bank.camBaseEx.position.set(localX, localY, 0);
        } else {
            const inSign = bank.inSign !== undefined ? bank.inSign : -1;
            const exSign = bank.exSign !== undefined ? bank.exSign : 1;
            if (bank.camBaseIn) bank.camBaseIn.position.set(inSign * camOffsetX, trueCamY, 0);
            if (bank.camBaseEx) bank.camBaseEx.position.set(exSign * camOffsetX, trueCamY, 0);
        }
      });
    }


    // --- ANALITYKA KINEMATYCZNA (I i II rząd oraz Momenty) ---
    let forceX = 0;
    let forceY = 0;
    let momentX = 0; // Moment pochylający (Pitch)
    let momentY = 0; // Moment odchylający (Yaw)
    
    // Obliczenie środka silnika dla osi Z
    let sumZ = 0;
    if (this.movingCylinders.length > 0) {
        sumZ = this.movingCylinders.reduce((acc, part) => acc + part.z, 0) / this.movingCylinders.length;
    }
    
    this.movingCylinders.forEach(part => {
      part.sleeve.position.set(0, sleeveCenter + explodeDist, 0);
      part.head.position.set(part.head.position.x, headBase + 0.08 * boreScale, 0);
      part.sparkPlug.position.set(0, headBase + 0.16 * boreScale + explodeDist, 0);
      part.fireMesh.position.set(0, headBase + 0.04 * boreScale + explodeDist, 0);

      const worldAngle = part.crankPinAngle - this.crankAngle;
      const pinX = -part.crankRadius * Math.sin(worldAngle);
      const pinY = part.crankRadius * Math.cos(worldAngle);
      const unitX = -Math.sin(part.bank);
      const unitY = Math.cos(part.bank);
      const dot = pinX * unitX + pinY * unitY;
      const pinDistSq = pinX * pinX + pinY * pinY;
      const s = dot + Math.sqrt(Math.max(0, part.rodLength * part.rodLength - (pinDistSq - dot * dot)));

      part.pistonG.position.set(0, s, 0);
      part.rodG.position.set(pinX, pinY, part.z);

      const pistonEngineX = unitX * s;
      const pistonEngineY = unitY * s;
      const rodAngle = Math.atan2(pistonEngineX - pinX, pistonEngineY - pinY);
      part.rodG.rotation.z = -rodAngle;

      // Wyliczenie siły bezwładności F_bezwl
      // F = cos(alpha) + lambda * cos(2*alpha)
      const alpha = this.crankAngle - part.crankPinAngle + part.bank;
      const lambda = part.crankRadius / part.rodLength;
      const F = Math.cos(alpha) + lambda * Math.cos(2 * alpha);
      
      // Rozbicie na wektory wg kąta rozwarcia bloku (bank)
      const fX = F * -Math.sin(part.bank);
      const fY = F * Math.cos(part.bank);
      forceX += fX;
      forceY += fY;
      
      // Moment siły (Ramię = odległość Z od środka)
      const armZ = part.z - sumZ;
      momentX += fY * armZ;
      momentY += fX * armZ;

      const strokeAngle = (this.crankAngle + part.phaseOffset) % (Math.PI * 4);
      if (strokeAngle >= Math.PI * 2 && strokeAngle < Math.PI * 2.35) {
        const prog = (strokeAngle - Math.PI * 2) / 0.35;
        part.fireMat.opacity = 0.95 * (1.0 - prog);
        part.fireMesh.scale.setScalar(0.8 + prog * 0.5);
      } else {
        part.fireMat.opacity = 0;
      }

      // Ssanie (0 do PI) — świecące linie dolotu i sfery
      if (strokeAngle >= 0 && strokeAngle < Math.PI) {
          part.inGasMat.opacity = Math.sin(strokeAngle) * 0.7;
          part.inGas.scale.setScalar(0.5 + Math.sin(strokeAngle) * 0.5);
      } else {
          part.inGasMat.opacity = 0;
      }

      // Wydech (3·π do 4·π) — świecące linie wydechu i sfery
      if (strokeAngle >= Math.PI * 3 && strokeAngle < Math.PI * 4) {
          part.exGasMat.opacity = -Math.sin(strokeAngle) * 0.7; // sin(3π..4π) < 0
          part.exGas.scale.setScalar(0.5 - Math.sin(strokeAngle) * 0.5);
      } else {
          part.exGasMat.opacity = 0;
      }

      // ═══ WTRYSK PALIWA (Impuls stożka linii natrysku) ═══
      if (part.injFlashMat) {
        const injStart = 0;
        const injDuration = Math.PI / 3; // 60° = π/3 rad
        if (strokeAngle >= injStart && strokeAngle < injStart + injDuration) {
          const t = (strokeAngle - injStart) / injDuration;
          const pulse = 1.0 - Math.abs(2.0 * t - 1.0); // trójkąt: 0→1→0
          part.injFlashMat.opacity = pulse * 0.85;
          part.injFlash.scale.setScalar(0.5 + pulse * 0.8);
        } else {
          part.injFlashMat.opacity = 0;
        }
      }
    });

    // ═══ ANIMACJA LINII PRZEPŁYWU GAZÓW (STREAMLINES) ═══
    if (this.flowStreamlines) {
      const animTime = time * 0.003 * (this.isPlaying ? (this.speedMult * 2.5) : 0);

      this.flowStreamlines.forEach(item => {
        const strokeAngle = (this.crankAngle + item.phaseOffset) % (Math.PI * 4);

        if (item.type === 'intake') {
          // Suw ssania: 0 → π
          if (strokeAngle >= 0 && strokeAngle < Math.PI) {
            const intensity = Math.sin(strokeAngle);
            item.streams.forEach((st, sIdx) => {
              st.lineMat.opacity = intensity * 0.95;
              const posAttr = st.lineMesh.geometry.attributes.position;
              const ptsCount = posAttr.count;
              const samples = st.sampledCurvePoints;
              const maxSampleIdx = st.numCurveSamples;
              if (samples && maxSampleIdx) {
                for (let p = 0; p < ptsCount; p++) {
                  const uOrig = p / (ptsCount - 1);
                  const uAnim = (uOrig + animTime * 1.5 + (sIdx * 0.15)) % 1.0;
                  const sampleIdx = Math.min(maxSampleIdx, Math.floor(uAnim * maxSampleIdx));
                  const pt = samples[sampleIdx];
                  if (pt) posAttr.setXYZ(p, pt.x, pt.y, pt.z);
                }
                posAttr.needsUpdate = true;
              }
            });
          } else {
            item.streams.forEach(st => { st.lineMat.opacity = 0; });
          }
        } else if (item.type === 'exhaust') {
          // Suw wydechu: 3π → 4π
          if (strokeAngle >= Math.PI * 3 && strokeAngle < Math.PI * 4) {
            const intensity = -Math.sin(strokeAngle); // dodatnia wartość
            item.lineMat.opacity = intensity * 0.95;
          } else {
            item.lineMat.opacity = 0;
          }
        }
      });
    }

    // ═══ ANIMACJA GŁÓWNEJ RURY WYDECHOWEJ (Pulsowanie do tyłu auta) ═══
    if (this.matStreamlineMainExhaust) {
      let totalExhaustFlow = 0;
      this.movingCylinders.forEach(c => {
        const sa = (this.crankAngle + c.phaseOffset) % (Math.PI * 4);
        if (sa >= Math.PI * 3 && sa < Math.PI * 4) {
          totalExhaustFlow += -Math.sin(sa);
        }
      });
      const normExhaust = Math.min(1.0, totalExhaustFlow / Math.max(1, this.movingCylinders.length * 0.35));
      this.matStreamlineMainExhaust.opacity = 0.25 + normExhaust * 0.65;
    }

    // Animacja obrotu koła pasowego pompy wody
    if (this.wpPulley) {
      this.wpPulley.rotation.y = dtAngle * (0.085 / 0.045);
    }

    if (this.vibCtx && this.vibCanvas && this.vibCanvas.offsetParent !== null) {
      const ctx = this.vibCtx;
      const w = this.vibCanvas.width;
      const h = this.vibCanvas.height;
      const cx = w/2;
      const cy = h/2;
      
      // Solid background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);
      
      // Draw grid/crosshair
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.stroke();

      const scale = (w/3.5) / (this.movingCylinders.length || 1);
      const px = cx + forceX * scale;
      const py = cy - forceY * scale; 
      const mx = cx + momentX * scale * 2;
      const my = cy - momentY * scale * 2;

      // Store trail points
      if (!this.forceTrail) this.forceTrail = [];
      if (!this.momentTrail) this.momentTrail = [];
      
      this.forceTrail.push({x: px, y: py});
      this.momentTrail.push({x: mx, y: my});
      
      // Keep only last 200 points
      if (this.forceTrail.length > 200) this.forceTrail.shift();
      if (this.momentTrail.length > 200) this.momentTrail.shift();
      
      // Draw Trails (Lissajous)
      ctx.lineWidth = 1.5;
      
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      for (let i=0; i<this.forceTrail.length; i++) {
         if (i === 0) ctx.moveTo(this.forceTrail[i].x, this.forceTrail[i].y);
         else ctx.lineTo(this.forceTrail[i].x, this.forceTrail[i].y);
      }
      ctx.stroke();
      
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      for (let i=0; i<this.momentTrail.length; i++) {
         if (i === 0) ctx.moveTo(this.momentTrail[i].x, this.momentTrail[i].y);
         else ctx.lineTo(this.momentTrail[i].x, this.momentTrail[i].y);
      }
      ctx.stroke();
      
      // Draw leading dots
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI*2);
      ctx.fill();
      
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI*2);
      ctx.fill();
      
      // Status
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px monospace';
      ctx.clearRect(0, 0, w, 30);
      
      const forceBal = (Math.abs(forceX) < 0.01 && Math.abs(forceY) < 0.01);
      const momentBal = (Math.abs(momentX) < 0.01 && Math.abs(momentY) < 0.01);
      
      if (forceBal && momentBal) {
          ctx.fillStyle = '#10b981';
          ctx.fillText('IDEALNIE ZBALANSOWANY', 4, 12);
      } else if (forceBal && !momentBal) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('MOMENTY ODCHYLAJĄCE', 4, 12);
          ctx.fillText('(Bujanie silnikiem)', 4, 24);
      } else {
          ctx.fillStyle = '#ef4444';
          ctx.fillText('WIBRACJE (SIŁY)', 4, 12);
      }
      
      // Legend
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px monospace';
      ctx.fillText('Kropka Red: Siła Y/X', 4, h - 14);
      ctx.fillText('Kropka Yel: Moment', 4, h - 4);
    }

    this.valvesToDrive.forEach(v => {
      const theta_lobe = -camAngle + v.lobeRot;
      const alpha_valve_relative = Math.PI - theta_lobe;
      const r = this.engineBuilder.getCamRadius(alpha_valve_relative);
      
      const pushDown = (r - 0.025) * (boreScale || 1.0);
      const valveBaseY = headBase + 0.084 + 0.025 * (boreScale || 1.0);
      const valveY = valveBaseY - pushDown;
      v.valveG.position.set(v.offsetX, valveY, v.offsetZ);
      
      const springBaseY = headBase + 0.084 + 0.012 * (boreScale || 1.0);
      v.spring.position.set(v.offsetX, springBaseY, v.offsetZ);
      
      const currentHeight = valveY - springBaseY + 0.065 * (boreScale || 1.0);
      const uncompressedHeight = 0.085 * (boreScale || 1.0);
      v.spring.scale.y = currentHeight / uncompressedHeight;
      
      if (v.isOHV) {
          if (v.camGroup && v.camGroup.parent && v.pushrod) {
            const boreScale = this.config.boreMm / 84.0 || 1.0;
            const pushrodSideSign = (v.localCamX >= 0) ? 1 : -1;
            const prTopXLocal = pushrodSideSign * 0.13 * boreScale;
            const vTopX = v.offsetX;
            
            const prDisp = (r - 0.025); // Unscaled lift at the cam lobe
            
            // Calculate perfect pivot point based on lever ratio (boreScale)
            // leverRatio = pushDown / prDisp = boreScale
            const totalX = Math.abs(prTopXLocal - vTopX);
            const rHalfPushrod = totalX / (1.0 + boreScale);
            const rHalfValve = totalX - rHalfPushrod;
            
            const pivotX = prTopXLocal - pushrodSideSign * rHalfPushrod;
            const pivotY = valveBaseY + 0.095 * boreScale + 0.005 * boreScale; 
            
            if (v.rocker) {
               v.rocker.position.set(pivotX, pivotY, v.prZ);
               const angle = Math.asin(pushDown / Math.max(0.001, rHalfValve));
               v.rocker.rotation.set(0, 0, (vTopX < pivotX) ? angle : -angle);
               v.rocker.children[0].scale.set(totalX / 0.12, 1, 1);
            }
            
            // Pushrod bottom rests on cam lobe
            const prBottomYLocal = v.camGroup.parent.position.y + r;
            const prBottomXLocal = v.camGroup.parent.position.x;
            
            // Calculate rigid pushrod length ONCE using base circle (r = 0.025)
            const prBottomY0 = v.camGroup.parent.position.y + 0.025;
            const prTopY0 = pivotY; // Horizontal rocker
            const dx = prTopXLocal - prBottomXLocal;
            const dy0 = prTopY0 - prBottomY0;
            const prLen = Math.sqrt(dx*dx + dy0*dy0);
            
            // Move entire pushrod up by prDisp
            v.pushrod.scale.set(1, prLen, 1);
            v.pushrod.position.set(prBottomXLocal + dx/2, prBottomY0 + prDisp + dy0/2, v.prZ);
            
            const up = new THREE.Vector3(0, 1, 0);
            const dir = new THREE.Vector3(dx, dy0, 0).normalize();
            v.pushrod.quaternion.setFromUnitVectors(up, dir);
          }
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (!this.isDisposed) requestAnimationFrame(this.animate);
  }


  dispose() {
    this.isDisposed = true;
    if (this.controls) this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  setLanguage(lang) {
    this.lang = lang;
    this.devUIController.updateCrankshaftUI();
    const devGearboxDesc = document.getElementById('dev_gearbox_desc');
    if (devGearboxDesc && this.config.gearboxPreset) {
      const gDict = (i18n[this.lang] && i18n[this.lang].gearboxPresets) ? i18n[this.lang].gearboxPresets : null;
      if (this.config.gearboxPreset === 'custom') {
        devGearboxDesc.innerHTML = (i18n[this.lang] && i18n[this.lang].ui) ? (i18n[this.lang].ui as any).customGearboxDesc : (i18n.pl.ui as any).customGearboxDesc;
      } else if (gDict && gDict[this.config.gearboxPreset]) {
        devGearboxDesc.innerText = gDict[this.config.gearboxPreset].desc;
      }
    }
  }

}

