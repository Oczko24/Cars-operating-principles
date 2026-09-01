/**
 * Cars-operating-principles - Edukacyjny Silnik 3D
 * Dynamiczny generator układów: Inline, V, VR, Boxer
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

export class Scene3D {
  constructor(container, onFrameStats) {
    this.container = container;
    this.onFrameStats = onFrameStats || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); 

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(2.5, 1.8, 3.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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
    this.config = {
      layout: "Inline",
      stroke: 4,
      rpm: 1000,
      valves: 4,
      cylinders: 4,
      vAngle: 60,
      drivetrain: "drive_rwd",
      suspension: "susp_wishbone",
      clutchType: "single",
      clutchEngaged: true,
      diffType: "open",
      currentGear: "1",
      finalDrive: 3.94
    };

    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.fps = 60;

    this.initMaterials();

    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);
    this.movingCylinders = [];
    this.camshafts = [];
    this.valvesToDrive = [];
    this.forceTrail = [];
    this.momentTrail = [];

    this.setupLighting();
    this.setupEnvironment();
    this.setupTooltip();
    this.setupDevPanel();

    this.rebuildFullCar();

    window.addEventListener("resize", () => this.onResize());
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }



  showGearboxInfo() {
    const currentG = this.config.currentGear;
    let title = "Skrzynia Biegów (Manualna)";
    let principle = "Moc z silnika wchodzi przez wałek sprzęgłowy. Następnie stałe przełożenie (constant mesh) przekazuje napęd na wałek pośredni (countershaft) na dole. Zębatki na wałku głównym kręcą się luźno na łożyskach, dopóki synchronizator nie wepnie jednej z nich na sztywno do wałka głównego.";
    let why = "Silnik spalinowy generuje moc w wąskim zakresie obrotów. Skrzynia biegów działa jak dźwignia, pozwalając na jazdę powoli z dużą siłą (bieg 1) lub szybko z małą siłą (biegi wyższe).";
    let history = "Nowoczesne skrzynie z zębami skośnymi i synchronizatorami wyparły skrzynie z zazębieniem kłowym z lat 20. XX wieku.";
    let examples = "Bieg " + currentG + " wrzucony. Zwróć uwagę na położenie czerwonej przesuwki (synchronizatora). Na 4. biegu wałek wejściowy często jest łączony bezpośrednio z wyjściowym (przełożenie 1:1, direct drive).";

    const drawerTitle = document.getElementById('drawer-title');
    if (drawerTitle) drawerTitle.innerText = title;
    const pPrinciple = document.getElementById('drawer-principle');
    if (pPrinciple) pPrinciple.innerText = principle;
    const pWhy = document.getElementById('drawer-why');
    if (pWhy) pWhy.innerText = why;
    const pHistory = document.getElementById('drawer-history');
    if (pHistory) pHistory.innerText = history;
    const pExamples = document.getElementById('drawer-examples');
    if (pExamples) pExamples.innerText = examples;

    const drawer = document.getElementById('info-drawer');
    if (drawer) drawer.classList.add('open');
  }

  showDiffInfo() {
    const diffType = this.config.diffType;
    let title = "Mechanizm różnicowy";
    let principle = "";
    let why = "";
    let history = "";
    let examples = "";

    if (diffType === 'open') {
      title = "Otwarty (Open Diff)";
      principle = "Satelity (małe zębatki w środku) obracają się swobodnie wokół własnej osi. Jeśli jedno koło traci przyczepność, cała moc wędruje na nie (idzie po najmniejszej linii oporu).";
      why = "Jest tani, bezobsługowy i pozwala na płynne pokonywanie zakrętów (lewe koło kręci się wolniej niż prawe, a satelity kompensują różnicę obrotów).";
      history = "Wynaleziony na przełomie XIX i XX wieku. Standard w 99% zwykłych aut cywilnych.";
      examples = "Toyota Corolla, Honda Civic, bazowe BMW serii 3.";
    } else if (diffType === 'lsd_mech') {
      title = "Szpera (1.5 Way LSD)";
      principle = "Wewnątrz kosza znajdują się płytki cierne (jak w sprzęgle) oraz specjalne krzywki (ramps). Gdy koła obracają się z różną prędkością, krzywki rozpychają się, ściskając płytki. Powoduje to częściowe zablokowanie mechanizmu i przekazanie momentu na oba koła.";
      why = "Idealny kompromis do sportu. Zapobiega bezsensownemu 'paleniu gumy' jednym kołem w zakręcie. 1.5 Way działa mocniej przy przyspieszaniu, a słabiej przy hamowaniu, co wybacza błędy kierowcy.";
      history = "Opracowane dla motorsportu w latach 60. i 70., by opanować rosnącą moc aut RWD na torze.";
      examples = "BMW M3 (wiele generacji), Nissan Silvia, Toyota Supra.";
    } else if (diffType === 'locker') {
      title = "Blokada 100% (Locker)";
      principle = "Ręczne lub pneumatyczne sprzęgło kłowe fizycznie łączy lewą i prawą półoś na sztywno z koszem satelitów. Oś kręci się jak rura (solid axle), a satelity przestają pracować.";
      why = "Jedyna opcja w ekstremalny teren. Nawet jeśli jedno koło zawiśnie w powietrzu, drugie i tak będzie kręcić się z taką samą prędkością, pozwalając wyjechać z błota.";
      history = "Stosowane w pojazdach wojskowych, traktorach i ciężkim sprzęcie roboczym od początku motoryzacji.";
      examples = "Mercedes G-Klasa, Jeep Wrangler Rubicon, Toyota Land Cruiser.";
    }

    // Attempt to inject info to drawer if app.js functions are available globally or by event
    const drawerTitle = document.getElementById('drawer-title');
    if (drawerTitle) drawerTitle.innerText = title;
    
    const pPrinciple = document.getElementById('drawer-principle');
    if (pPrinciple) pPrinciple.innerText = principle;
    
    const pWhy = document.getElementById('drawer-why');
    if (pWhy) pWhy.innerText = why;
    
    const pHistory = document.getElementById('drawer-history');
    if (pHistory) pHistory.innerText = history;
    
    const pExamples = document.getElementById('drawer-examples');
    if (pExamples) pExamples.innerText = examples;

    // Show the drawer if hidden
    const drawer = document.getElementById('info-drawer');
    if (drawer) drawer.classList.add('open');
  }

  setupDevPanel() {
    // Bind listeners to existing HTML elements instead of creating them
    const devLayout = document.getElementById('dev_layout');
    const devCyl = document.getElementById('dev_cyl');
    const devAngle = document.getElementById('dev_angle');
    const devValves = document.getElementById('dev_valves');

    if (devLayout) {
      devLayout.addEventListener('change', (e) => {
        this.config.layout = e.target.value;
        const angleContainer = document.getElementById('dev_angle_container');
        if (angleContainer) {
            angleContainer.style.display = (this.config.layout === 'Inline' || this.config.layout === 'Boxer') ? 'none' : 'block';
        }
        if (this.config.layout === 'VR') {
          devAngle.value = 15;
          document.getElementById('dev_angle_val').innerText = 15;
          this.config.vAngle = 15;
        }
        this.rebuildFullCar();
      });
      // Initial state
      const angleContainer = document.getElementById('dev_angle_container');
      if (angleContainer) {
          angleContainer.style.display = (this.config.layout === 'Inline' || this.config.layout === 'Boxer') ? 'none' : 'block';
      }
    }
    if (devCyl) {
      devCyl.addEventListener('input', (e) => {
        document.getElementById('dev_cyl_val').innerText = e.target.value;
        this.config.cylinders = parseInt(e.target.value);
        this.rebuildFullCar();
      });
    }
    if (devAngle) {
      devAngle.addEventListener('input', (e) => {
        document.getElementById('dev_angle_val').innerText = e.target.value;
        this.config.vAngle = parseInt(e.target.value);
        this.rebuildFullCar();
      });
    }
    if (devValves) {
      devValves.addEventListener('change', (e) => {
        this.config.valves = parseInt(e.target.value);
        this.rebuildFullCar();
      });
    }

    const devStroke = document.getElementById('dev_stroke');
    if (devStroke) {
      devStroke.addEventListener('change', (e) => {
        this.config.stroke = parseInt(e.target.value);
        this.rebuildFullCar();
      });
    }

    const devRpm = document.getElementById('dev_rpm');
    if (devRpm) {
      devRpm.addEventListener('input', (e) => {
        document.getElementById('dev_rpm_val').innerText = e.target.value;
        this.config.rpm = parseInt(e.target.value);
      });
    }
    
    const devClutchEngaged = document.getElementById('dev_clutch_engaged');
    if (devClutchEngaged) {
      devClutchEngaged.addEventListener('change', (e) => {
        this.config.clutchEngaged = e.target.checked;
      });
    }

    const devFinalDrive = document.getElementById('dev_final_drive');
    if (devFinalDrive) {
      devFinalDrive.addEventListener('input', (e) => {
        document.getElementById('dev_final_drive_val').innerText = e.target.value;
        this.config.finalDrive = parseFloat(e.target.value);
      });
    }
    
    const gearBtns = document.querySelectorAll('#dev_gearbox .focus-btn');
    gearBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        gearBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.config.currentGear = e.target.dataset.gear;
        this.showGearboxInfo();
      });
    });
    const devClutch = document.getElementById('dev_clutch');
    const devDiff = document.getElementById('dev_diff');
    if (devClutch) {
      devClutch.addEventListener('change', (e) => {
        this.config.clutchType = e.target.value;
        this.rebuildFullCar();
      });
    }
    if (devDiff) {
      devDiff.addEventListener('change', (e) => {
        this.config.diffType = e.target.value;
        this.rebuildFullCar();
        this.showDiffInfo();
      });
    }

    this.vibCanvas = document.getElementById('dev_vibration_canvas');
    if (this.vibCanvas) {
      this.vibCtx = this.vibCanvas.getContext('2d');
    }
  }

  setupTooltip() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.tooltip = document.createElement('div');
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.background = 'rgba(15, 23, 42, 0.95)';
    this.tooltip.style.color = '#38bdf8';
    this.tooltip.style.padding = '8px 16px';
    this.tooltip.style.borderRadius = '6px';
    this.tooltip.style.border = '1px solid #38bdf8';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.display = 'none';
    this.tooltip.style.fontFamily = 'monospace';
    this.tooltip.style.fontSize = '14px';
    this.tooltip.style.zIndex = '1000';
    this.tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    this.tooltip.style.textTransform = 'uppercase';
    this.tooltip.style.fontWeight = 'bold';
    document.body.appendChild(this.tooltip);

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.tooltip.style.left = e.clientX + 20 + 'px';
      this.tooltip.style.top = e.clientY + 20 + 'px';
      this.updateTooltip();
    });
    this.isRaycasting = false;
  }

  updateTooltip() {
    if (!this.raycaster || !this.scene || !this.camera || this.isRaycasting) return;
    this.isRaycasting = true;
    requestAnimationFrame(() => {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      let foundName = null;
      for (let i=0; i<intersects.length; i++) {
        let obj = intersects[i].object;
        let tempName = null;
        while(obj) {
          if (obj.userData && obj.userData.name) {
            tempName = obj.userData.name;
            break;
          }
          obj = obj.parent;
        }
        if (tempName && !tempName.includes("(Zarys)")) {
            foundName = tempName;
            break;
        }
      }
      if (foundName) {
        this.tooltip.textContent = foundName;
        this.tooltip.style.display = 'block';
      } else {
        this.tooltip.style.display = 'none';
      }
      this.isRaycasting = false;
    });
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
    
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    this.crankcaseLineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.3 });
  }

  setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0f172a, 1.2);
    this.scene.add(hemiLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(8, 12, 10);
    this.scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 1.5);
    fillLight.position.set(-8, 6, -8);
    this.scene.add(fillLight);
  }

  setupEnvironment() {
    const grid = new THREE.GridHelper(30, 60, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.45;
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
    // legacy support for app.js
  }

  setFocus(target) {
    if (target === 'engine') {
      this.controls.target.set(0, 0.4, 0);
      this.camera.position.set(2.5, 1.8, 3.5);
    } else if (target === 'drivetrain') {
      this.controls.target.set(0, 0.2, -1.0);
      this.camera.position.set(2.0, 1.0, -2.5);
    }
  }

  rebuildFullCar() {
    while (this.carGroup.children.length > 0) {
      this.carGroup.remove(this.carGroup.children[0]);
    }
    this.movingCylinders = [];
    this.camshafts = [];
    this.valvesToDrive = [];
    this.forceTrail = [];
    this.momentTrail = [];

    // this.buildChassisFrame(); // Hidden per user request
    this.buildEngineAssembly();
    this.buildDrivetrainAssembly();
    // this.buildSuspensionAssembly(); // Hidden per user request
  }

  buildChassisFrame() {
    const frame = new THREE.Group();
    [-0.55, 0.55].forEach(x => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.8), this.matChassis);
      rail.position.set(x, 0.15, 0);
      rail.userData.name = "Rama nośna";
      frame.add(rail);
    });
    [-1.6, -0.6, 0.4, 1.4].forEach(z => {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.06, 0.08), this.matChassis);
      cross.position.set(0, 0.15, z);
      cross.userData.name = "Belka poprzeczna";
      frame.add(cross);
    });
    this.carGroup.add(frame);
  }

  createCylConfig(id, z, bank, firingAngleDeg, crankPinAngle) {
    const firingAngle = (firingAngleDeg * Math.PI) / 180;
    const is2Stroke = this.config.stroke === 2;
    const cyclePi = is2Stroke ? 2 : 4;
    const phaseOffset = (2 * Math.PI - firingAngle + cyclePi * Math.PI) % (cyclePi * Math.PI);
    return { id, z, bank, crankPinAngle, phaseOffset, firingAngle };
  }

  buildEngineAssembly() {
    const engineGroup = new THREE.Group();
    engineGroup.position.set(0, 0.25, 0);

    const layout = this.config.layout;
    const cylCount = this.config.cylinders;
    const vAngle = this.config.vAngle * Math.PI / 180;
    
    const crankRadius = 0.16;
    const rodLength = 0.48;
    const zSpacing = 0.24;
    const startZ = -(cylCount - 1) * zSpacing / 2;
    

    let cylinderConfigs = [];

    
    // Assign angles based on position in firing order
    for (let i = 0; i < cylCount; i++) {
      let bank = 0;
      let z = startZ + i * zSpacing;
      
      // Determine Bank and Z Offset
      if (layout === "V" || layout === "VR") {
        const actualAngle = layout === "VR" ? 15 * Math.PI/180 : vAngle;
        bank = (i % 2 === 0) ? -actualAngle/2 : actualAngle/2;
        z = -(Math.ceil(cylCount/2) - 1) * zSpacing / 2 + Math.floor(i/2) * zSpacing;
        if (i % 2 !== 0) z += zSpacing * 0.45;
      } else if (layout === "Boxer") {
        bank = (i % 2 === 0) ? -Math.PI/2 : Math.PI/2;
        z = -(Math.ceil(cylCount/2) - 1) * zSpacing / 2 + Math.floor(i/2) * zSpacing;
        if (i % 2 !== 0) z += zSpacing * 0.45;
      }

      // Procedurally generate mathematically perfect Firing Phase
      let firing = 0;
      if (layout === "Inline") {
          if (cylCount === 4) firing = [0, 540, 180, 360][i];
          else if (cylCount === 6) firing = [0, 480, 240, 600, 120, 360][i];
          else firing = i * (720 / cylCount);
      } else if (layout === "Boxer") {
          let pairFiring = Math.floor(i / 2) * (720 / cylCount);
          firing = (i % 2 === 0) ? pairFiring : (pairFiring + 360);
      } else { // V or VR
          if (cylCount === 8) firing = [0, 540, 270, 90, 630, 450, 360, 180][i];
          else firing = i * (720 / cylCount);
      }

      if (this.config.stroke === 2) {
          firing = firing / 2;
      }

      // KRYTYCZNE DLA FIZYKI: Kąt czopa korbowodu MUSI być idealnie zsynchronizowany 
      // z kątem bloku (bank) i fazą zapłonu, aby tłok był w GMP dokładnie podczas zapłonu.
      let crankPin = (firing * Math.PI / 180) + bank;
      
      cylinderConfigs.push(this.createCylConfig(i+1, z, bank, firing, crankPin));
    }

    const maxZ = Math.max(...cylinderConfigs.map(c => c.z)) + 0.15;
    const minZ = Math.min(...cylinderConfigs.map(c => c.z)) - 0.15;
    const engineLength = maxZ - minZ;

    // Crankcase as Wireframe to not obscure internals
    const crankcase = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.56, 0.22, engineLength + 0.1)), 
      this.crankcaseLineMat
    );
    crankcase.position.set(0, -0.11, (maxZ+minZ)/2);
    crankcase.userData.name = "Miska olejowa (Zarys)";
    engineGroup.add(crankcase);

    const crankMaster = new THREE.Group();
    const crankShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, engineLength + 0.2, 32), this.matSteel);
    crankShaft.rotation.x = Math.PI / 2;
    crankShaft.position.z = (maxZ+minZ)/2;
    crankShaft.userData.name = "Wał korbowy";
    crankMaster.add(crankShaft);

    const crankGear = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 32), this.matDarkSteel);
    crankGear.rotation.x = Math.PI / 2;
    crankGear.position.z = maxZ + 0.05;
    crankGear.userData.name = "Koło zębate wału";
    crankMaster.add(crankGear);

    cylinderConfigs.forEach(cfg => {
      const throwG = new THREE.Group();
      throwG.position.z = cfg.z;
      throwG.rotation.z = cfg.crankPinAngle;

      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 24), this.matSteel);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0, crankRadius, 0); 
      pin.userData.name = "Czop korbowodowy";
      throwG.add(pin);

      [-0.045, 0.045].forEach(zOff => {
        const web = new THREE.Mesh(new THREE.BoxGeometry(0.09, crankRadius * 1.5, 0.02), this.matDarkSteel);
        web.position.set(0, crankRadius * 0.4, zOff);
        throwG.add(web);
        const counterW = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 24, 1, false, 0, Math.PI), this.matDarkSteel);
        counterW.rotation.z = Math.PI / 2;
        counterW.position.set(0, -0.04, zOff);
        throwG.add(counterW);
      });
      crankMaster.add(throwG);
    });
    engineGroup.add(crankMaster);
    this.crankMaster = crankMaster;

    const banks = {};
    cylinderConfigs.forEach(cfg => {
      // Group by approx bank angle to avoid precision issues
      const bankKey = cfg.bank.toFixed(2);
      if (!banks[bankKey]) banks[bankKey] = [];
      banks[bankKey].push(cfg);
    });

    this.banksData = [];
    const explodeDist = this.explodedFactor * 0.45;
    const boreRadius = 0.105;
    const sleeveRadius = 0.11;
    const sleeveLength = 0.46;
    const pistonLength = 0.16;
    const sleeveCenter = 0.55; 
    const headBase = 0.82 + explodeDist * 1.5; 
    const trueCamY = 1.020 + explodeDist * 1.5;

    Object.keys(banks).forEach(bankAngleStr => {
      const bankAngle = parseFloat(bankAngleStr);
      const cylinders = banks[bankAngleStr];

      const bankG = new THREE.Group();
      bankG.rotation.z = bankAngle;
      engineGroup.add(bankG);

      const camBaseIn = new THREE.Group();
      const camBaseEx = new THREE.Group();
      bankG.add(camBaseIn);
      bankG.add(camBaseEx);
      
      camBaseIn.position.set(-0.045, trueCamY, 0);
      camBaseEx.position.set(0.045, trueCamY, 0);

      const camShaftIn = new THREE.Group();
      const camShaftEx = new THREE.Group();
      camBaseIn.add(camShaftIn);
      camBaseEx.add(camShaftEx);

      const bMinZ = Math.min(...cylinders.map(c => c.z)) - 0.05;
      const bMaxZ = maxZ + 0.08; 
      const len = bMaxZ - bMinZ;
      const midZ = (bMinZ + bMaxZ) / 2;

      const meshIn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.matBronze);
      meshIn.rotation.x = Math.PI / 2;
      meshIn.position.z = midZ;
      meshIn.userData.name = "Wałek rozrządu ssący";
      camShaftIn.add(meshIn);

      const meshEx = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.matBronze);
      meshEx.rotation.x = Math.PI / 2;
      meshEx.position.z = midZ;
      meshEx.userData.name = "Wałek rozrządu wydechowy";
      camShaftEx.add(meshEx);

      const gearZ = maxZ + 0.05; 
      const gearIn = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.matGold);
      gearIn.rotation.x = Math.PI / 2;
      gearIn.position.z = gearZ;
      gearIn.userData.name = "Koło wałka ssącego";
      camShaftIn.add(gearIn);

      const gearEx = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.matGold);
      gearEx.rotation.x = Math.PI / 2;
      gearEx.position.z = gearZ;
      gearEx.userData.name = "Koło wałka wydechowego";
      camShaftEx.add(gearEx);

      this.camshafts.push(camShaftIn, camShaftEx);

      cylinders.forEach(cfg => {
        const cylG = new THREE.Group();
        cylG.position.z = cfg.z;
        bankG.add(cylG);

        const sleeve = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLength, 16)), this.lineMat);
        sleeve.position.set(0, sleeveCenter + explodeDist, 0);
        sleeve.userData.name = "Tuleja cylindra (Zarys)";
        cylG.add(sleeve);

        const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.28, 0.16, zSpacing - 0.02)), this.lineMat);
        head.position.set(0, headBase + 0.08, 0);
        head.userData.name = "Głowica cylindra (Zarys)";
        cylG.add(head);

        const valvesList = [];
        if (this.config.valves === 4) {
            const vIn1 = this.createValve(this.matSteel, "Ssący 1");
            const vIn2 = this.createValve(this.matSteel, "Ssący 2");
            const vEx1 = this.createValve(this.matSteel, "Wydechowy 1");
            const vEx2 = this.createValve(this.matSteel, "Wydechowy 2");
            const sIn1 = this.createSpringMesh();
            const sIn2 = this.createSpringMesh();
            const sEx1 = this.createSpringMesh();
            const sEx2 = this.createSpringMesh();
            cylG.add(vIn1, vIn2, vEx1, vEx2, sIn1, sIn2, sEx1, sEx2);
            valvesList.push(
                { vg: vIn1, sp: sIn1, type: 'in', offZ: -0.045 },
                { vg: vIn2, sp: sIn2, type: 'in', offZ: 0.045 },
                { vg: vEx1, sp: sEx1, type: 'ex', offZ: -0.045 },
                { vg: vEx2, sp: sEx2, type: 'ex', offZ: 0.045 }
            );
        } else {
            const vIn = this.createValve(this.matSteel, "Ssący");
            const vEx = this.createValve(this.matSteel, "Wydechowy");
            const sIn = this.createSpringMesh();
            const sEx = this.createSpringMesh();
            cylG.add(vIn, vEx, sIn, sEx);
            valvesList.push(
                { vg: vIn, sp: sIn, type: 'in', offZ: 0 },
                { vg: vEx, sp: sEx, type: 'ex', offZ: 0 }
            );
        }

        const sparkPlug = this.createSparkPlug();
        sparkPlug.position.set(0, 0.82 + explodeDist, 0);
        cylG.add(sparkPlug);

        const fireMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0 });
        const fireMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), fireMat);
        fireMesh.position.set(0, 0.76 + explodeDist, 0); 
        cylG.add(fireMesh);

        const pistonG = this.createPiston(boreRadius, pistonLength);
        cylG.add(pistonG);

        const rodG = this.createConnectingRod(rodLength);
        engineGroup.add(rodG);

        const lobeRotIn = cfg.firingAngle / 2 + Math.PI / 4;
        const lobeRotEx = cfg.firingAngle / 2 + (7 * Math.PI) / 4;

        this.movingCylinders.push({
          id: cfg.id, z: cfg.z, bank: cfg.bank,
          crankPinAngle: cfg.crankPinAngle, phaseOffset: cfg.phaseOffset,
          crankRadius, rodLength, sleeve, head, pistonG, rodG,
          fireMesh, fireMat, sparkPlug
        });

        valvesList.forEach(vData => {
            const isEx = vData.type === 'ex';
            const camGroup = isEx ? camShaftEx : camShaftIn;
            const lobeRot = isEx ? lobeRotEx : lobeRotIn;
            const lobe = this.createCamLobe();
            lobe.position.set(0, 0, cfg.z + vData.offZ);
            lobe.rotation.z = lobeRot;
            camGroup.add(lobe);
            
            this.valvesToDrive.push({
                valveG: vData.vg,
                spring: vData.sp,
                camGroup: camGroup,
                lobeRot: lobeRot,
                offsetX: isEx ? 0.045 : -0.045, // IN/EX X-offset
                offsetZ: vData.offZ             // Dual valve Z-offset
            });
        });
      });

      // Zamiast błędnego ExtrudeGeometry, używamy czystego TubeGeometry, by uniknąć artefaktów.
      const beltPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.045, 0, 0),
        new THREE.Vector3(-0.06, trueCamY / 2, 0),
        new THREE.Vector3(-0.087, trueCamY, 0),
        new THREE.Vector3(-0.045, trueCamY + 0.042, 0),
        new THREE.Vector3(0.045, trueCamY + 0.042, 0),
        new THREE.Vector3(0.087, trueCamY, 0),
        new THREE.Vector3(0.06, trueCamY / 2, 0),
        new THREE.Vector3(0.045, 0, 0)
      ], true);
      
      const bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), this.matBelt);
      bankBelt.position.set(0, 0, gearZ);
      bankBelt.userData.name = "Pasek rozrządu (Wzmacniany)";
      bankG.add(bankBelt);

      this.banksData.push({ bankG, camBaseIn, camBaseEx, bankBelt });
    });

    this.carGroup.add(engineGroup);
    this.engineZMin = minZ; // Used to place gearbox securely behind engine
  }

  createConnectingRod(length) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.025, length - 0.04, 0.015), this.matSteel);
    shaft.position.y = length / 2;
    shaft.userData.name = "Trzon korbowodu";
    g.add(shaft);
    const bigEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 32), this.matDarkSteel);
    bigEnd.rotation.x = Math.PI / 2;
    bigEnd.userData.name = "Stopa korbowodu";
    g.add(bigEnd);
    const smallEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 32), this.matDarkSteel);
    smallEnd.rotation.x = Math.PI / 2;
    smallEnd.position.y = length;
    smallEnd.userData.name = "Główka korbowodu";
    g.add(smallEnd);
    const bolt1 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), this.matSteel);
    bolt1.position.set(-0.035, -0.01, 0);
    g.add(bolt1);
    const bolt2 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), this.matSteel);
    bolt2.position.set(0.035, -0.01, 0);
    g.add(bolt2);
    g.userData.name = "Korbowód";
    return g;
  }

  createPiston(radius, length) {
    const g = new THREE.Group();
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), this.matPiston);
    piston.position.y = length / 2;
    piston.userData.name = "Tłok";
    g.add(piston);
    for (let i=0; i<3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius+0.001, 0.002, 8, 32), this.matDarkSteel);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = length - 0.02 - i * 0.012;
      ring.userData.name = "Pierścień tłokowy";
      g.add(ring);
    }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, radius*1.8, 16), this.matSteel);
    pin.rotation.x = Math.PI / 2;
    pin.position.y = 0.04;
    pin.userData.name = "Sworzeń tłokowy";
    g.add(pin);
    g.userData.name = "Tłok układu korbowego";
    return g;
  }

  createSparkPlug() {
    const g = new THREE.Group();
    const ceramic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 16), this.matCeramic);
    ceramic.position.y = 0.02;
    ceramic.userData.name = "Izolator świecy";
    g.add(ceramic);
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.015, 6), this.matDarkSteel);
    hex.position.y = 0.0075;
    hex.userData.name = "Świeca zapłonowa";
    g.add(hex);
    g.userData.name = "Świeca zapłonowa";
    return g;
  }

  createValve(material, name) {
    const vg = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 12), material);
    stem.userData.name = "Trzonek zaworu " + name;
    vg.add(stem);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 24), material);
    disc.position.y = -0.08;
    disc.userData.name = "Grzybek zaworu " + name;
    vg.add(disc);
    const retainer = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 16), this.matDarkSteel);
    retainer.position.y = 0.065;
    retainer.userData.name = "Talerzyk oporowy";
    vg.add(retainer);
    const tappet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 24), this.matSteel);
    tappet.position.y = 0.08 + 0.0075; 
    tappet.userData.name = "Szklanka popychacza";
    vg.add(tappet);
    vg.userData.name = "Zawór " + name;
    return vg;
  }

  createSpringMesh() {
    class CoilCurve extends THREE.Curve {
      getPoint(t) {
        const turns = 6;
        const r = 0.011;
        const h = 0.085;
        return new THREE.Vector3(r * Math.cos(t * Math.PI * 2 * turns), t * h, r * Math.sin(t * Math.PI * 2 * turns));
      }
    }
    const geo = new THREE.TubeGeometry(new CoilCurve(), 64, 0.0025, 8, false);
    const mesh = new THREE.Mesh(geo, this.matGold);
    mesh.userData.name = "Sprężyna zaworowa";
    return mesh;
  }

  createCamLobe() {
    const shape = new THREE.Shape();
    const R_base = 0.025;
    const R_max = 0.045;
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      let r = R_base;
      let alpha = angle;
      if (alpha > Math.PI) alpha -= Math.PI * 2;
      if (Math.abs(alpha) < Math.PI / 4) {
        r = R_base + (R_max - R_base) * Math.pow(Math.cos(alpha * 2), 2);
      }
      const x = Math.sin(angle) * r;
      const y = Math.cos(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    geo.translate(0, 0, -0.01);
    const mesh = new THREE.Mesh(geo, this.matSteel);
    mesh.userData.name = "Krzywka rozrządu";
    return mesh;
  }

  getCamRadius(angle) {
    const R_base = 0.025;
    const R_max = 0.045;
    let alpha = angle % (Math.PI * 2);
    if (alpha > Math.PI) alpha -= Math.PI * 2;
    if (alpha < -Math.PI) alpha += Math.PI * 2;
    if (Math.abs(alpha) < Math.PI / 4) {
      return R_base + (R_max - R_base) * Math.pow(Math.cos(alpha * 2), 2);
    }
    return R_base;
  }

  buildDrivetrainAssembly() {
    const dt = new THREE.Group();
    
    // 1. SPRZĘGŁO (Clutch)
    const clutchGroup = new THREE.Group();
    clutchGroup.position.set(0, 0, this.engineZMin - 0.05); 
    
    const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), this.matDarkSteel);
    flywheel.rotation.x = Math.PI / 2;
    flywheel.userData.name = "Koło Zamachowe";
    clutchGroup.add(flywheel);
    
    const frictionDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 32), this.matBronze);
    frictionDisk.rotation.x = Math.PI / 2;
    frictionDisk.position.z = -0.03;
    frictionDisk.userData.name = "Tarcza Sprzęgła (Cierna)";
    clutchGroup.add(frictionDisk);
    
    const pressurePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32), this.matSteel);
    pressurePlate.rotation.x = Math.PI / 2;
    pressurePlate.position.z = -0.06;
    pressurePlate.userData.name = "Docisk Sprzęgła";
    clutchGroup.add(pressurePlate);

    if (this.config.clutchType === 'dual') {
        const frictionDisk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32), this.matBronze);
        frictionDisk2.rotation.x = Math.PI / 2;
        frictionDisk2.position.z = -0.09;
        frictionDisk2.userData.name = "Druga Tarcza Sprzęgła (DCT)";
        clutchGroup.add(frictionDisk2);
    }
    
    this.flywheelMesh = flywheel;
    this.pressurePlateMesh = pressurePlate;
    this.frictionDiskMesh = frictionDisk;
    dt.add(clutchGroup);

    
    // 2. SKRZYNIA BIEGÓW (Manualna - 3 wałkowa)
    const gearbox = new THREE.Group();
    gearbox.position.set(0, 0, this.engineZMin - 0.4); 
    
    // Zarys obudowy
    const casing = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.3, 0.4, 0.7)), 
      this.crankcaseLineMat
    );
    casing.position.y = -0.1;
    casing.position.z = -0.15;
    casing.userData.name = "Obudowa Skrzyni (Zarys)";
    gearbox.add(casing);

    // Wałek Sprzęgłowy (Input Shaft)
    const inputGroup = new THREE.Group();
    inputGroup.position.z = 0.15;
    const inShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 16), this.matSteel);
    inShaft.rotation.x = Math.PI / 2;
    inputGroup.add(inShaft);
    const inGear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), this.matGold);
    inGear.rotation.x = Math.PI / 2;
    inGear.position.z = -0.04;
    inGear.userData.name = "Zębatka Napędowa Wałka Sprzęgłowego";
    inputGroup.add(inGear);
    gearbox.add(inputGroup);
    this.gbInputGroup = inputGroup;

    // Wałek Pośredni (Countershaft / Layshaft)
    const counterGroup = new THREE.Group();
    counterGroup.position.y = -0.14; // Idealne zazębienie (suma promieni to 0.14)
    counterGroup.position.z = -0.15;
    const counterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 16), this.matDarkSteel);
    counterShaft.rotation.x = Math.PI / 2;
    counterGroup.add(counterShaft);
    
    // Zębatki na wałku pośrednim (stałe)
    const cGears = [
      { r: 0.08, z: 0.26 },  // Napęd od wejściowego
      { r: 0.04, z: 0.12 },  // Bieg 1
      { r: 0.06, z: 0.02 },  // Bieg 2
      { r: 0.08, z: -0.08 }, // Bieg 3
      { r: 0.10, z: -0.18 }, // Bieg 5
      { r: 0.04, z: -0.28 }  // Bieg Wsteczny (R)
    ];
    cGears.forEach((g, idx) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02, 24), this.matSteel);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = g.z;
      counterGroup.add(mesh);
    });
    gearbox.add(counterGroup);
    this.gbCounterGroup = counterGroup;

    // Wałek Główny (Output Shaft)
    const outputGroup = new THREE.Group();
    outputGroup.position.z = -0.25; // Współosiowo z wejściowym, ale głębiej
    const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 16), this.matDarkSteel);
    outShaft.rotation.x = Math.PI / 2;
    outputGroup.add(outShaft);
    
    // Zębatki na wałku głównym (kręcą się luźno dopóki nie zostaną zapięte synchronizatorem)
    const oGears = [
      { r: 0.10, z: 0.22, name: "Bieg 1" },
      { r: 0.08, z: 0.12, name: "Bieg 2" },
      { r: 0.06, z: 0.02, name: "Bieg 3" },
      { r: 0.04, z: -0.08, name: "Bieg 5" },
      { r: 0.10, z: -0.18, name: "Bieg R" }
    ];
    this.gbOutGears = [];
    oGears.forEach(g => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02, 24), this.matBronze);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = g.z;
      mesh.userData.name = "Zębatka " + g.name;
      outputGroup.add(mesh);
      this.gbOutGears.push(mesh);
    });
    
    // Synchronizatory (Przesuwki)
    const syncMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
    const sync1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), syncMat);
    sync1.rotation.x = Math.PI / 2;
    sync1.position.z = 0.17; // Między B1 a B2
    outputGroup.add(sync1);
    this.gbSync12 = sync1;

    const sync2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), syncMat);
    sync2.rotation.x = Math.PI / 2;
    sync2.position.z = 0.07; // Między B3 a B4(wejściowym) - wait, B4 is 1:1 direct drive locking input to output!
    outputGroup.add(sync2);
    this.gbSync34 = sync2;
    
    gearbox.add(outputGroup);
    this.gbOutputGroup = outputGroup;
    dt.add(gearbox);

    // 3. WAŁ NAPĘDOWY (Prop Shaft)
    const propShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 16), this.matSteel);
    propShaft.rotation.x = Math.PI / 2;
    propShaft.position.set(0, 0, this.engineZMin - 1.4);
    propShaft.userData.name = "Wał Napędowy";
    dt.add(propShaft);
    this.propShaftMesh = propShaft;


    // 4. DYFERENCJAŁ (Differential)
    const diffGroup = new THREE.Group();
    diffGroup.position.set(0, 0, this.engineZMin - 2.2);

    const diffCasing = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(0.22, 16, 16)),
      this.crankcaseLineMat
    );
    diffCasing.userData.name = "Obudowa Dyferencjału (Zarys)";
    diffGroup.add(diffCasing);

    // Wałek Atakujący (Pinion)
    const pinionGear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.12, 16), this.matGold);
    pinionGear.rotation.x = Math.PI / 2;
    pinionGear.position.z = 0.14; // Wychodzi do przodu w stronę wału napędowego
    pinionGear.userData.name = "Wałek Atakujący (Pinion)";
    diffGroup.add(pinionGear);
    this.pinionMesh = pinionGear;

    // Koło Talerzowe (Ring Gear)
    const ringGear = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32), this.matBronze);
    ringGear.rotation.z = Math.PI / 2;
    ringGear.position.x = -0.06; // Odsunięte na bok by zazębić się z pinionem
    ringGear.userData.name = "Koło Talerzowe (Ring Gear)";
    diffGroup.add(ringGear);
    this.ringGearMesh = ringGear;

    // Kosz Satelitów (Carrier) - Kręci się razem z Kołem Talerzowym
    const carrier = new THREE.Group();
    carrier.position.x = -0.03; // Kosz wewnątrz koła talerzowego
    
    // Wizualizacja Kosza (ramka)
    const carrierBox = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.22), this.matDarkSteel);
    carrier.add(carrierBox);

    const spiderTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.04, 16), this.matSteel);
    spiderTop.position.y = 0.07;
    spiderTop.userData.name = "Satelita Górny (Krzyżak)";
    carrier.add(spiderTop);
    
    const spiderBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.04, 16), this.matSteel);
    spiderBottom.rotation.x = Math.PI;
    spiderBottom.position.y = -0.07;
    spiderBottom.userData.name = "Satelita Dolny (Krzyżak)";
    carrier.add(spiderBottom);

    if (this.config.diffType === 'lsd_mech') {
      const lsdPlates = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16), this.matDarkSteel);
      lsdPlates.rotation.z = Math.PI / 2;
      lsdPlates.userData.name = "Płytki Cierne (LSD 1.5 Way)";
      carrier.add(lsdPlates);
    } else if (this.config.diffType === 'locker') {
      const lockerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 16), this.matGold);
      lockerPin.rotation.z = Math.PI / 2;
      lockerPin.userData.name = "Blokada 100% (Sprzęgło Kłowe)";
      carrier.add(lockerPin);
    }
    
    diffGroup.add(carrier);
    this.diffCarrier = carrier;

    // Półosie i Koła Koronowe (Side Gears)
    const leftAxle = new THREE.Group();
    const rightAxle = new THREE.Group();

    const sideGearL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.04, 16), this.matGold);
    sideGearL.rotation.z = -Math.PI / 2;
    sideGearL.position.x = -0.03;
    sideGearL.userData.name = "Koło Koronowe Lewe";
    leftAxle.add(sideGearL);

    const sideGearR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.04, 16), this.matGold);
    sideGearR.rotation.z = Math.PI / 2;
    sideGearR.position.x = 0.03;
    sideGearR.userData.name = "Koło Koronowe Prawe";
    rightAxle.add(sideGearR);

    const axleShaftL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 16), this.matSteel);
    axleShaftL.rotation.z = Math.PI / 2;
    axleShaftL.position.x = -0.63;
    axleShaftL.userData.name = "Półoś Lewa";
    leftAxle.add(axleShaftL);
    
    const axleShaftR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 16), this.matSteel);
    axleShaftR.rotation.z = Math.PI / 2;
    axleShaftR.position.x = 0.63;
    axleShaftR.userData.name = "Półoś Prawa";
    rightAxle.add(axleShaftR);

    diffGroup.add(leftAxle);
    diffGroup.add(rightAxle);
    this.leftAxleG = leftAxle;
    this.rightAxleG = rightAxle;

    dt.add(diffGroup);

    dt.position.set(0, 0.2, 0); 
    this.carGroup.add(dt);
  }
  buildSuspensionAssembly() {
    const suspGroup = new THREE.Group();
    // Simplified suspension for brevity
    [ { x: -0.88, z: 0 }, { x: 0.88, z: 0 }, { x: -0.88, z: -2.4 }, { x: 0.88, z: -2.4 } ].forEach(w => {
      const wheel = this.createCarWheel();
      wheel.position.set(w.x, 0.2, w.z);
      suspGroup.add(wheel);
    });
    this.carGroup.add(suspGroup);
  }

  createCarWheel() {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.10, 24, 32), this.matTire);
    tire.rotation.y = Math.PI / 2;
    tire.userData.name = "Opona";
    wg.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.15, 24), this.matRim);
    rim.rotation.z = Math.PI / 2;
    rim.userData.name = "Felga";
    wg.add(rim);
    wg.userData.name = "Koło";
    return wg;
  }

  animate(time) {
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
        cylinders: this.getCylindersState()
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

    // --- DRIVETRAIN ANIMATION ---
    // Używamy ciągłego drivetrainAngle, by uniknąć resetowania rotacji (przeskoków) gdy crankAngle wraca do 0
    let dtAngle = this.drivetrainAngle;
    if (!this.isPlaying) dtAngle = this.crankAngle; // podczas suwaka ręcznego, używamy crankAngle

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
    
    // Wybór biegów i ich ratios (Astra H 1.8 140KM F17 gearbox)
    const gearConfigs = {
      '1': { idx: 0, ratio: 0.04 / 0.10, realRatio: 3.727, sync: this.gbSync12, syncZ: 0.205 },
      '2': { idx: 1, ratio: 0.06 / 0.08, realRatio: 2.136, sync: this.gbSync12, syncZ: 0.135 },
      '3': { idx: 2, ratio: 0.08 / 0.06, realRatio: 1.414, sync: this.gbSync34, syncZ: 0.035 },
      '4': { idx: -1, ratio: 1.0, realRatio: 1.121, sync: this.gbSync34, syncZ: 0.105 }, // Bezpośrednie (Direct drive visually)
      '5': { idx: 3, ratio: 0.10 / 0.04, realRatio: 0.892, sync: null, syncZ: 0 },
      'R': { idx: 4, ratio: - (0.04 / 0.10), realRatio: -3.308, sync: null, syncZ: 0 },
      'N': { idx: -1, ratio: 0, realRatio: 0, sync: null, syncZ: 0 }
    };

    const currentG = this.config.currentGear || '1';
    const gConf = gearConfigs[currentG];

    let outputSpeed = 0;
    let overallGearRatio = 0;
    if (currentG === '4') {
      outputSpeed = inputSpeed; // Direct drive visually
      overallGearRatio = 1.0 / gConf.realRatio;
    } else if (currentG === 'N') {
      outputSpeed = 0;
      overallGearRatio = 0;
    } else {
      outputSpeed = -counterSpeed * gConf.ratio;
      overallGearRatio = 1.0 / gConf.realRatio;
    }

    // Obliczanie prędkości kół (km/h) na podstawie RPM silnika
    const wheelSpeedEl = document.getElementById('dev_wheel_speed');
    if (wheelSpeedEl) {
      if (this.config.clutchEngaged && overallGearRatio !== 0) {
        // wheelRPM = engineRPM * overallGearRatio / finalDrive
        const wheelRPM = this.config.rpm * overallGearRatio / this.config.finalDrive;
        // Założony obwód koła ~1.98m
        const kmh = (wheelRPM * 1.98 * 60) / 1000;
        wheelSpeedEl.innerText = Math.abs(Math.round(kmh)) + ' km/h';
      } else {
        wheelSpeedEl.innerText = '0 km/h';
      }
    }

    if (this.gbOutputGroup) this.gbOutputGroup.rotation.z = outputSpeed;
    
    // Animuj luźne zębatki (są podgrupą gbOutputGroup, więc ich rotacja Y musi być różnicą)
    if (this.gbOutGears) {
      this.gbOutGears[0].rotation.y = (-counterSpeed * (0.04 / 0.10)) - outputSpeed; 
      this.gbOutGears[1].rotation.y = (-counterSpeed * (0.06 / 0.08)) - outputSpeed;
      this.gbOutGears[2].rotation.y = (-counterSpeed * (0.08 / 0.06)) - outputSpeed;
      this.gbOutGears[3].rotation.y = (-counterSpeed * (0.10 / 0.04)) - outputSpeed;
      this.gbOutGears[4].rotation.y = (-counterSpeed * (-0.04 / 0.10)) - outputSpeed; 
    }
    
    // Ruch synchronizatorów
    if (this.gbSync12) {
      this.gbSync12.position.z = THREE.MathUtils.lerp(this.gbSync12.position.z, (currentG==='1'||currentG==='2') ? gConf.syncZ : 0.17, 0.1);
    }
    if (this.gbSync34) {
      this.gbSync34.position.z = THREE.MathUtils.lerp(this.gbSync34.position.z, (currentG==='3'||currentG==='4') ? gConf.syncZ : 0.07, 0.1);
    }
    
    if (this.propShaftMesh) this.propShaftMesh.rotation.y = outputSpeed;
    if (this.pinionMesh) this.pinionMesh.rotation.y = outputSpeed;

    const finalDriveRatio = this.config.finalDrive || 3.94;
    const ringSpeed = outputSpeed / finalDriveRatio;
    
    if (this.ringGearMesh) this.ringGearMesh.rotation.x = ringSpeed;
    if (this.diffCarrier) this.diffCarrier.rotation.x = ringSpeed;
    if (this.leftAxleG) this.leftAxleG.rotation.x = ringSpeed;
    if (this.rightAxleG) this.rightAxleG.rotation.x = ringSpeed;
    // --- END DRIVETRAIN ANIMATION ---


    const camAngle = this.config.stroke === 2 ? this.crankAngle : this.crankAngle / 2;
    this.camshafts.forEach(cam => {
      cam.rotation.z = -camAngle;
    });

    const explodeDist = this.explodedFactor * 0.45;
    const sleeveCenter = 0.55;
    const headBase = 0.82 + explodeDist * 1.5;
    const trueCamY = 1.020 + explodeDist * 1.5;

    if (this.banksData) {
      this.banksData.forEach(bank => {
        bank.camBaseIn.position.set(-0.045, trueCamY, 0);
        bank.camBaseEx.position.set(0.045, trueCamY, 0);
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
      part.head.position.set(0, headBase + 0.08, 0);
      part.sparkPlug.position.set(0, 0.82 + explodeDist, 0);
      part.fireMesh.position.set(0, 0.76 + explodeDist, 0);

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
      if (strokeAngle >= Math.PI * 2 && strokeAngle < Math.PI * 2.35) {        const prog = (strokeAngle - Math.PI * 2) / 0.35;
        part.fireMat.opacity = 0.95 * (1.0 - prog);
        part.fireMesh.scale.setScalar(0.8 + prog * 0.5);
      } else {
        part.fireMat.opacity = 0;
      }
    });

    if (this.vibCtx) {
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
      
      // Keep only last 360 points (approx 2 rotations)
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

    this.valvesToDrive.forEach(v => {      const theta_lobe = -camAngle + v.lobeRot;
      const alpha_valve_relative = Math.PI - theta_lobe;
      const r = this.getCamRadius(alpha_valve_relative);
      
      const pushDown = r - 0.025;
      const valveY = 0.90 + explodeDist * 1.5 - pushDown;
      v.valveG.position.set(v.offsetX, valveY, v.offsetZ);
      
      const springBaseY = 0.88 + explodeDist * 1.5;
      v.spring.position.set(v.offsetX, springBaseY, v.offsetZ);
      
      const currentHeight = valveY - springBaseY + 0.065;
      const uncompressedHeight = 0.085;
      v.spring.scale.y = currentHeight / uncompressedHeight;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  getCylindersState() {
    return this.movingCylinders.map(p => {
      let phase = "";
      let phaseClass = "";
      let desc = "";
      
      if (this.config.stroke === 2) {
        const strokeAngle = (this.crankAngle + p.phaseOffset) % (Math.PI * 2);
        if (strokeAngle < Math.PI) {
          phase = "PRACA / WYDECH";
          phaseClass = "stroke-power";
          desc = "Rozprężanie i jednoczesne płukanie cylindra";
        } else {
          phase = "SPRĘŻANIE / SSANIE";
          phaseClass = "stroke-compression";
          desc = "Sprężanie w cylindrze i ssanie do karteru";
        }
      } else {
        const strokeAngle = (this.crankAngle + p.phaseOffset) % (Math.PI * 4);
        phase = "1. SSANIE";
        phaseClass = "stroke-intake";
        desc = "Zawór ssący otwarty, zasysanie powietrza";
        if (strokeAngle >= Math.PI && strokeAngle < Math.PI * 2) {
          phase = "2. SPRĘŻANIE";
          phaseClass = "stroke-compression";
          desc = "Tłok idzie w górę, ściskanie mieszanki";
        } else if (strokeAngle >= Math.PI * 2 && strokeAngle < Math.PI * 3) {
          phase = "3. PRACA";
          phaseClass = "stroke-power";
          desc = "Iskra świecy, zapłon gazów, pchanie tłoka w dół";
        } else if (strokeAngle >= Math.PI * 3) {
          phase = "4. WYDECH";
          phaseClass = "stroke-exhaust";
          desc = "Zawór wydechowy otwarty, wyrzut spalin";
        }
      }
      return { id: p.id, phase, phaseClass, desc };
    });
  }
}
