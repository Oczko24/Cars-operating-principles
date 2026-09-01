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
      finalDrive: 3.94,
      placement: "front",
      orientation: "longitudinal",
      tiltAngle: 0,
      showDatum: false
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

    // Podłączenie canvas wibracji (panel Fizyka & Wyważenie)
    this.vibCanvas = document.getElementById('dev_vibration_canvas');
    if (this.vibCanvas) {
      this.vibCtx = this.vibCanvas.getContext('2d');
    }

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
    const setupButtonGroup = (groupId, callback) => {
      const container = document.getElementById(groupId);
      if (!container) return;
      const btns = container.querySelectorAll('button');
      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          btns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          callback(e.target.getAttribute('data-val') || e.target.getAttribute('data-gear'));
        });
      });
    };

    setupButtonGroup('dev_layout', (val) => {
      this.config.layout = val;
      const angleContainer = document.getElementById('dev_angle_container');
      if (angleContainer) {
          angleContainer.style.display = (val === 'Inline' || val === 'Boxer') ? 'none' : 'block';
      }
      if (val === 'VR') {
        const devAngle = document.getElementById('dev_angle');
        if (devAngle) devAngle.value = 15;
        const devAngleVal = document.getElementById('dev_angle_val');
        if (devAngleVal) devAngleVal.innerText = 15;
        this.config.vAngle = 15;
      }
      this.rebuildFullCar();
    });

    const devCyl = document.getElementById('dev_cyl');
    if (devCyl) {
      devCyl.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_cyl_val');
        if (valEl) valEl.innerText = e.target.value;
        this.config.cylinders = parseInt(e.target.value);
        this.rebuildFullCar();
      });
    }

    const devAngle = document.getElementById('dev_angle');
    if (devAngle) {
      devAngle.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_angle_val');
        if (valEl) valEl.innerText = e.target.value;
        this.config.vAngle = parseInt(e.target.value);
        this.rebuildFullCar();
      });
    }

    setupButtonGroup('dev_valves', (val) => {
      this.config.valves = parseInt(val);
      this.rebuildFullCar();
    });

    setupButtonGroup('dev_valvetrain', (val) => {
      this.config.valvetrain = val;
      this.rebuildFullCar();
    });

    setupButtonGroup('dev_stroke', (val) => {
      this.config.stroke = parseInt(val);
      this.rebuildFullCar();
    });

    setupButtonGroup('dev_placement', (val) => {
      this.config.placement = val;
      this.rebuildFullCar();
    });

    setupButtonGroup('dev_orientation', (val) => {
      this.config.orientation = val;
      this.rebuildFullCar();
    });

    const devTilt = document.getElementById('dev_tilt');
    if (devTilt) {
      devTilt.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_tilt_val');
        if (valEl) valEl.innerText = e.target.value;
        this.config.tiltAngle = parseInt(e.target.value);
        this.rebuildFullCar();
      });
    }

    const updateDatumVisibility = (isChecked) => {
      this.config.showDatum = isChecked;
      if (this.datumGroup) this.datumGroup.visible = this.config.showDatum;
      const chk1 = document.getElementById('toggle_datum');
      const chk2 = document.getElementById('dev-toggle-datum');
      if (chk1) chk1.checked = isChecked;
      if (chk2) chk2.checked = isChecked;
    };

    const toggleDatum = document.getElementById('toggle_datum');
    if (toggleDatum) {
      toggleDatum.checked = false;
      toggleDatum.addEventListener('change', (e) => {
        updateDatumVisibility(e.target.checked);
      });
    }

    const devToggleDatum = document.getElementById('dev-toggle-datum');
    if (devToggleDatum) {
      devToggleDatum.checked = false;
      devToggleDatum.addEventListener('change', (e) => {
        updateDatumVisibility(e.target.checked);
      });
    }

    const devRpm = document.getElementById('dev_rpm');
    if (devRpm) {
      devRpm.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_rpm_val');
        if (valEl) valEl.innerText = e.target.value;
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
        const valEl = document.getElementById('dev_final_drive_val');
        if (valEl) valEl.innerText = e.target.value;
        this.config.finalDrive = parseFloat(e.target.value);
      });
    }

    setupButtonGroup('dev_gearbox', (val) => {
        this.config.gearboxChoice = val;
        let r = 0;
        if (val === 'R') r = -3.5;
        else if (val === '1') r = 3.5;
        else if (val === '2') r = 2.1;
        else if (val === '3') r = 1.4;
        else if (val === '4') r = 1.0;
        else if (val === '5') r = 0.8;
        this.config.gearRatio = r;
    });

    setupButtonGroup('dev_clutch', (val) => {
        // placeholder
    });
    
    setupButtonGroup('dev_diff', (val) => {
        // placeholder
    });

    const chkWireframes = document.getElementById('toggle_wireframes');
    if (chkWireframes) {
      chkWireframes.addEventListener('change', (e) => {
        this.config.showWireframes = e.target.checked;
        this.updateWireframeVisibility();
      });
    }

    const chkHover = document.getElementById('toggle_hover');
    if (chkHover) {
      chkHover.addEventListener('change', (e) => {
        this.config.enableHover = e.target.checked;
        if (!this.config.enableHover && this.hoveredPart) {
           this.hoveredPart.material.emissive.setHex(0x000000);
           this.hoveredPart = null;
        }
      });
    }
  }

  updateWireframeVisibility() {
    const v = this.config.showWireframes;
    if (this.movingCylinders) {
        this.movingCylinders.forEach(c => {
            if (c.sleeve) c.sleeve.visible = v;
            if (c.head) c.head.visible = v;
        });
    }
    // Wyszukaj miskę olejową po nazwie
    if (this.engineGroup) {
      this.engineGroup.children.forEach(child => {
          if (child.userData.name === "Miska olejowa (Zarys)") {
              child.visible = v;
          }
      });
    }
  }

  setupTooltip() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.005;
    this.raycaster.params.Points.threshold = 0.005;
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.tooltip = document.createElement('div');
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.background = 'rgba(15, 23, 42, 0.95)';
    this.tooltip.style.color = '#38bdf8';
    this.tooltip.style.padding = '6px 14px';
    this.tooltip.style.borderRadius = '6px';
    this.tooltip.style.border = '1px solid #38bdf8';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.display = 'none';
    this.tooltip.style.fontFamily = 'monospace';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.zIndex = '90';
    this.tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    this.tooltip.style.textTransform = 'uppercase';
    this.tooltip.style.fontWeight = 'bold';
    this.tooltip.style.whiteSpace = 'nowrap';
    document.body.appendChild(this.tooltip);

    window.addEventListener('mousemove', (e) => {
      // Jeśli kursor znajduje się nad elementami interfejsu (sidebar, HUD, drawer, przyciski), ukryj tooltip
      const target = e.target;
      if (
        target &&
        target.closest &&
        target.closest('.sidebar-left, .bottom-hud, .info-drawer, .dev-drawer, .dev-mode-toggle, button, input, select, textarea')
      ) {
        this.mouse.set(-9999, -9999);
        this.tooltip.style.display = 'none';
        return;
      }

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      let left = e.clientX + 16;
      let top = e.clientY + 16;
      if (left + 220 > window.innerWidth) left = e.clientX - 230;
      if (top + 40 > window.innerHeight) top = e.clientY - 40;
      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.top = `${top}px`;
      this.updateTooltip();
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.set(-9999, -9999);
      if (this.tooltip) this.tooltip.style.display = 'none';
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
      for (let i = 0; i < intersects.length; i++) {
        const item = intersects[i];
        const obj = item.object;

        if (!obj || !obj.visible) continue;

        // Pomijaj linie, strumienie i punkty w inspekcji podzespołów
        if (obj.isLine || obj.isLineSegments || obj.isPoints) continue;

        // Pomijaj przezroczyste/niewidoczne efekty wizualne (np. gaz, płomień, iskry przy opacity < 0.15)
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            if (obj.material.every(m => m.opacity !== undefined && m.opacity < 0.15)) continue;
          } else if (obj.material.opacity !== undefined && obj.material.opacity < 0.15) {
            continue;
          }
        }

        let tempName = null;
        let curr = obj;
        while (curr) {
          if (curr.userData && curr.userData.name) {
            tempName = curr.userData.name;
            break;
          }
          curr = curr.parent;
        }

        if (!tempName) continue;

        // Pomijaj zarysy, pomocnicze płaszczyzny i niewidoczne w danym momencie efekty przepływu
        if (
          tempName.includes("(Zarys)") ||
          tempName.includes("Zarysy") ||
          tempName.includes("Datum") ||
          tempName.includes("Gazy ssące") ||
          tempName.includes("Spaliny") ||
          tempName.includes("Strumień") ||
          tempName.includes("Płomień") ||
          tempName.includes("Iskra")
        ) {
          continue;
        }

        foundName = tempName;
        break;
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
    
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    this.crankcaseLineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.3 });
    
    // Datum / Engineering Reference Materials
    this.matDatumLine = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8, depthWrite: false });
    this.matDatumNode = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    this.matDatumOrigin = new THREE.MeshBasicMaterial({ color: 0xff007f });
    this.matDatumAxisX = new THREE.LineBasicMaterial({ color: 0xef4444, depthWrite: false });
    this.matDatumAxisY = new THREE.LineBasicMaterial({ color: 0x10b981, depthWrite: false });
    this.matDatumAxisZ = new THREE.LineBasicMaterial({ color: 0x3b82f6, depthWrite: false });
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
    this.flowStreamlines = [];
    this.exhaustMainStreamlines = [];

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

  computeEngineDatum() {
    const layout = this.config.layout;
    const cylCount = this.config.cylinders;
    const vAngle = this.config.vAngle * Math.PI / 180;
    const zSpacing = 0.24;
    const startZ = -(cylCount - 1) * zSpacing / 2;
    const sleeveCenter = 0.55;

    let cylinderConfigs = [];
    for (let i = 0; i < cylCount; i++) {
      let bank = 0;
      let z = startZ + i * zSpacing;
      
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

      let firing = 0;
      if (layout === "Inline") {
          if (cylCount === 4) firing = [0, 540, 180, 360][i];
          else if (cylCount === 6) firing = [0, 480, 240, 600, 120, 360][i];
          else firing = i * (720 / cylCount);
      } else if (layout === "Boxer") {
          let pairFiring = Math.floor(i / 2) * (720 / cylCount);
          firing = (i % 2 === 0) ? pairFiring : (pairFiring + 360);
      } else {
          if (cylCount === 8) firing = [0, 540, 270, 90, 630, 450, 360, 180][i];
          else firing = i * (720 / cylCount);
      }
      if (this.config.stroke === 2) firing /= 2;

      let crankPin = (firing * Math.PI / 180) + bank;
      const cfg = this.createCylConfig(i+1, z, bank, firing, crankPin);
      
      // Calculate datum vectors
      cfg.u = new THREE.Vector3(-Math.sin(bank), Math.cos(bank), 0);
      cfg.n = new THREE.Vector3(Math.cos(bank), Math.sin(bank), 0);
      cfg.a0 = new THREE.Vector3(0, 0, z);
      cfg.m = cfg.a0.clone().add(cfg.u.clone().multiplyScalar(sleeveCenter));

      cylinderConfigs.push(cfg);
    }

    const cx = cylinderConfigs.reduce((sum, c) => sum + c.m.x, 0) / cylCount;
    const cy = cylinderConfigs.reduce((sum, c) => sum + c.m.y, 0) / cylCount;
    const cz = cylinderConfigs.reduce((sum, c) => sum + c.m.z, 0) / cylCount;
    const centroid = new THREE.Vector3(cx, cy, cz);

    const maxZ = Math.max(...cylinderConfigs.map(c => c.z)) + 0.15;
    const minZ = Math.min(...cylinderConfigs.map(c => c.z)) - 0.15;
    const engineLength = maxZ - minZ;

    return { cylinderConfigs, centroid, maxZ, minZ, engineLength };
  }

  createDatumLabel(text, color = '#ffffff', bgColor = 'rgba(15, 23, 42, 0.85)') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.stroke();

    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.28, 0.07, 1);
    sprite.userData.isDatumLabel = true;
    return sprite;
  }

  buildDatumVisuals(engineGroup, datum) {
    this.datumGroup = new THREE.Group();
    this.datumGroup.visible = this.config.showDatum;

    datum.cylinderConfigs.forEach(cfg => {
      // Bore Centerline
      const topPt = cfg.a0.clone().add(cfg.u.clone().multiplyScalar(1.2));
      const pts = [cfg.a0, topPt];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, this.matDatumLine);
      this.datumGroup.add(line);

      // Bore Midpoint Node
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 16), this.matDatumNode);
      node.position.copy(cfg.m);
      node.userData.name = `Punkt środka Cyl #${cfg.id}`;
      this.datumGroup.add(node);

      // Etykieta wektora cylindra
      const cylLabel = this.createDatumLabel(`Oś Cyl #${cfg.id}`, '#38bdf8');
      cylLabel.position.copy(topPt).add(new THREE.Vector3(0, 0.04, 0));
      this.datumGroup.add(cylLabel);
    });

    // Engine Centroid Marker
    const oMarker = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), this.matDatumOrigin);
    oMarker.position.copy(datum.centroid);
    oMarker.userData.name = "Centrum geometryczne silnika (Centroid)";
    this.datumGroup.add(oMarker);

    const centroidLabel = this.createDatumLabel(`📍 CENTRUM SILNIKA`, '#ff007f');
    centroidLabel.position.copy(datum.centroid).add(new THREE.Vector3(0, 0.08, 0));
    this.datumGroup.add(centroidLabel);

    // Tripod axes from Centroid
    const size = 0.45;
    const endX = datum.centroid.clone().add(new THREE.Vector3(size, 0, 0));
    const endY = datum.centroid.clone().add(new THREE.Vector3(0, size, 0));
    const endZ = datum.centroid.clone().add(new THREE.Vector3(0, 0, size));

    const xLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endX]), this.matDatumAxisX);
    const yLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endY]), this.matDatumAxisY);
    const zLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([datum.centroid, endZ]), this.matDatumAxisZ);
    this.datumGroup.add(xLine, yLine, zLine);

    // Etykiety osi X, Y, Z
    const lblX = this.createDatumLabel(`+X (Poprzeczna)`, '#ef4444');
    lblX.position.copy(endX).add(new THREE.Vector3(0.08, 0, 0));

    const lblY = this.createDatumLabel(`+Y (Pionowa)`, '#10b981');
    lblY.position.copy(endY).add(new THREE.Vector3(0, 0.05, 0));

    const lblZ = this.createDatumLabel(`+Z (Wzdłużna / Wał)`, '#3b82f6');
    lblZ.position.copy(endZ).add(new THREE.Vector3(0, 0, 0.08));

    this.datumGroup.add(lblX, lblY, lblZ);

    engineGroup.add(this.datumGroup);
  }

  buildEngineAssembly() {
    const datum = this.computeEngineDatum();
    const { cylinderConfigs, maxZ, minZ, engineLength } = datum;

    this.engineMountGroup = new THREE.Group();
    
    // 1. Placement (Vehicle Coordinates)
    if (this.config.placement === 'front') this.engineMountGroup.position.set(0, 0.25, 0.0);
    else if (this.config.placement === 'mid') this.engineMountGroup.position.set(0, 0.25, -1.25);
    else if (this.config.placement === 'rear') this.engineMountGroup.position.set(0, 0.25, -2.45);

    // 2. Orientation (Transverse vs Longitudinal)
    if (this.config.orientation === 'transverse') {
      this.engineMountGroup.rotation.y = Math.PI / 2;
    }

    // 3. Tilt / Slant
    if (this.config.tiltAngle) {
      this.engineMountGroup.rotation.z = (this.config.tiltAngle * Math.PI) / 180;
    }

    const engineGroup = new THREE.Group();
    this.engineMountGroup.add(engineGroup);

    this.buildDatumVisuals(engineGroup, datum);

    const layout = this.config.layout;
    const cylCount = this.config.cylinders;
    const vAngle = this.config.vAngle * Math.PI / 180;
    const crankRadius = 0.16;
    const rodLength = 0.48;
    const zSpacing = 0.24;

    // Crankcase as Wireframe to not obscure internals
    const crankcase = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.56, 0.22, engineLength + 0.1)), 
      this.crankcaseLineMat
    );
    crankcase.position.set(0, -0.11, (maxZ+minZ)/2);
    crankcase.userData.name = "Miska olejowa (Zarys)";
    engineGroup.add(crankcase);

    const crankMaster = new THREE.Group();
    // ═══ SEGMENTOWE CZOpy GŁÓWNE I WYKORBIENIA WAŁU KORBOWEGO ═══
    const pinWidth = 0.055;
    const webThick = 0.022;
    const throwHalfWidth = pinWidth / 2 + webThick; // ~0.0495

    // Profil ramienia wykorbienia i aerodynamicznego przeciwciężaru (THREE.Shape)
    const webShape = new THREE.Shape();
    webShape.moveTo(-0.036, crankRadius);
    webShape.absarc(0, crankRadius, 0.036, Math.PI, 0, false); // łuk nad czopem korbowodowym
    webShape.lineTo(0.044, 0.02);                              // ramię ku osi głównej
    webShape.lineTo(0.100, -0.04);                             // rozszerzenie w przeciwciężar
    webShape.quadraticCurveTo(0.108, -0.175, 0, -0.185);       // dolny łuk przeciwciężaru
    webShape.quadraticCurveTo(-0.108, -0.175, -0.100, -0.04);
    webShape.lineTo(-0.044, 0.02);
    webShape.lineTo(-0.036, crankRadius);

    const webGeo = new THREE.ExtrudeGeometry(webShape, {
      depth: webThick,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.002,
      bevelThickness: 0.002
    });
    webGeo.translate(0, 0, -webThick / 2);

    // ═══ KOŁO ZĘBATE WAŁU (Timing Gear) ═══
    const crankGear = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 32), this.matDarkSteel);
    crankGear.rotation.x = Math.PI / 2;
    crankGear.position.z = maxZ + 0.05;
    crankGear.userData.name = "Koło zębate wału";
    crankMaster.add(crankGear);

    // ═══ EXPLODE DISTANCE (musi być przed komponentami które go używają) ═══
    const explodeDist = this.explodedFactor * 0.45;

    // ═══ KOŁO PASOWE WAŁU KORBOWEGO (Crank Pulley) ═══
    const crankPulleyR = 0.085;
    const crankPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(crankPulleyR, crankPulleyR, 0.02, 32), this.matDarkSteel
    );
    crankPulley.rotation.x = Math.PI / 2;
    crankPulley.position.set(0, 0, maxZ + 0.08);
    crankPulley.userData.name = "Koło pasowe wału korbowego";
    crankMaster.add(crankPulley);

    // ═══ KOŁO POMPY WODY (Water Pump Pulley) ═══
    const wpPulleyR = 0.045;
    const wpPosX = 0.0, wpPosY = 0.14;
    const wpPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(wpPulleyR, wpPulleyR, 0.02, 24), this.matDarkSteel
    );
    wpPulley.rotation.x = Math.PI / 2;
    wpPulley.position.set(wpPosX, wpPosY, maxZ + 0.08);
    wpPulley.userData.name = "Koło pasowe pompy wody";
    engineGroup.add(wpPulley);
    this.wpPulley = wpPulley;

    // ═══ ALTERNATOR (z kołem pasowym i regulatorem napięcia) ═══
    const altG = new THREE.Group();
    const altPosX = layout === 'Boxer' ? 0.32 : 0.28;
    const altPosY = layout === 'Boxer' ? 0.10 : 0.18;
    altG.position.set(altPosX, altPosY, maxZ + 0.05);

    const altBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.1, 20), this.matSilver
    );
    altBody.rotation.x = Math.PI / 2;
    altBody.userData.name = "Alternator";
    altG.add(altBody);

    const altPulleyR = 0.033;
    const altPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(altPulleyR, altPulleyR, 0.018, 24), this.matDarkSteel
    );
    altPulley.rotation.x = Math.PI / 2;
    altPulley.position.z = 0.058;
    altPulley.userData.name = "Koło pasowe alternatora";
    altG.add(altPulley);
    this.alternatorGroup = altG;
    engineGroup.add(altG);

    // Pasek klinowy wielorowkowy (Serpentine Belt) opasający wał, pompę wody i alternator
    const beltCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -crankPulleyR, 0),
      new THREE.Vector3(crankPulleyR * 0.8, -crankPulleyR * 0.5, 0),
      new THREE.Vector3(altPosX + altPulleyR, altPosY, 0),
      new THREE.Vector3(altPosX, altPosY + altPulleyR, 0),
      new THREE.Vector3(wpPosX + wpPulleyR, wpPosY + wpPulleyR, 0),
      new THREE.Vector3(wpPosX - wpPulleyR, wpPosY, 0),
      new THREE.Vector3(-crankPulleyR, 0, 0)
    ], true);
    const altBelt = new THREE.Mesh(
      new THREE.TubeGeometry(beltCurve, 80, 0.007, 6, true), this.matRubber
    );
    altBelt.position.z = maxZ + 0.08;
    altBelt.userData.name = "Pasek klinowy (Serpentine)";
    engineGroup.add(altBelt);

    // ═══ Tablice do zbierania pozycji cylindrów (dla uniwersalnych kolektorów) ═══
    this.cylinderPositions = [];

    // Generowanie wykorbień (throws) dla każdego cylindra
    cylinderConfigs.forEach(cfg => {
      const throwG = new THREE.Group();
      throwG.position.z = cfg.z;
      throwG.rotation.z = cfg.crankPinAngle;

      // Czop korbowodowy (Crankpin journal) - w odległości crankRadius
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, pinWidth, 24), this.matSteel);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0, crankRadius, 0); 
      pin.userData.name = "Czop korbowodowy";
      throwG.add(pin);

      // Kanał olejowy w czopie
      const oilHole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), this.matDarkSteel);
      oilHole.position.set(0, crankRadius + 0.025, 0);
      oilHole.userData.name = "Kanał olejowy czopa korbowodowego";
      throwG.add(oilHole);

      // Ramiona wykorbienia (Webs) i przeciwciężary (Counterweights) z przodu i z tyłu czopa
      [-1, 1].forEach(dir => {
        const webZOff = dir * (pinWidth / 2 + webThick / 2);
        const web = new THREE.Mesh(webGeo, this.matDarkSteel);
        web.position.set(0, 0, webZOff);
        web.userData.name = "Ramię wykorbienia i przeciwciężar";
        throwG.add(web);
      });

      crankMaster.add(throwG);
    });

    // ═══ CZOpy GŁÓWNE (Main Journals) NA OSI OBROTU (0, 0) ═══
    // Tworzone wyłącznie pomiędzy wykorbieniami oraz na końcach wału
    const allCylZ = cylinderConfigs.map(c => c.z);
    const minCylZ = Math.min(...allCylZ);
    const maxCylZ = Math.max(...allCylZ);
    const uniqueZ = [...new Set(allCylZ)].sort((a, b) => a - b);

    // 1. Czopy pośrednie pomiędzy sąsiednimi wykorbieniami
    for (let i = 0; i < uniqueZ.length - 1; i++) {
      const zStart = uniqueZ[i] + throwHalfWidth;
      const zEnd = uniqueZ[i + 1] - throwHalfWidth;
      if (zEnd > zStart + 0.002) {
        const jLen = zEnd - zStart;
        const jMid = (zStart + zEnd) / 2;
        const mainJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, jLen, 32), this.matSteel);
        mainJ.rotation.x = Math.PI / 2;
        mainJ.position.set(0, 0, jMid);
        mainJ.userData.name = "Czop główny wału korbowego";
        crankMaster.add(mainJ);
      }
    }

    // 2. Przedni czop główny i czop napędu rozrządu (Snout)
    const frontStart = maxCylZ + throwHalfWidth;
    const frontEnd = maxZ + 0.08;
    const frontLen = Math.max(0.02, frontEnd - frontStart);
    const frontJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, frontLen, 32), this.matSteel);
    frontJ.rotation.x = Math.PI / 2;
    frontJ.position.set(0, 0, (frontStart + frontEnd) / 2);
    frontJ.userData.name = "Czop główny przedni (Snout)";
    crankMaster.add(frontJ);

    // 3. Tylny czop główny i kołnierz koła zamachowego
    const rearStart = minZ - 0.04;
    const rearEnd = minCylZ - throwHalfWidth;
    const rearLen = Math.max(0.02, rearEnd - rearStart);
    const rearJ = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, rearLen, 32), this.matSteel);
    rearJ.rotation.x = Math.PI / 2;
    rearJ.position.set(0, 0, (rearStart + rearEnd) / 2);
    rearJ.userData.name = "Czop główny tylny wału";
    crankMaster.add(rearJ);

    // Kołnierz montażowy koła zamachowego (Flywheel Flange)
    const flywheelFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 32), this.matDarkSteel);
    flywheelFlange.rotation.x = Math.PI / 2;
    flywheelFlange.position.set(0, 0, rearStart);
    flywheelFlange.userData.name = "Kołnierz koła zamachowego";
    crankMaster.add(flywheelFlange);

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
    const boreRadius = 0.105;
    const sleeveRadius = 0.11;
    const sleeveLength = 0.46;
    const pistonLength = 0.16;
    const sleeveCenter = 0.55; 
    const headBase = 0.82 + explodeDist * 1.5; 
    const isOHV = this.config.valvetrain === "OHV" || this.config.valvetrain === "valve_ohv";
    const trueCamY = isOHV ? (0.28 + explodeDist * 0.5) : (1.020 + explodeDist * 1.5);
    
    let firstBankOHV = true;

    Object.keys(banks).forEach(bankAngleStr => {
      const bankAngle = parseFloat(bankAngleStr);
      const cylinders = banks[bankAngleStr];

      const flipBank = (this.config.layout === 'V' || this.config.layout === 'VR' || this.config.layout === 'Boxer') && bankAngle > 0.001;
      const inSign = flipBank ? 1 : -1;
      const exSign = -inSign;

      const bankG = new THREE.Group();
      bankG.rotation.z = bankAngle;
      engineGroup.add(bankG);

      const camBaseIn = new THREE.Group();
      const camBaseEx = new THREE.Group();
      bankG.add(camBaseIn);
      bankG.add(camBaseEx);
      
      const camShaftIn = new THREE.Group();
      const camShaftEx = new THREE.Group();
      camBaseIn.add(camShaftIn);
      camBaseEx.add(camShaftEx);
      
      const bMinZ = Math.min(...cylinders.map(c => c.z)) - 0.05;
      const bMaxZ = maxZ + 0.08; 
      const len = bMaxZ - bMinZ;
      const midZ = (bMinZ + bMaxZ) / 2;
      const gearZ = maxZ + 0.05;

      // Variables to store local X and Y for the OHV pushrods
      let localX = 0;
      let localY = 0;

      if (isOHV) {
          const globalCamX = (this.config.layout === 'Inline') ? 0.14 : 0;
          const globalCamY = (this.config.layout === 'Inline') ? (0.28 + explodeDist * 0.5) : (0.18 + explodeDist * 0.5);
          
          localX = globalCamX * Math.cos(bankAngle) + globalCamY * Math.sin(bankAngle);
          localY = -globalCamX * Math.sin(bankAngle) + globalCamY * Math.cos(bankAngle);
          
          camBaseEx.position.set(localX, localY, 0);
          camBaseIn.visible = false;
          
          if (firstBankOHV) {
              const meshOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 16), this.matBronze);
              meshOHV.rotation.x = Math.PI / 2;
              meshOHV.position.z = midZ;
              meshOHV.userData.name = "Wałek rozrządu (OHV)";
              camShaftEx.add(meshOHV);
              
              const gearOHV = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 32), this.matGold);
              gearOHV.rotation.x = Math.PI / 2;
              gearOHV.position.z = gearZ;
              gearOHV.userData.name = "Koło wałka rozrządu (OHV)";
              camShaftEx.add(gearOHV);
          }
          this.camshafts.push(camShaftEx);
      } else {
          camBaseIn.position.set(inSign * 0.045, trueCamY, 0);
          camBaseEx.position.set(exSign * 0.045, trueCamY, 0);
          
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
      }

      cylinders.forEach(cfg => {
        const cylG = new THREE.Group();
        cylG.position.z = cfg.z;
        cylG.userData.cylId = cfg.id;
        bankG.add(cylG);

        const sleeve = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLength, 16)), this.lineMat);
        sleeve.position.set(0, sleeveCenter + explodeDist, 0);
        sleeve.userData.name = "Tuleja cylindra (Zarys)";
        sleeve.visible = this.config.showWireframes !== false;
        cylG.add(sleeve);

        const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.28, 0.16, zSpacing - 0.02)), this.lineMat);
        head.position.set(0, headBase + 0.08, 0);
        head.userData.name = "Głowica cylindra (Zarys)";
        head.visible = this.config.showWireframes !== false;
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

        // ═══ SFERA SSANIA (Intake Gas) — wizualizacja powietrza wchodzącego do cylindra ═══
        const inGasMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0, depthWrite: false });
        const inGas = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), inGasMat);
        inGas.position.set(inSign * 0.06, headBase + 0.02, 0); // port ssący — strona intake
        inGas.userData.name = "Gazy ssące (powietrze)";
        cylG.add(inGas);

        // ═══ SFERA WYDECHU (Exhaust Gas) ═══
        const exGasMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0, depthWrite: false });
        const exGas = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), exGasMat);
        exGas.position.set(exSign * 0.06, headBase + 0.02, 0); // port wydechowy — strona exhaust
        exGas.userData.name = "Spaliny (exhaust)";
        cylG.add(exGas);

        // ═══ WTRYSKIWACZ PALIWA (Fuel Injector) ═══
        // Pozycja: na kołnierzu dolotowym, skierowany pod kątem w stronę zaworów ssących
        const injectorG = new THREE.Group();
        const injBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.009, 0.05, 12), this.matDarkSteel
        );
        injBody.userData.name = "Wtryskiwacz paliwa";
        injectorG.add(injBody);
        const injNozzle = new THREE.Mesh(
          new THREE.ConeGeometry(0.009, 0.015, 8), this.matSilver
        );
        injNozzle.position.y = -0.032;
        injNozzle.rotation.x = Math.PI;
        injectorG.add(injNozzle);
        
        // Dynamiczne linie natrysku paliwa (Fuel Spray Streamlines)
        const sprayPoints = [];
        const sprayRays = 8;
        for (let s = 0; s < sprayRays; s++) {
          const sprayAng = (s / sprayRays) * Math.PI * 2;
          const spreadR = 0.02;
          sprayPoints.push(new THREE.Vector3(0, -0.035, 0));
          sprayPoints.push(new THREE.Vector3(
            Math.cos(sprayAng) * spreadR,
            -0.08,
            Math.sin(sprayAng) * spreadR
          ));
        }
        const sprayGeo = new THREE.BufferGeometry().setFromPoints(sprayPoints);
        const sprayMat = new THREE.LineBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0, depthWrite: false });
        const sprayLines = new THREE.LineSegments(sprayGeo, sprayMat);
        sprayLines.userData.name = "Strumień wtrysku paliwa";
        injectorG.add(sprayLines);

        injectorG.position.set(inSign * 0.07, headBase + 0.06, 0);
        injectorG.rotation.z = -inSign * (20 * Math.PI / 180);
        injectorG.userData.name = "Wtryskiwacz";
        cylG.add(injectorG);

        // ═══ OBLICZENIA MATEMATYCZNE TRANSFORMACJI PORTÓW DO UKŁADU SILNIKA ═══
        const localInPortX = inSign * 0.06;
        const localInPortY = headBase + 0.03;
        const localExPortX = exSign * 0.06;
        const localExPortY = headBase + 0.03;

        const inPortEngine = new THREE.Vector3(
          localInPortX * Math.cos(bankAngle) - localInPortY * Math.sin(bankAngle),
          localInPortX * Math.sin(bankAngle) + localInPortY * Math.cos(bankAngle),
          cfg.z
        );

        const exPortEngine = new THREE.Vector3(
          localExPortX * Math.cos(bankAngle) - localExPortY * Math.sin(bankAngle),
          localExPortX * Math.sin(bankAngle) + localExPortY * Math.cos(bankAngle),
          cfg.z
        );

        // Wektory normalne (kierunki wylotu/wlotu kołnierza głowicy)
        const inNormEngine = new THREE.Vector3(
          inSign * Math.cos(bankAngle),
          inSign * Math.sin(bankAngle),
          0
        ).normalize();

        const exNormEngine = new THREE.Vector3(
          exSign * Math.cos(bankAngle),
          exSign * Math.sin(bankAngle),
          0
        ).normalize();

        // Zapisz konfigurację dla uniwersalnego generatora dolotu, wydechu i linii przepływu
        this.cylinderPositions.push({
          id: cfg.id,
          z: cfg.z,
          bank: cfg.bank,
          bankAngle: bankAngle,
          inPort: inPortEngine,
          exPort: exPortEngine,
          inNorm: inNormEngine,
          exNorm: exNormEngine,
          firingAngle: cfg.firingAngle,
          phaseOffset: cfg.phaseOffset,
          sprayLines: sprayLines,
          sprayMat: sprayMat
        });

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
          fireMesh, fireMat, sparkPlug,
          inGas, inGasMat, exGas, exGasMat,
          injFlash: sprayLines, injFlashMat: sprayMat
        });

        valvesList.forEach((vData) => {
            const isEx = vData.type === 'ex';
            const valveSign = isEx ? exSign : inSign;
            
            const camGroup = (isOHV) ? camShaftEx : (isEx ? camShaftEx : camShaftIn);
            const lobeRot = isEx ? lobeRotEx : lobeRotIn;
            
            let lobeZOffset = vData.offZ;
            if (isOHV && this.config.valves === 2) {
                lobeZOffset = isEx ? 0.015 : -0.015;
            }
            
            const lobe = this.createCamLobe();
            lobe.position.set(0, 0, cfg.z + lobeZOffset);
            lobe.rotation.z = lobeRot;
            camGroup.add(lobe);
            
            let pushrod = null;
            let rocker = null;
            if (isOHV) {
                pushrod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.0, 8), this.matSteel);
                cylG.add(pushrod);
                
                rocker = new THREE.Group();
                const rockerArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.012), this.matGold);
                const rockerPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 16), this.matSteel);
                rockerPivot.rotation.x = Math.PI / 2;
                rocker.add(rockerArm);
                rocker.add(rockerPivot);
                cylG.add(rocker);
            }
            
            this.valvesToDrive.push({
                valveG: vData.vg,
                spring: vData.sp,
                pushrod: pushrod,
                rocker: rocker,
                prX: isOHV ? localX : 0,
                prY: isOHV ? localY : 0,
                prZ: lobeZOffset,
                camGroup: camGroup,
                lobeRot: lobeRot,
                offsetX: valveSign * 0.045,
                offsetZ: vData.offZ,
                isOHV: isOHV
            });
        });
      });

      let bankBelt = null;
      if (isOHV) {
        if (firstBankOHV) {
            const globalCamX = (this.config.layout === 'Inline') ? 0.14 : 0;
            const globalCamY = (this.config.layout === 'Inline') ? (0.28 + explodeDist * 0.5) : (0.18 + explodeDist * 0.5);
            const beltPath = new THREE.CatmullRomCurve3([
              new THREE.Vector3(0, -0.045, 0),
              new THREE.Vector3(0.045, 0, 0),
              new THREE.Vector3(globalCamX + 0.042, globalCamY, 0),
              new THREE.Vector3(globalCamX, globalCamY + 0.042, 0),
              new THREE.Vector3(globalCamX - 0.042, globalCamY, 0),
              new THREE.Vector3(-0.045, 0.045, 0),
              new THREE.Vector3(-0.045, 0, 0)
            ], true);
            bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), this.matBelt);
            bankBelt.position.set(0, 0, gearZ);
            bankBelt.userData.name = "Pasek rozrządu (OHV)";
            engineGroup.add(bankBelt); // Added globally for OHV
            firstBankOHV = false;
        }
      } else {
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
        bankBelt = new THREE.Mesh(new THREE.TubeGeometry(beltPath, 64, 0.015, 8, true), this.matBelt);
        bankBelt.position.set(0, 0, gearZ);
        bankBelt.userData.name = "Pasek rozrządu";
        bankG.add(bankBelt); // Added per-bank for DOHC
      }

      this.banksData.push({ bankG, camBaseIn, camBaseEx, bankBelt, bankAngle });
    });

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 1. UNIWERSALNY KOLEKTOR SSĄCY (Intake Manifold & Throttle Body) ═══
    // ════════════════════════════════════════════════════════════════════════
    const intakeG = new THREE.Group();
    const plenumMidZ = (maxZ + minZ) / 2;
    const plenumLen = Math.max(0.18, engineLength * 0.7);

    let plenumX = 0;
    let plenumY = 0;
    let plenumR = 0.045;

    if (layout === 'Inline') {
      plenumX = -0.18;
      plenumY = headBase + 0.12;
    } else if (layout === 'V' || layout === 'VR') {
      plenumX = 0.0;
      plenumY = (layout === 'VR') ? headBase + 0.12 : (headBase * Math.cos(vAngle / 2) + 0.10);
    } else if (layout === 'Boxer') {
      // Dla Boxera: centralna puszka dolotu na szczycie bloku (Subaru style)
      plenumX = 0.0;
      plenumY = 0.35 + explodeDist * 0.5;
    }

    // Korpus plenum (komora wyrównawcza)
    const plenumMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(plenumR, plenumR, plenumLen, 20), this.matSilver
    );
    plenumMesh.rotation.x = Math.PI / 2;
    plenumMesh.position.set(plenumX, plenumY, plenumMidZ);
    plenumMesh.userData.name = "Plenum dolotu (Komora wyrównawcza)";
    intakeG.add(plenumMesh);

    // Przepustnica (Throttle Body) zamocowana czołowo do plenum
    const tbG = new THREE.Group();
    const tbPosZ = maxZ + 0.06;
    tbG.position.set(plenumX, plenumY, tbPosZ);

    const tbBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.07, 24), this.matSilver
    );
    tbBody.rotation.x = Math.PI / 2;
    tbBody.userData.name = "Przepustnica (Throttle Body)";
    tbG.add(tbBody);

    // Klapa motylkowa (Butterfly flap)
    const flapG = new THREE.Group();
    const flap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.039, 0.039, 0.003, 20), this.matBronze
    );
    flap.rotation.x = Math.PI / 2;
    flap.userData.name = "Klapa motylkowa";
    flapG.add(flap);
    const flapAxis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.09, 8), this.matSteel
    );
    flapAxis.rotation.z = Math.PI / 2;
    flapAxis.userData.name = "Oś klapy przepustnicy";
    flapG.add(flapAxis);
    tbG.add(flapG);
    this.throttleFlapG = flapG;

    // Stożkowy filtr powietrza / dolot przed przepustnicą
    const intakeFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.06, 0.12, 20), this.matIntake
    );
    intakeFilter.rotation.x = Math.PI / 2;
    intakeFilter.position.z = 0.095;
    intakeFilter.userData.name = "Filtr powietrza (Dolot)";
    tbG.add(intakeFilter);
    intakeG.add(tbG);

    // ═══ LISTWY PALIWOWE (Fuel Rails) ═══
    if (layout === 'Inline') {
      const fuelRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.010, engineLength + 0.08, 16), this.matExhaust
      );
      fuelRail.rotation.x = Math.PI / 2;
      fuelRail.position.set(-0.13, headBase + 0.08, plenumMidZ);
      fuelRail.userData.name = "Listwa wtryskowa (Fuel Rail)";
      intakeG.add(fuelRail);
    } else {
      // Dla V / VR / Boxer — dwie listwy paliwowe wzdłuż każdego banku
      [-1, 1].forEach((side, bIdx) => {
        const railZ = plenumMidZ;
        const bAng = (layout === 'Boxer') ? (side * Math.PI / 2) : (side * (layout === 'VR' ? 7.5 : vAngle * 180 / Math.PI / 2) * Math.PI / 180);
        const inSideSign = (bAng > 0.001) ? 1 : -1;
        const railLocalX = inSideSign * 0.08;
        const railX = railLocalX * Math.cos(bAng) - (headBase + 0.08) * Math.sin(bAng);
        const railY = railLocalX * Math.sin(bAng) + (headBase + 0.08) * Math.cos(bAng);
        const fuelRail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.009, engineLength * 0.7 + 0.06, 16), this.matExhaust
        );
        fuelRail.rotation.x = Math.PI / 2;
        fuelRail.position.set(railX, railY, railZ);
        fuelRail.userData.name = `Listwa wtryskowa (Bank #${bIdx + 1})`;
        intakeG.add(fuelRail);
      });
    }

    // ═══ RUNNERY DOLOTU (Intake Runners) + LINIE PRZEPŁYWU (Streamlines) ═══
    this.cylinderPositions.forEach((cyl, idx) => {
      // Punkt startu z plenum
      let pStart = new THREE.Vector3();
      let pMid1 = new THREE.Vector3();
      let pMid2 = new THREE.Vector3();
      const pEnd = cyl.inPort.clone();

      if (layout === 'Inline') {
        pStart.set(plenumX + 0.02, plenumY - 0.02, cyl.z);
        pMid1.set(plenumX + 0.05, plenumY - 0.04, cyl.z);
        pMid2.set(pEnd.x - 0.04, pEnd.y + 0.04, cyl.z);
      } else if (layout === 'V' || layout === 'VR') {
        const sideSign = cyl.inPort.x < 0 ? -1 : 1;
        pStart.set(plenumX + sideSign * 0.03, plenumY - 0.03, cyl.z);
        pMid1.set(plenumX + sideSign * 0.07, plenumY - 0.05, cyl.z);
        pMid2.set(pEnd.x - sideSign * 0.03, pEnd.y + 0.03, cyl.z);
      } else if (layout === 'Boxer') {
        // Dla Boxera: rury rozchodzą się na boki i łukiem opadają na górę poziomej głowicy
        const sideSign = cyl.inPort.x < 0 ? -1 : 1;
        pStart.set(plenumX + sideSign * 0.04, plenumY, cyl.z);
        pMid1.set(pEnd.x * 0.5, plenumY + 0.06, cyl.z);
        pMid2.set(pEnd.x, pEnd.y + 0.08, cyl.z);
      }

      const runnerCurve = new THREE.CatmullRomCurve3([pStart, pMid1, pMid2, pEnd], false, 'catmullrom', 0.2);
      const runnerMesh = new THREE.Mesh(
        new THREE.TubeGeometry(runnerCurve, 20, 0.016, 10, false), this.matIntake
      );
      runnerMesh.userData.name = `Kolektor dolotowy (Runner #${idx + 1})`;
      intakeG.add(runnerMesh);

      // ═══ DYNAMICZNE LINIE PRZEPŁYWU POWIETRZA (Streamlines) ═══
      const streamLinesGroup = new THREE.Group();
      const numStreams = 3;
      const streamDashes = [];

      for (let s = 0; s < numStreams; s++) {
        const offsetAngle = (s / numStreams) * Math.PI * 2;
        const radius = 0.006;
        const curvePoints = runnerCurve.getPoints(24);
        
        // Zastosuj lekki offset radialny wzdłuż tuby
        const offsetPoints = curvePoints.map((pt, pIdx) => {
          const tangent = runnerCurve.getTangent(pIdx / 24);
          const norm = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
          return pt.clone().addScaledVector(norm, Math.cos(offsetAngle) * radius);
        });

        const lineGeo = new THREE.BufferGeometry().setFromPoints(offsetPoints);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        streamLinesGroup.add(lineMesh);
        streamDashes.push({ lineMesh, lineMat, origPoints: offsetPoints, curve: runnerCurve });
      }
      intakeG.add(streamLinesGroup);

      this.flowStreamlines.push({
        type: 'intake',
        cylId: cyl.id,
        phaseOffset: cyl.phaseOffset,
        streams: streamDashes
      });
    });
    engineGroup.add(intakeG);

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 2. UNIWERSALNY KOLEKTOR WYDECHOWY (Exhaust Manifold & Headers) ═══
    // ════════════════════════════════════════════════════════════════════════
    const exhaustG = new THREE.Group();
    const exhaustX = 0.28; // Położenie traktu wydechowego na ~1/4 szerokości auta z zapasem od koła zamachowego
    let exhaustMergePoint = new THREE.Vector3(exhaustX, -0.12, minZ - 0.20);

    if (layout === 'Inline') {
      // 4-1 Header po prawej stronie silnika
      const colX = exhaustX, colY = -0.12, colZ = minZ - 0.08;
      const collectorPoint = new THREE.Vector3(colX, colY, colZ);
      exhaustMergePoint.set(colX, colY, colZ);

      // Zbiornik 4-1
      const collectorMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.028, 0.15, 16), this.matDarkSteel
      );
      collectorMesh.rotation.x = Math.PI / 2 - 0.3;
      collectorMesh.position.set(colX, colY, colZ);
      collectorMesh.userData.name = "Kolektor zbiorczy 4-1";
      exhaustG.add(collectorMesh);

      this.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone();
        // Wyprowadzenie rury poziomo z głowicy na zewnątrz poza obrys bloku i korbowodów (X >= 0.32)
        const p1 = new THREE.Vector3(colX + 0.04, pStart.y + 0.01, pStart.z);
        const perpOffset = 0.035 * Math.sin((idx / Math.max(1, this.cylinderPositions.length - 1)) * Math.PI);
        const p2 = new THREE.Vector3(colX + 0.06, pStart.y * 0.2 + colY * 0.8 + perpOffset, pStart.z * 0.3 + colZ * 0.7);
        const pEnd = collectorPoint.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'catmullrom', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.016, 10, false), this.matExhaust
        );
        headerMesh.userData.name = `Kolektor wydechowy (Rura #${idx + 1})`;
        exhaustG.add(headerMesh);

        // Linie przepływu spalin (Exhaust Streamlines)
        const lineGeo = new THREE.BufferGeometry().setFromPoints(headerCurve.getPoints(24));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xff3b00,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        exhaustG.add(lineMesh);

        this.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });
    } else if (layout === 'V' || layout === 'VR') {
      // Dwa kolektory po bokach (Lewy i Prawy) łączące się w Y-pipe
      const colL = new THREE.Vector3(-0.32, -0.10, minZ - 0.05);
      const colR = new THREE.Vector3(0.32, -0.10, minZ - 0.05);
      exhaustMergePoint.set(exhaustX, -0.12, minZ - 0.20);

      this.cylinderPositions.forEach((cyl, idx) => {
        const isLeft = cyl.exPort.x < 0;
        const targetCol = isLeft ? colL : colR;
        const sideSign = isLeft ? -1 : 1;
        const pStart = cyl.exPort.clone();
        const p1 = new THREE.Vector3(sideSign * 0.35, pStart.y, pStart.z);
        const p2 = new THREE.Vector3(sideSign * 0.36, pStart.y * 0.2 + targetCol.y * 0.8, pStart.z * 0.4 + targetCol.z * 0.6);
        const pEnd = targetCol.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'catmullrom', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), this.matExhaust
        );
        headerMesh.userData.name = `Kolektor wydechowy (Rura #${idx + 1})`;
        exhaustG.add(headerMesh);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(headerCurve.getPoints(24));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xff3b00,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        exhaustG.add(lineMesh);

        this.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });

      // Rury Y-Pipe łączące lewy i prawy kolektor
      const yLeftCurve = new THREE.CatmullRomCurve3([colL, new THREE.Vector3(0.00, -0.10, minZ - 0.12), exhaustMergePoint]);
      const yRightCurve = new THREE.CatmullRomCurve3([colR, new THREE.Vector3(0.22, -0.07, minZ - 0.12), exhaustMergePoint]);
      const yLeftMesh = new THREE.Mesh(new THREE.TubeGeometry(yLeftCurve, 16, 0.020, 8, false), this.matExhaustPipe);
      const yRightMesh = new THREE.Mesh(new THREE.TubeGeometry(yRightCurve, 16, 0.020, 8, false), this.matExhaustPipe);
      yLeftMesh.userData.name = "Rura Y-Pipe (Lewa)";
      yRightMesh.userData.name = "Rura Y-Pipe (Prawa)";
      exhaustG.add(yLeftMesh, yRightMesh);
    } else if (layout === 'Boxer') {
      // Dla Boxera: rury schodzą od spodu głowic pod silnik i łączą się w dolny kolektor
      exhaustMergePoint.set(exhaustX, -0.14, minZ - 0.15);
      const colPoint = exhaustMergePoint.clone();

      this.cylinderPositions.forEach((cyl, idx) => {
        const pStart = cyl.exPort.clone(); // znajduje się na dole głowicy (y < 0)
        const p1 = pStart.clone().add(new THREE.Vector3(0, -0.06, 0));
        const sideSign = cyl.exPort.x < 0 ? -1 : 1;
        const p2 = (sideSign < 0)
          ? new THREE.Vector3(0.0, -0.16, cyl.z * 0.5 + colPoint.z * 0.5)
          : new THREE.Vector3(0.22, -0.15, cyl.z * 0.5 + colPoint.z * 0.5);
        const pEnd = colPoint.clone();

        const headerCurve = new THREE.CatmullRomCurve3([pStart, p1, p2, pEnd], false, 'catmullrom', 0.2);
        const headerMesh = new THREE.Mesh(
          new THREE.TubeGeometry(headerCurve, 20, 0.015, 10, false), this.matExhaust
        );
        headerMesh.userData.name = `Kolektor wydechowy Boxer (Rura #${idx + 1})`;
        exhaustG.add(headerMesh);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(headerCurve.getPoints(24));
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xff3b00,
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        exhaustG.add(lineMesh);

        this.flowStreamlines.push({
          type: 'exhaust',
          cylId: cyl.id,
          phaseOffset: cyl.phaseOffset,
          lineMesh,
          lineMat
        });
      });
    }
    engineGroup.add(exhaustG);

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 3. PEŁNY UKŁAD WYDECHOWY DO TYŁU POJAZDU (Exhaust to Rear) ════════
    // ════════════════════════════════════════════════════════════════════════
    const fullExhaustG = new THREE.Group();

    // 1. Złącze elastyczne (Flex pipe)
    const flexStart = exhaustMergePoint.clone();
    const flexEnd = new THREE.Vector3(exhaustX, -0.06, exhaustMergePoint.z - 0.16);
    const flexCurve = new THREE.CatmullRomCurve3([flexStart, flexEnd]);
    const flexMesh = new THREE.Mesh(new THREE.TubeGeometry(flexCurve, 10, 0.024, 12, false), this.matFlexPipe);
    flexMesh.userData.name = "Złącze elastyczne wydechu (Flex Pipe)";
    fullExhaustG.add(flexMesh);

    // 2. Katalizator (Catalytic Converter)
    const catZ = flexEnd.z - 0.18;
    const catMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.22, 20), this.matCatalyst
    );
    catMesh.rotation.x = Math.PI / 2;
    catMesh.position.set(exhaustX, -0.06, catZ);
    catMesh.scale.set(1.3, 1, 0.8); // spłaszczony owalny kształt katalizatora
    catMesh.userData.name = "Katalizator spalin (Catalytic Converter)";
    fullExhaustG.add(catMesh);

    // 3. Tłumik środkowy (Resonator / Center Muffler)
    // Dynamiczny offset zapobiegający kolizji z katalizatorem dla każdego typu silnika
    const resZ = Math.min(catZ - 0.45, -1.45);
    const resMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.35, 20), this.matMuffler
    );
    resMesh.rotation.x = Math.PI / 2;
    resMesh.position.set(exhaustX, -0.05, resZ);
    resMesh.userData.name = "Tłumik środkowy (Resonator)";
    fullExhaustG.add(resMesh);

    // 4. Tłumik końcowy (Rear Muffler)
    const rearMufflerZ = -2.85;
    const rearMuffler = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.16, 0.42), this.matMuffler
    );
    rearMuffler.position.set(exhaustX + 0.02, -0.02, rearMufflerZ);
    rearMuffler.userData.name = "Tłumik końcowy (Rear Silencer)";
    fullExhaustG.add(rearMuffler);

    // 5. Chromowana końcówka wydechu (Chrome Tailpipe Tip)
    const tipZ = -3.35;
    const tailpipeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.25, 24), this.matChrome
    );
    tailpipeMesh.rotation.x = Math.PI / 2;
    tailpipeMesh.position.set(exhaustX + 0.02, -0.04, tipZ);
    tailpipeMesh.userData.name = "Końcówka wydechu (Tailpipe)";
    fullExhaustG.add(tailpipeMesh);

    // Ciągła linia rur wydechowych (Exhaust Piping Curve)
    const pipePoints = [
      flexEnd,
      new THREE.Vector3(exhaustX, -0.10, catZ + 0.11),
      new THREE.Vector3(exhaustX, -0.10, catZ - 0.11),
      new THREE.Vector3(exhaustX, -0.08, resZ + 0.175),
      new THREE.Vector3(exhaustX, -0.08, resZ - 0.175),
      // Rura omijająca tylny dyferencjał / półoś (Axle Under-Pipe)
      new THREE.Vector3(exhaustX, -0.08, -1.95),
      new THREE.Vector3(exhaustX + 0.04, -0.14, -2.20),
      new THREE.Vector3(exhaustX + 0.04, -0.08, -2.45),
      new THREE.Vector3(exhaustX + 0.02, -0.04, rearMufflerZ + 0.21),
      new THREE.Vector3(exhaustX + 0.02, -0.04, rearMufflerZ - 0.21),
      new THREE.Vector3(exhaustX + 0.02, -0.04, tipZ)
    ];
    const fullExhaustCurve = new THREE.CatmullRomCurve3(pipePoints, false, 'catmullrom', 0.15);
    const fullExhaustPipeMesh = new THREE.Mesh(
      new THREE.TubeGeometry(fullExhaustCurve, 64, 0.020, 10, false), this.matExhaustPipe
    );
    fullExhaustPipeMesh.userData.name = "Rura układu wydechowego";
    fullExhaustG.add(fullExhaustPipeMesh);

    // Dynamiczna linia przepływu w głównym wydechu (Main Exhaust Streamline)
    const mainExhaustLineGeo = new THREE.BufferGeometry().setFromPoints(fullExhaustCurve.getPoints(60));
    const mainExhaustLine = new THREE.Line(mainExhaustLineGeo, this.matStreamlineMainExhaust);
    fullExhaustG.add(mainExhaustLine);
    this.exhaustMainStreamlines.push({ lineMesh: mainExhaustLine, curve: fullExhaustCurve });

    engineGroup.add(fullExhaustG);

    // ════════════════════════════════════════════════════════════════════════
    // ═══ 4. CHŁODNICA I W PEŁNI POŁĄCZONE WĘŻE CHŁODZENIA (Cooling) ════════
    // ════════════════════════════════════════════════════════════════════════
    const radG = new THREE.Group();
    const coreW = (layout === 'Boxer') ? 0.62 : 0.52;
    const coreH = 0.38, coreD = 0.035;
    const radZ = maxZ + 0.45;
    const radY = 0.42;

    // Rdzeń chłodnicy
    const radCore = new THREE.Mesh(
      new THREE.BoxGeometry(coreW, coreH, coreD), this.matDarkSteel
    );
    radCore.userData.name = "Rdzeń chłodnicy";
    radG.add(radCore);

    // Lamele chłodnicy
    const finCount = 24;
    const finPitch = coreW / (finCount + 1);
    for (let i = 1; i <= finCount; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.002, coreH * 0.88, coreD * 1.3), this.matSilver
      );
      fin.position.x = -coreW / 2 + i * finPitch;
      fin.userData.name = "Lamela chłodnicy";
      radG.add(fin);
    }

    // Zbiorniki górny i dolny
    const tankGeo = new THREE.BoxGeometry(coreW + 0.02, 0.035, 0.055);
    const topTank = new THREE.Mesh(tankGeo, this.matDarkSteel);
    topTank.position.y = coreH / 2 + 0.018;
    topTank.userData.name = "Zbiornik górny chłodnicy";

    const bottomTank = new THREE.Mesh(tankGeo.clone(), this.matDarkSteel);
    bottomTank.position.y = -coreH / 2 - 0.018;
    bottomTank.userData.name = "Zbiornik dolny chłodnicy";
    radG.add(topTank, bottomTank);

    // Króćce chłodnicy
    const topInlet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 16), this.matDarkSteel);
    topInlet.rotation.x = Math.PI / 2;
    topInlet.position.set(0.15, coreH / 2 + 0.018, -0.03);
    radG.add(topInlet);

    const botOutlet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 16), this.matDarkSteel);
    botOutlet.rotation.x = Math.PI / 2;
    botOutlet.position.set(-0.15, -coreH / 2 - 0.018, -0.03);
    radG.add(botOutlet);

    // Wentylator chłodnicy zamontowany z tyłu rdzenia
    const fanShroud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), this.matRubber
    );
    fanShroud.rotation.x = Math.PI / 2;
    fanShroud.position.set(0, 0, -0.025);
    fanShroud.userData.name = "Obudowa wentylatora";
    radG.add(fanShroud);

    radG.position.set(0, radY, radZ);
    radG.userData.name = "Chłodnica";
    engineGroup.add(radG);

    // ═══ WĘŻE CHŁODNICY (100% POŁĄCZONE Z BLOKIEM I GŁOWICĄ) ═══
    // Górny wąż (Gorący płyn: z głowicy/termostatu do górnego zbiornika chłodnicy)
    const thermostatPos = new THREE.Vector3(
      this.cylinderPositions[0].inPort.x * 0.4,
      Math.max(0.45, this.cylinderPositions[0].inPort.y * 0.9),
      maxZ + 0.05
    );
    const radTopInletPos = new THREE.Vector3(0.15, radY + coreH / 2 + 0.018, radZ - 0.03);

    const hoseUpperCurve = new THREE.CatmullRomCurve3([
      thermostatPos,
      new THREE.Vector3((thermostatPos.x + 0.15) / 2 + 0.04, thermostatPos.y + 0.06, (maxZ + radZ) / 2),
      radTopInletPos
    ]);
    const hoseUpperMesh = new THREE.Mesh(
      new THREE.TubeGeometry(hoseUpperCurve, 20, 0.014, 10, false), this.matRubber
    );
    hoseUpperMesh.userData.name = "Wąż chłodnicy górny (Głowica → Chłodnica)";
    engineGroup.add(hoseUpperMesh);

    // Dolny wąż (Zimny płyn: z dolnego zbiornika chłodnicy do pompy wody)
    const wpInletPos = new THREE.Vector3(0, 0.14, maxZ + 0.06);
    const radBotOutletPos = new THREE.Vector3(-0.15, radY - coreH / 2 - 0.018, radZ - 0.03);

    const hoseLowerCurve = new THREE.CatmullRomCurve3([
      radBotOutletPos,
      new THREE.Vector3(-0.12, 0.16, (maxZ + radZ) / 2),
      wpInletPos
    ]);
    const hoseLowerMesh = new THREE.Mesh(
      new THREE.TubeGeometry(hoseLowerCurve, 20, 0.014, 10, false), this.matRubber
    );
    hoseLowerMesh.userData.name = "Wąż chłodnicy dolny (Chłodnica → Pompa wody)";
    engineGroup.add(hoseLowerMesh);

    this.carGroup.add(this.engineMountGroup);
    this.engineGroup = engineGroup;
    this.engineZMin = minZ; // Used to place gearbox securely behind engine
  }

  createConnectingRod(length) {
    const g = new THREE.Group();
    const rodMat = this.matSteel;
    const darkMat = this.matDarkSteel;
    const bronzeMat = this.matBronze;

    // ═══ PARAMETRY STOPY (Big End) ═══
    const pinR = 0.026;         // promień czopa korbowodowego
    const bigEndWidth = 0.032;  // szerokość wzdłuż osi Z

    // 1. GÓRNY KORPUS STOPY KORBOWODU (Y >= 0)
    const upperBigEndShape = new THREE.Shape();
    upperBigEndShape.moveTo(0.038, 0);
    upperBigEndShape.lineTo(0.038, 0.016);
    upperBigEndShape.quadraticCurveTo(0.034, 0.038, 0.016, 0.046);
    upperBigEndShape.lineTo(-0.016, 0.046);
    upperBigEndShape.quadraticCurveTo(-0.034, 0.038, -0.038, 0.016);
    upperBigEndShape.lineTo(-0.038, 0);
    const upperHole = new THREE.Path();
    upperHole.absarc(0, 0, pinR, Math.PI, 0, true);
    upperBigEndShape.holes.push(upperHole);

    const upperBigEndGeo = new THREE.ExtrudeGeometry(upperBigEndShape, {
      depth: bigEndWidth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.0015,
      bevelThickness: 0.0015
    });
    upperBigEndGeo.translate(0, 0, -bigEndWidth / 2);
    const upperBigEndMesh = new THREE.Mesh(upperBigEndGeo, rodMat);
    upperBigEndMesh.userData.name = "Stopa korbowodu (korpus)";
    g.add(upperBigEndMesh);

    // 2. POKRYWA STOPY KORBOWODU (ROD CAP - Y < 0)
    const capShape = new THREE.Shape();
    capShape.moveTo(-0.038, -0.0008);
    capShape.lineTo(-0.038, -0.018);
    capShape.quadraticCurveTo(-0.035, -0.042, 0, -0.044);
    capShape.quadraticCurveTo(0.035, -0.042, 0.038, -0.018);
    capShape.lineTo(0.038, -0.0008);
    const capHole = new THREE.Path();
    capHole.absarc(0, 0, pinR, 0, Math.PI, true);
    capShape.holes.push(capHole);

    const capGeo = new THREE.ExtrudeGeometry(capShape, {
      depth: bigEndWidth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.0015,
      bevelThickness: 0.0015
    });
    capGeo.translate(0, 0, -bigEndWidth / 2);
    const capMesh = new THREE.Mesh(capGeo, rodMat);
    capMesh.userData.name = "Pokrywa stopy korbowodu";
    g.add(capMesh);

    // 3. PANEWKI KORBOWODOWE (Bearing Shells)
    const bearingGeo = new THREE.CylinderGeometry(pinR + 0.0004, pinR + 0.0004, bigEndWidth - 0.002, 24, 1, true);
    const bearingMesh = new THREE.Mesh(bearingGeo, bronzeMat);
    bearingMesh.rotation.x = Math.PI / 2;
    bearingMesh.userData.name = "Panewka korbowodowa";
    g.add(bearingMesh);

    // 4. ŚRUBY KORBOWODOWE (Rod Bolts)
    [-0.031, 0.031].forEach(bx => {
      const boltStud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035, 0.0035, 0.048, 12),
        darkMat
      );
      boltStud.position.set(bx, -0.006, 0);
      boltStud.userData.name = "Śruba korbowodowa";
      g.add(boltStud);

      const boltHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 6),
        darkMat
      );
      boltHead.position.set(bx, -0.026, 0);
      boltHead.userData.name = "Łeb śruby korbowodowej (12-kątny)";
      g.add(boltHead);
    });

    // ═══ 5. TRZON KORBOWODU (H-Beam Shank) ═══
    const shankBottomY = 0.046;
    const shankTopY = length - 0.025;
    const shankLen = shankTopY - shankBottomY;
    const shankMidY = (shankBottomY + shankTopY) / 2;
    const flangeThickness = 0.0036;
    const flangeZOffset = 0.0065;

    // Środnik trzonu (Web):
    const webMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, shankLen, 0.0036),
      rodMat
    );
    webMesh.position.set(0, shankMidY, 0);
    webMesh.userData.name = "Trzon korbowodu (profil H-Beam)";
    g.add(webMesh);

    // Półka przednia (+Z):
    const frontFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, shankLen, flangeThickness),
      rodMat
    );
    frontFlange.position.set(0, shankMidY, flangeZOffset);
    frontFlange.userData.name = "Półka trzonu (profil H-Beam)";
    g.add(frontFlange);

    // Półka tylna (-Z):
    const rearFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, shankLen, flangeThickness),
      rodMat
    );
    rearFlange.position.set(0, shankMidY, -flangeZOffset);
    rearFlange.userData.name = "Półka trzonu (profil H-Beam)";
    g.add(rearFlange);

    // Żeberka wzmacniające przejścia w główkę i stopę
    const gussetBottom = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.015, 0.016),
      rodMat
    );
    gussetBottom.position.set(0, shankBottomY + 0.004, 0);
    g.add(gussetBottom);

    const gussetTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.014, 0.014),
      rodMat
    );
    gussetTop.position.set(0, shankTopY - 0.003, 0);
    g.add(gussetTop);

    // ═══ 6. GŁÓWKA KORBOWODU (Small End) ═══
    const smallEndPinR = 0.013;
    const smallEndOuterR = 0.021;
    const smallEndWidth = 0.026;

    const smallEndShape = new THREE.Shape();
    smallEndShape.absarc(0, length, smallEndOuterR, 0, Math.PI * 2, false);
    const smallEndHole = new THREE.Path();
    smallEndHole.absarc(0, length, smallEndPinR, 0, Math.PI * 2, true);
    smallEndShape.holes.push(smallEndHole);

    const smallEndGeo = new THREE.ExtrudeGeometry(smallEndShape, {
      depth: smallEndWidth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.0015,
      bevelThickness: 0.0015
    });
    smallEndGeo.translate(0, 0, -smallEndWidth / 2);
    const smallEndMesh = new THREE.Mesh(smallEndGeo, rodMat);
    smallEndMesh.userData.name = "Główka korbowodu";
    g.add(smallEndMesh);

    // Tulejka brązowa główki (Small End Bushing)
    const bushingGeo = new THREE.CylinderGeometry(smallEndPinR + 0.0003, smallEndPinR + 0.0003, smallEndWidth - 0.001, 20, 1, true);
    const bushingMesh = new THREE.Mesh(bushingGeo, bronzeMat);
    bushingMesh.rotation.x = Math.PI / 2;
    bushingMesh.position.set(0, length, 0);
    bushingMesh.userData.name = "Tulejka brązowa główki korbowodu";
    g.add(bushingMesh);

    g.userData.name = "Korbowód (profil H-Beam)";
    return g;
  }

  createPiston(radius, length) {
    const g = new THREE.Group();
    // Korpus tłoka (denko i płaszcz) - sworzeń znajduje się w Y = 0
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), this.matPiston);
    piston.position.y = 0.035;
    piston.userData.name = "Tłok";
    g.add(piston);

    // Pierścienie tłokowe (2 kompresyjne + 1 zgarniający olejowy)
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.001, 0.002, 8, 32), this.matDarkSteel);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.035 + length / 2 - 0.015 - i * 0.012;
      ring.userData.name = (i < 2) ? `Pierścień uszczelniający #${i+1}` : "Pierścień zgarniający olejowy";
      g.add(ring);
    }

    // Sworzeń tłokowy (dokładnie w Y = 0, spasowany z główką korbowodu)
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, radius * 1.82, 20), this.matSteel);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0, 0, 0);
    pin.userData.name = "Sworzeń tłokowy";
    g.add(pin);

    // Pierścienie osadcze sworznia (Segera)
    [-radius * 0.91, radius * 0.91].forEach(sz => {
      const circlip = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0012, 6, 16), this.matDarkSteel);
      circlip.position.set(0, 0, sz);
      circlip.userData.name = "Pierścień osadczy sworznia (Seger)";
      g.add(circlip);
    });

    g.userData.name = "Tłok kompletny ze sworzniem";
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
    // 1. SPRZĘGŁO i SKRZYNIA BIEGÓW (przytwierdzone do silnika)
    const transGroup = new THREE.Group();
    
    // Sprzęgło
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
    transGroup.add(clutchGroup);

    // Skrzynia Biegów (Manualna)
    const gearbox = new THREE.Group();
    gearbox.position.set(0, 0, this.engineZMin - 0.4); 
    
    const casing = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.3, 0.4, 0.7)), 
      this.crankcaseLineMat
    );
    casing.position.y = -0.1;
    casing.position.z = -0.15;
    casing.userData.name = "Obudowa Skrzyni (Zarys)";
    gearbox.add(casing);

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

    const counterGroup = new THREE.Group();
    counterGroup.position.y = -0.14; 
    counterGroup.position.z = -0.15;
    const counterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 16), this.matDarkSteel);
    counterShaft.rotation.x = Math.PI / 2;
    counterGroup.add(counterShaft);
    
    const cGears = [
      { r: 0.08, z: 0.26 },  
      { r: 0.04, z: 0.12 },  
      { r: 0.06, z: 0.02 },  
      { r: 0.08, z: -0.08 }, 
      { r: 0.10, z: -0.18 }, 
      { r: 0.04, z: -0.28 }  
    ];
    cGears.forEach((g) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, 0.02, 24), this.matSteel);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = g.z;
      counterGroup.add(mesh);
    });
    gearbox.add(counterGroup);
    this.gbCounterGroup = counterGroup;

    const outputGroup = new THREE.Group();
    outputGroup.position.z = -0.25; 
    const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 16), this.matDarkSteel);
    outShaft.rotation.x = Math.PI / 2;
    outputGroup.add(outShaft);
    
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
    
    const syncMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
    const sync1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), syncMat);
    sync1.rotation.x = Math.PI / 2;
    sync1.position.z = 0.17; 
    outputGroup.add(sync1);
    this.gbSync12 = sync1;

    const sync2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), syncMat);
    sync2.rotation.x = Math.PI / 2;
    sync2.position.z = 0.07; 
    outputGroup.add(sync2);
    this.gbSync34 = sync2;
    
    gearbox.add(outputGroup);
    this.gbOutputGroup = outputGroup;
    transGroup.add(gearbox);

    // Dodaj zespół napędowy do mocowania silnika (będzie się obracać i pochylać razem z nim)
    this.engineMountGroup.add(transGroup);


    // 2. DYFERENCJAŁ (Differential - na sztywno z tyłu)
    const diffGroup = new THREE.Group();
    diffGroup.position.set(0, 0.2, -2.2);

    const diffCasing = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(0.22, 16, 16)),
      this.crankcaseLineMat
    );
    diffCasing.userData.name = "Obudowa Dyferencjału (Zarys)";
    diffGroup.add(diffCasing);

    const pinionGear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.12, 16), this.matGold);
    pinionGear.rotation.x = Math.PI / 2;
    pinionGear.position.z = 0.14; 
    pinionGear.userData.name = "Wałek Atakujący (Pinion)";
    diffGroup.add(pinionGear);
    this.pinionMesh = pinionGear;

    const ringGear = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32), this.matBronze);
    ringGear.rotation.z = Math.PI / 2;
    ringGear.position.x = -0.06; 
    ringGear.userData.name = "Koło Talerzowe (Ring Gear)";
    diffGroup.add(ringGear);
    this.ringGearMesh = ringGear;

    const carrier = new THREE.Group();
    carrier.position.x = -0.03; 
    
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

    this.carGroup.add(diffGroup);

    // 3. DYNAMICZNY WAŁ NAPĘDOWY (Prop Shaft) łączący skrzynię biegów z dyferencjałem
    this.engineMountGroup.updateMatrixWorld(true);
    diffGroup.updateMatrixWorld(true);

    const gbOutLocal = new THREE.Vector3(0, 0, this.engineZMin - 0.75); // Koniec wałka głównego skrzyni
    const gbOutWorld = gbOutLocal.clone().applyMatrix4(this.engineMountGroup.matrixWorld);

    const diffInWorld = new THREE.Vector3(0, 0.2, -2.2 + 0.14); // Wałek atakujący (pinion)

    const dist = gbOutWorld.distanceTo(diffInWorld);
    
    const propGroup = new THREE.Group();
    
    const midPoint = new THREE.Vector3().addVectors(gbOutWorld, diffInWorld).multiplyScalar(0.5);
    propGroup.position.copy(midPoint);
    propGroup.lookAt(diffInWorld); // Zawsze celuje w dyferencjał
    
    // Tworzymy cylinder wzdłuż osi Z
    const propGeo = new THREE.CylinderGeometry(0.035, 0.035, dist, 16);
    propGeo.rotateX(Math.PI / 2); // Wyrównanie wzdłuż Z
    const propShaft = new THREE.Mesh(propGeo, this.matSteel);
    
    propShaft.userData.name = "Wał Napędowy (Dynamiczny)";

    propGroup.add(propShaft);
    this.carGroup.add(propGroup);
    this.propShaftMesh = propShaft;
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

    // ═══ ALTERNATOR — obroty proporcjonalne do wału korbowego ═══
    // ω_alt = ω_crank · (D_korbowy / D_alternator) = ω_crank · 2.6
    if (this.alternatorGroup) {
      const altPulleyRatio = 0.085 / 0.033; // ≈ 2.58
      this.alternatorGroup.children.forEach(child => {
        if (child.userData.name === "Koło pasowe alternatora") {
          child.rotation.y = this.crankAngle * altPulleyRatio;
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
    
    if (this.propShaftMesh) this.propShaftMesh.rotation.z = outputSpeed;
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
    const isOHV = this.config.valvetrain === "OHV" || this.config.valvetrain === "valve_ohv";
    const trueCamY = isOHV ? (0.28 + explodeDist * 0.5) : (1.020 + explodeDist * 1.5);

    if (this.banksData) {
      this.banksData.forEach(bank => {
        if (isOHV) {
            const globalCamX = (this.config.layout === 'Inline') ? 0.14 : 0;
            const globalCamY = (this.config.layout === 'Inline') ? (0.28 + explodeDist * 0.5) : (0.18 + explodeDist * 0.5);
            const localX = globalCamX * Math.cos(bank.bankAngle) + globalCamY * Math.sin(bank.bankAngle);
            const localY = -globalCamX * Math.sin(bank.bankAngle) + globalCamY * Math.cos(bank.bankAngle);
            bank.camBaseEx.position.set(localX, localY, 0);
        } else {
            bank.camBaseIn.position.set(-0.045, trueCamY, 0);
            bank.camBaseEx.position.set(0.045, trueCamY, 0);
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
      const flowSpeed = (this.config.rpm / 60) * 0.05; // prędkość przepływu zależna od RPM
      const animTime = time * 0.003 * (this.isPlaying ? (this.speedMult * 2.5) : 0);

      this.flowStreamlines.forEach(item => {
        const strokeAngle = (this.crankAngle + item.phaseOffset) % (Math.PI * 4);

        if (item.type === 'intake') {
          // Suw ssania: 0 → π
          if (strokeAngle >= 0 && strokeAngle < Math.PI) {
            const intensity = Math.sin(strokeAngle);
            item.streams.forEach((st, sIdx) => {
              st.lineMat.opacity = intensity * 0.95;
              // Animuj przesunięcie punktów wzdłuż krzywej
              const posAttr = st.lineMesh.geometry.attributes.position;
              const ptsCount = posAttr.count;
              for (let p = 0; p < ptsCount; p++) {
                const uOrig = p / (ptsCount - 1);
                // Przesunięcie u w czasie w kierunku cylindra (0 → 1)
                const uAnim = (uOrig + animTime * 1.5 + (sIdx * 0.15)) % 1.0;
                const pt = st.curve.getPointAt(uAnim);
                posAttr.setXYZ(p, pt.x, pt.y, pt.z);
              }
              posAttr.needsUpdate = true;
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
      // Wylicz średnią aktywność wydechu wszystkich cylindrów
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
      this.wpPulley.rotation.y = this.crankAngle * (0.085 / 0.045);
    }

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
      
      if (v.isOHV) {
          const rBase = 0.025;
          
          // Recompute localY based on explodeDist
          const globalCamX = (this.config.layout === 'Inline') ? 0.14 : 0;
          const globalCamY = (this.config.layout === 'Inline') ? (0.28 + explodeDist * 0.5) : (0.18 + explodeDist * 0.5);
          
          // Actually, we stored the initial bank angle when we could just use it if we had it, but v doesn't have bankAngle.
          // Wait, v.prY was calculated once, but now with explodeDist changing dynamically, we need it dynamically!
          // We can use the current camGroup position which is already correctly updated by the banksData loop!
          const prBottomYLocal = v.camGroup.parent.position.y + r;
          const prBottomXLocal = v.camGroup.parent.position.x;
          
          const prTopYLocal = valveY + 0.08; 
          const prLen = prTopYLocal - prBottomYLocal - 0.02; // dynamic length
          
          v.pushrod.scale.y = prLen;
          v.pushrod.position.set(prBottomXLocal, prBottomYLocal + prLen / 2, v.prZ);
          
          if (v.rocker) {
              const vTopX = v.offsetX;
              const vTopY = valveY + 0.06;
              const prTopX = prBottomXLocal;
              const prTopY = prBottomYLocal + prLen;
              
              const midX = (vTopX + prTopX) / 2;
              const midY = (vTopY + prTopY) / 2;
              const midZ = (v.offsetZ + v.prZ) / 2;
              
              v.rocker.position.set(midX, midY, midZ);
              
              const dx = vTopX - prTopX;
              const dy = vTopY - prTopY;
              const dz = v.offsetZ - v.prZ;
              const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
              
              v.rocker.children[0].scale.x = dist / 0.12; 
              
              v.rocker.rotation.order = 'ZYX';
              v.rocker.rotation.z = Math.atan2(dy, dx);
              v.rocker.rotation.y = Math.atan2(-dz, Math.sqrt(dx*dx + dy*dy));
          }
      }
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

  checkOverlap() {
    if (!this.carGroup) return { totalChecked: 0, collisions: [], rawList: [] };
    
    // Zaktualizuj macierze transformacji świata
    this.scene.updateMatrixWorld(true);
    
    // Test twierdzenia o osiach rozdzielających (SAT) dla dwóch OBB (Oriented Bounding Box) w 3D
    const testOBBIntersection = (a, b) => {
      const v = new THREE.Vector3().subVectors(b.center, a.center);
      
      const R = [
        [a.axes[0].dot(b.axes[0]), a.axes[0].dot(b.axes[1]), a.axes[0].dot(b.axes[2])],
        [a.axes[1].dot(b.axes[0]), a.axes[1].dot(b.axes[1]), a.axes[1].dot(b.axes[2])],
        [a.axes[2].dot(b.axes[0]), a.axes[2].dot(b.axes[1]), a.axes[2].dot(b.axes[2])]
      ];
      
      const eps = 1e-5;
      const absR = [
        [Math.abs(R[0][0]) + eps, Math.abs(R[0][1]) + eps, Math.abs(R[0][2]) + eps],
        [Math.abs(R[1][0]) + eps, Math.abs(R[1][1]) + eps, Math.abs(R[1][2]) + eps],
        [Math.abs(R[2][0]) + eps, Math.abs(R[2][1]) + eps, Math.abs(R[2][2]) + eps]
      ];
      
      // 1. Sprawdź 3 osie lokalne OBB A
      for (let i = 0; i < 3; i++) {
        const ra = (i === 0) ? a.extents.x : (i === 1) ? a.extents.y : a.extents.z;
        const rb = b.extents.x * absR[i][0] + b.extents.y * absR[i][1] + b.extents.z * absR[i][2];
        if (Math.abs(v.dot(a.axes[i])) > ra + rb) return false;
      }
      
      // 2. Sprawdź 3 osie lokalne OBB B
      for (let i = 0; i < 3; i++) {
        const ra = a.extents.x * absR[0][i] + a.extents.y * absR[1][i] + a.extents.z * absR[2][i];
        const rb = (i === 0) ? b.extents.x : (i === 1) ? b.extents.y : b.extents.z;
        if (Math.abs(v.dot(b.axes[i])) > ra + rb) return false;
      }
      
      // 3. Sprawdź 9 osi iloczynów wektorowych (a.axes[i] x b.axes[j])
      const tA = new THREE.Vector3(v.dot(a.axes[0]), v.dot(a.axes[1]), v.dot(a.axes[2]));
      
      // a0 x b0
      if (Math.abs(tA.z * R[1][0] - tA.y * R[2][0]) > a.extents.y * absR[2][0] + a.extents.z * absR[1][0] + b.extents.y * absR[0][2] + b.extents.z * absR[0][1]) return false;
      // a0 x b1
      if (Math.abs(tA.z * R[1][1] - tA.y * R[2][1]) > a.extents.y * absR[2][1] + a.extents.z * absR[1][1] + b.extents.x * absR[0][2] + b.extents.z * absR[0][0]) return false;
      // a0 x b2
      if (Math.abs(tA.z * R[1][2] - tA.y * R[2][2]) > a.extents.y * absR[2][2] + a.extents.z * absR[1][2] + b.extents.x * absR[0][1] + b.extents.y * absR[0][0]) return false;
      
      // a1 x b0
      if (Math.abs(tA.x * R[2][0] - tA.z * R[0][0]) > a.extents.x * absR[2][0] + a.extents.z * absR[0][0] + b.extents.y * absR[1][2] + b.extents.z * absR[1][1]) return false;
      // a1 x b1
      if (Math.abs(tA.x * R[2][1] - tA.z * R[0][1]) > a.extents.x * absR[2][1] + a.extents.z * absR[0][1] + b.extents.x * absR[1][2] + b.extents.z * absR[1][0]) return false;
      // a1 x b2
      if (Math.abs(tA.x * R[2][2] - tA.z * R[0][2]) > a.extents.x * absR[2][2] + a.extents.z * absR[0][2] + b.extents.x * absR[1][1] + b.extents.y * absR[1][0]) return false;
      
      // a2 x b0
      if (Math.abs(tA.y * R[0][0] - tA.x * R[1][0]) > a.extents.x * absR[1][0] + a.extents.y * absR[0][0] + b.extents.y * absR[2][2] + b.extents.z * absR[2][1]) return false;
      // a2 x b1
      if (Math.abs(tA.y * R[0][1] - tA.x * R[1][1]) > a.extents.x * absR[1][1] + a.extents.y * absR[0][1] + b.extents.x * absR[2][2] + b.extents.z * absR[2][0]) return false;
      // a2 x b2
      if (Math.abs(tA.y * R[0][2] - tA.x * R[1][2]) > a.extents.x * absR[1][2] + a.extents.y * absR[0][2] + b.extents.x * absR[2][1] + b.extents.y * absR[2][0]) return false;

      return true;
    };

    const meshes = [];
    this.carGroup.traverse((child) => {
      if (child.isMesh && child.visible && child.userData && child.userData.name) {
        const name = child.userData.name;
        
        // Pomijaj zarysy, pomocnicze płaszczyzny, linie i punkty referencyjne
        if (
          name.includes("(Zarys)") ||
          name.includes("Zarysy") ||
          name.includes("Datum") ||
          name.includes("Punkt środka") ||
          name.includes("Centrum") ||
          name.includes("Centroid") ||
          name.includes("Oś Cyl") ||
          child.userData.isDatumLabel
        ) {
          return;
        }
        
        // Pomijaj efekty przepływu, płomienie, iskry i gazy
        if (
          name.includes("Gazy ssące") ||
          name.includes("Spaliny") ||
          name.includes("Strumień") ||
          name.includes("Płomień") ||
          name.includes("Iskra")
        ) {
          return;
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            if (child.material.every(m => m.opacity !== undefined && m.opacity < 0.15)) return;
          } else if (child.material.opacity !== undefined && child.material.opacity < 0.15) {
            return;
          }
        }

        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        if (!bbox) return;

        // Lokalny środek i półwymiary (extents)
        const localCenter = new THREE.Vector3().addVectors(bbox.min, bbox.max).multiplyScalar(0.5);
        const localExtents = new THREE.Vector3().subVectors(bbox.max, bbox.min).multiplyScalar(0.5);
        
        // Tolerancja montażowa: margines 6mm (usuwa fałszywe dotknięcia płaszczyzn i złączek)
        const margin = 0.006;
        localExtents.x = Math.max(0.001, localExtents.x - Math.min(margin, localExtents.x * 0.25));
        localExtents.y = Math.max(0.001, localExtents.y - Math.min(margin, localExtents.y * 0.25));
        localExtents.z = Math.max(0.001, localExtents.z - Math.min(margin, localExtents.z * 0.25));

        // Środek w przestrzeni świata
        const worldCenter = localCenter.clone().applyMatrix4(child.matrixWorld);

        // Wyciągnij znormalizowane osie obrotu i skalowanie z macierzy świata
        const e = child.matrixWorld.elements;
        const col0 = new THREE.Vector3(e[0], e[1], e[2]);
        const col1 = new THREE.Vector3(e[4], e[5], e[6]);
        const col2 = new THREE.Vector3(e[8], e[9], e[10]);

        const scaleX = col0.length() || 1;
        const scaleY = col1.length() || 1;
        const scaleZ = col2.length() || 1;

        const u0 = col0.clone().normalize();
        const u1 = col1.clone().normalize();
        const u2 = col2.clone().normalize();

        const extents = new THREE.Vector3(
          localExtents.x * scaleX,
          localExtents.y * scaleY,
          localExtents.z * scaleZ
        );

        // Sfera ograniczająca do szybkiej fazy wstępnej (broad-phase)
        const radius = extents.length();
        const broadSphere = new THREE.Sphere(worldCenter, radius);

        // Identyfikator cylindra (jeśli element należy do danego cylindra)
        let cylId = null;
        let p = child.parent;
        while (p) {
          if (p.userData && p.userData.cylId !== undefined) {
            cylId = p.userData.cylId;
            break;
          }
          p = p.parent;
        }

        meshes.push({
          name: name,
          cylId: cylId,
          mesh: child,
          obb: {
            center: worldCenter,
            extents: extents,
            axes: [u0, u1, u2]
          },
          broadSphere: broadSphere
        });
      }
    });

    // Sprawdzenie, czy dwa elementy tworzą zamierzony, zintegrowany mechanizm montażowy
    const isConnectedPair = (a, b) => {
      const nA = a.name.toLowerCase();
      const nB = b.name.toLowerCase();

      if (nA === nB) return true;

      // Części tego samego zespołu cylindra (tłok, pierścienie, sworzeń, zawory, świeca w jednym cylindrze)
      if (a.cylId !== null && b.cylId !== null && a.cylId === b.cylId) return true;

      // Korbowód (trzon, stopa, główka, śruby, panewki, tulejki, półki, środnik)
      const isRodA = nA.includes("korbowód") || nA.includes("korbowod") || nA.includes("trzon") || nA.includes("stopa") || nA.includes("główka") || nA.includes("panewka") || nA.includes("tulejka") || nA.includes("półka") || nA.includes("środnik") || nA.includes("śruba") || nA.includes("pokrywa stopy");
      const isRodB = nB.includes("korbowód") || nB.includes("korbowod") || nB.includes("trzon") || nB.includes("stopa") || nB.includes("główka") || nB.includes("panewka") || nB.includes("tulejka") || nB.includes("półka") || nB.includes("środnik") || nB.includes("śruba") || nB.includes("pokrywa stopy");
      if (isRodA && isRodB) return true;

      // Korbowód + tłok / sworzeń / pierścienie
      const isPistonA = nA.includes("tłok") || nA.includes("tlok") || nA.includes("pierścień") || nA.includes("pierscien") || nA.includes("sworzeń") || nA.includes("sworzen") || nA.includes("seger");
      const isPistonB = nB.includes("tłok") || nB.includes("tlok") || nB.includes("pierścień") || nB.includes("pierscien") || nB.includes("sworzeń") || nB.includes("sworzen") || nB.includes("seger");
      if ((isRodA && isPistonB) || (isPistonA && isRodB)) return true;

      // Korbowód + wał korbowy / czopy / przeciwciężary
      const isCrankA = nA.includes("wał korbowy") || nA.includes("wal korbowy") || nA.includes("czop") || nA.includes("wykorbienie") || nA.includes("przeciwwaga") || nA.includes("przeciwciężar") || nA.includes("ramię") || nA.includes("snout") || nA.includes("koło zębate wału") || nA.includes("koło pasowe wału") || nA.includes("koło zamachowe") || nA.includes("kołnierz");
      const isCrankB = nB.includes("wał korbowy") || nB.includes("wal korbowy") || nB.includes("czop") || nB.includes("wykorbienie") || nB.includes("przeciwwaga") || nB.includes("przeciwciężar") || nB.includes("ramię") || nB.includes("snout") || nB.includes("koło zębate wału") || nB.includes("koło pasowe wału") || nB.includes("koło zamachowe") || nB.includes("kołnierz");
      if ((isRodA && isCrankB) || (isCrankA && isRodB)) return true;
      if (isCrankA && isCrankB) return true;

      // Wał / koło zamachowe + sprzęgło
      const isClutchA = nA.includes("sprzęgło") || nA.includes("sprzeglo") || nA.includes("tarcza") || nA.includes("docisk") || nA.includes("koło zamachowe");
      const isClutchB = nB.includes("sprzęgło") || nB.includes("sprzeglo") || nB.includes("tarcza") || nB.includes("docisk") || nB.includes("koło zamachowe");
      if (isClutchA && isClutchB) return true;
      if ((isCrankA && isClutchB) || (isClutchA && isCrankB)) return true;

      // Rozrząd: wałki rozrządu, koła zębate, krzywki, szklanki popychaczy, dźwigienki, zawory, sprężyny
      const isValveA = nA.includes("zawór") || nA.includes("zawor") || nA.includes("grzybek") || nA.includes("sprężyna") || nA.includes("szklanka") || nA.includes("popychacz") || nA.includes("dźwigienka") || nA.includes("laska");
      const isValveB = nB.includes("zawór") || nB.includes("zawor") || nB.includes("grzybek") || nB.includes("sprężyna") || nB.includes("szklanka") || nB.includes("popychacz") || nB.includes("dźwigienka") || nB.includes("laska");
      const isCamA = nA.includes("wałek rozrządu") || nA.includes("walek rozrzadu") || nA.includes("krzywka") || nA.includes("koło wałka");
      const isCamB = nB.includes("wałek rozrządu") || nB.includes("walek rozrzadu") || nB.includes("krzywka") || nB.includes("koło wałka");
      if (isCamA && isCamB) return true;
      if ((isCamA && isValveB) || (isValveA && isCamB)) return true;
      if (isValveA && isValveB) return true;

      // Paski i koła pasowe / napinacze / alternator / pompa wody
      const isBeltAuxA = nA.includes("pasek") || nA.includes("koło pasowe") || nA.includes("napinacz") || nA.includes("rolka") || nA.includes("alternator") || nA.includes("pompa");
      const isBeltAuxB = nB.includes("pasek") || nB.includes("koło pasowe") || nB.includes("napinacz") || nB.includes("rolka") || nB.includes("alternator") || nB.includes("pompa");
      if (isBeltAuxA && isBeltAuxB) return true;

      // Dolot: plenum, przepustnica, klapa motylkowa, oś klapy, runner, filtr, wtryskiwacz, listwa wtryskowa
      const isIntakeA = nA.includes("plenum") || nA.includes("przepustnica") || nA.includes("klapa") || nA.includes("oś klapy") || nA.includes("kolektor dolotowy") || nA.includes("runner") || nA.includes("filtr") || nA.includes("wtryskiwacz") || nA.includes("listwa wtryskowa");
      const isIntakeB = nB.includes("plenum") || nB.includes("przepustnica") || nB.includes("klapa") || nB.includes("oś klapy") || nB.includes("kolektor dolotowy") || nB.includes("runner") || nB.includes("filtr") || nB.includes("wtryskiwacz") || nB.includes("listwa wtryskowa");
      if (isIntakeA && isIntakeB) return true;

      // Wydech: rury wydechowe, kolektory, rura Y-pipe, złącze elastyczne, katalizator, tłumik, końcówka wydechu
      const isExhaustA = nA.includes("kolektor wydechowy") || nA.includes("kolektor zbiorczy") || nA.includes("y-pipe") || nA.includes("flex pipe") || nA.includes("złącze elastyczne") || nA.includes("katalizator") || nA.includes("tłumik") || nA.includes("tlumik") || nA.includes("końcówka wydechu") || nA.includes("rura układu wydechowego");
      const isExhaustB = nB.includes("kolektor wydechowy") || nB.includes("kolektor zbiorczy") || nB.includes("y-pipe") || nB.includes("flex pipe") || nB.includes("złącze elastyczne") || nB.includes("katalizator") || nB.includes("tłumik") || nB.includes("tlumik") || nB.includes("końcówka wydechu") || nB.includes("rura układu wydechowego");
      if (isExhaustA && isExhaustB) return true;

      // Skrzynia biegów i napęd (wał wejściowy, wyjściowy, koła zębate, przesuwki, synchronizatory, wał napędowy)
      const isGearboxA = nA.includes("skrzynia") || nA.includes("wałek wejściowy") || nA.includes("wałek wyjściowy") || nA.includes("koło biegu") || nA.includes("zębatka bieg") || nA.includes("synchronizator") || nA.includes("przesuwka") || nA.includes("wał napędowy") || nA.includes("prop shaft");
      const isGearboxB = nB.includes("skrzynia") || nB.includes("wałek wejściowy") || nB.includes("wałek wyjściowy") || nB.includes("koło biegu") || nB.includes("zębatka bieg") || nB.includes("synchronizator") || nB.includes("przesuwka") || nB.includes("wał napędowy") || nB.includes("prop shaft");
      if (isGearboxA && isGearboxB) return true;

      // Mechanizm różnicowy (dyferencjał, kosz, koło talerzowe, wałek atakujący, satelity, koła koronowe, półosie)
      const isDiffA = nA.includes("dyferencjał") || nA.includes("dyferencjal") || nA.includes("satelit") || nA.includes("krzyżak") || nA.includes("krzyzak") || nA.includes("kosz") || nA.includes("koło talerzowe") || nA.includes("kolo talerzowe") || nA.includes("wałek atakujący") || nA.includes("walek atakujacy") || nA.includes("koło koronowe") || nA.includes("kolo koronowe") || nA.includes("półoś") || nA.includes("polos") || nA.includes("lsd") || nA.includes("blokada");
      const isDiffB = nB.includes("dyferencjał") || nB.includes("dyferencjal") || nB.includes("satelit") || nB.includes("krzyżak") || nB.includes("krzyzak") || nB.includes("kosz") || nB.includes("koło talerzowe") || nB.includes("kolo talerzowe") || nB.includes("wałek atakujący") || nB.includes("walek atakujacy") || nB.includes("koło koronowe") || nB.includes("kolo koronowe") || nB.includes("półoś") || nB.includes("polos") || nB.includes("lsd") || nB.includes("blokada");
      if (isDiffA && isDiffB) return true;
      if ((isDiffA && isGearboxB) || (isGearboxA && isDiffB)) return true; // połączenie wał napędowy -> wałek atakujący

      // Układ chłodzenia (rdzeń chłodnicy, lamele, zbiornik, węże)
      if (nA.includes("chłodnic") && nB.includes("chłodnic")) return true;

      // Koła, felgi, opony i hamulce (tarcza hamulcowa, zacisk, felga, opona)
      const isWheelA = nA.includes("koło") || nA.includes("felga") || nA.includes("opona") || nA.includes("tarcza hamulcowa") || nA.includes("zacisk");
      const isWheelB = nB.includes("koło") || nB.includes("felga") || nB.includes("opona") || nB.includes("tarcza hamulcowa") || nB.includes("zacisk");
      if (isWheelA && isWheelB) return true;

      // Zawieszenie (wahacze, amortyzatory, sprężyny, zwrotnice, łączniki)
      const isSuspA = nA.includes("wahacz") || nA.includes("amortyzator") || nA.includes("sprężyna") || nA.includes("zwrotnica") || nA.includes("łącznik") || nA.includes("stabilizator");
      const isSuspB = nB.includes("wahacz") || nB.includes("amortyzator") || nB.includes("sprężyna") || nB.includes("zwrotnica") || nB.includes("łącznik") || nB.includes("stabilizator");
      if (isSuspA && isSuspB) return true;

      // Rama i belki nośne
      if ((nA.includes("rama") || nA.includes("belka")) && (nB.includes("rama") || nB.includes("belka"))) return true;

      return false;
    };

    const overlaps = [];
    for (let i = 0; i < meshes.length; i++) {
      for (let j = i + 1; j < meshes.length; j++) {
        const itemA = meshes[i];
        const itemB = meshes[j];

        if (isConnectedPair(itemA, itemB)) continue;

        // Faza 1: Szybki test sfer ograniczających (broad-phase)
        const distSq = itemA.obb.center.distanceToSquared(itemB.obb.center);
        const radSum = itemA.broadSphere.radius + itemB.broadSphere.radius;
        if (distSq > radSum * radSum) continue;

        // Faza 2: Precyzyjny test SAT dla OBB z tolerancją montażową
        if (testOBBIntersection(itemA.obb, itemB.obb)) {
          overlaps.push(`- <b>${itemA.name}</b> koliduje z <b>${itemB.name}</b>`);
        }
      }
    }

    const uniqueOverlaps = [...new Set(overlaps)];
    const deg = Math.round(((this.crankAngle * 180 / Math.PI) % 720 + 720) % 720);
    return {
      totalChecked: meshes.length,
      collisions: uniqueOverlaps,
      rawList: uniqueOverlaps.map(str => str.replace(/<[^>]*>/g, '')),
      crankAngleDeg: deg
    };
  }
}
