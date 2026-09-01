import * as THREE from 'three';
import { GEARBOX_PRESETS } from '../scene3d.js';
import { CRANK_PRESETS, RadialCrankUI } from '../crankshaft_solver.js';

export function showGearboxInfo() {
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

export function showDiffInfo() {
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

export function setupDevPanel() {
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

    const updateDisplacementDisplay = () => {
      const bore = this.config.boreMm || 84.0;
      const stroke = this.config.strokeMm || 90.0;
      const cyls = this.config.cylinders || 4;
      const dispCm3 = cyls * Math.PI * Math.pow(bore / 20, 2) * (stroke / 10);
      const dispL = (dispCm3 / 1000).toFixed(2);
      const dispRounded = Math.round(dispCm3);
      const dispEl = document.getElementById('dev_disp_val');
      if (dispEl) {
        dispEl.innerText = `${dispRounded} cm³ (${dispL}L)`;
      }
    };

    setupButtonGroup('dev_layout', (val) => {
      this.config.layout = val;
      const angleContainer = document.getElementById('dev_angle_container');
      if (angleContainer) {
          angleContainer.style.display = (val === 'Inline' || val === 'VR' || val === 'Boxer') ? 'none' : 'block';
      }
      if (val === 'VR') {
        const devAngle = document.getElementById('dev_angle');
        if (devAngle) devAngle.value = 15;
        const devAngleVal = document.getElementById('dev_angle_val');
        if (devAngleVal) devAngleVal.innerText = 15;
        this.config.vAngle = 15;
      }
      this.updateV8UI();
      updateDisplacementDisplay();
      this.rebuildFullCar();
    });

    const devCyl = document.getElementById('dev_cyl');
    if (devCyl) {
      devCyl.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_cyl_val');
        if (valEl) valEl.innerText = e.target.value;
        this.config.cylinders = parseInt(e.target.value);
        this.updateV8UI();
        updateDisplacementDisplay();
        this.rebuildFullCar();
      });
    }

    const devBore = document.getElementById('dev_bore');
    if (devBore) {
      devBore.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valEl = document.getElementById('dev_bore_val');
        if (valEl) valEl.innerText = `${val.toFixed(1)} mm`;
        this.config.boreMm = val;
        updateDisplacementDisplay();
        this.rebuildFullCar();
      });
    }

    const devStrokeLen = document.getElementById('dev_stroke_len');
    if (devStrokeLen) {
      devStrokeLen.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valEl = document.getElementById('dev_stroke_len_val');
        if (valEl) valEl.innerText = `${val.toFixed(1)} mm`;
        this.config.strokeMm = val;
        updateDisplacementDisplay();
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

    // ═══ WYBÓR UKŁADU WYDECHOWEGO (1 vs 2 rury) ═══
    setupButtonGroup('dev_exhaust_pipes', (val) => {
      this.config.exhaustPipes = val;
      this.rebuildFullCar();
    });

    // ═══ WYBÓR WAŁU DLA V8 (Crossplane vs Flatplane) ═══
    setupButtonGroup('dev_v8_crank', (val) => {
      this.config.v8CrankType = val;
      this.updateV8UI();
      this.rebuildFullCar();
    });

    // ═══ TRYB WAŁU (Wzorce vs Własny Tuning) ═══
    setupButtonGroup('dev_crank_mode', (val) => {
      this.config.customOverride = (val === 'custom');
      const radialContainer = document.getElementById('radial_tuning_container');
      const presetCard = document.getElementById('crank_preset_card');
      if (radialContainer) radialContainer.style.display = (val === 'custom') ? 'block' : 'none';
      if (presetCard) presetCard.style.display = (val === 'custom') ? 'none' : 'block';

      if (val === 'custom' && this.radialUI && this.movingCylinders.length > 0) {
        const angles = this.movingCylinders.map(c => Math.round(((c.crankPinAngle * 180 / Math.PI) % 360 + 360) % 360));
        this.radialUI.setAngles(angles);
      }
      this.rebuildFullCar();
    });

    // ═══ INTERAKTYWNY RADIAL UI (Biegunowa Tarcza 360°) ═══
    const radialCanvas = document.getElementById('radial_crank_canvas');
    if (radialCanvas) {
      this.radialUI = new RadialCrankUI(radialCanvas, (newAnglesDeg) => {
        this.config.customOverride = true;
        this.config.customCrankPins = [...newAnglesDeg];
        this.rebuildFullCar();
      });
    }

    const btnResetCrank = document.getElementById('btn_reset_crank');
    if (btnResetCrank) {
      btnResetCrank.addEventListener('click', () => {
        this.config.customCrankPins = null;
        this.rebuildFullCar();
        if (this.radialUI && this.movingCylinders.length > 0) {
          const angles = this.movingCylinders.map(c => Math.round(((c.crankPinAngle * 180 / Math.PI) % 360 + 360) % 360));
          this.radialUI.setAngles(angles);
        }
      });
    }

    const chkSnap15 = document.getElementById('radial_snap_15');
    if (chkSnap15) {
      chkSnap15.addEventListener('change', (e) => {
        if (this.radialUI) this.radialUI.snapToGrid = e.target.checked;
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

    setupButtonGroup('dev_drivetrain_layout', (val) => {
      this.config.drivetrainLayout = val;
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

    // ═══ ZWIJANIE ZAKŁADEK (COLLAPSIBLE ACCORDION) ═══
    document.querySelectorAll('.panel-section.collapsible .section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.panel-section');
        if (section) section.classList.toggle('collapsed');
      });
    });

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
        if (valEl) valEl.innerText = parseFloat(e.target.value).toFixed(2);
        this.config.finalDrive = parseFloat(e.target.value);
      });
    }

    // ═══ PRESETY SKRZYNI BIEGÓW ═══
    setupButtonGroup('dev_gearbox_preset', (val) => {
      this.config.gearboxPreset = val;
      const customContainer = document.getElementById('custom_gearbox_container');
      const descEl = document.getElementById('dev_gearbox_desc');
      const btnG6 = document.getElementById('btn_gear_6');
      const finalDriveSlider = document.getElementById('dev_final_drive');
      const finalDriveVal = document.getElementById('dev_final_drive_val');

      if (val === 'custom') {
        if (customContainer) customContainer.style.display = 'block';
        if (descEl) descEl.innerHTML = `🛠 <b>Własne stopniowanie:</b> Dopasuj przełożenia poszczególnych biegów oraz dyferencjału do charakterystyki silnika.`;
        if (btnG6) btnG6.style.display = 'inline-block';
      } else {
        if (customContainer) customContainer.style.display = 'none';
        const preset = GEARBOX_PRESETS[val] || GEARBOX_PRESETS.opel_f17;
        if (descEl) descEl.innerText = preset.desc;
        if (btnG6) btnG6.style.display = (preset.speeds === 6) ? 'inline-block' : 'none';
        if (preset.speeds === 5 && this.config.currentGear === '6') {
          this.config.currentGear = '5';
          const btns = document.querySelectorAll('#dev_gearbox button');
          btns.forEach(b => b.classList.remove('active'));
          document.querySelector('#dev_gearbox button[data-gear="5"]')?.classList.add('active');
        }
        this.config.finalDrive = preset.finalDrive;
        if (finalDriveSlider) finalDriveSlider.value = preset.finalDrive;
        if (finalDriveVal) finalDriveVal.innerText = preset.finalDrive.toFixed(2);
      }
    });

    // ═══ SUWAKI WŁASNYCH PRZEŁOŻEŃ (Custom Gearbox) ═══
    ['1', '2', '3', '4', '5', '6', 'r'].forEach(gKey => {
      const slider = document.getElementById(`slider_g${gKey}`);
      const valEl = document.getElementById(`val_g${gKey}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const ratioVal = parseFloat(e.target.value);
          const actualKey = gKey === 'r' ? 'R' : gKey;
          const finalVal = gKey === 'r' ? -ratioVal : ratioVal;
          this.config.gearboxCustomRatios[actualKey] = finalVal;
          if (valEl) valEl.innerText = (gKey === 'r' ? '-' : '') + ratioVal.toFixed(2);
        });
      }
    });

    // ═══ WYBÓR AKTUALNEGO BIEGU (R, N, 1..6) ═══
    setupButtonGroup('dev_gearbox', (val) => {
      this.config.currentGear = val;
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

    const chkChassis = document.getElementById('toggle_chassis');
    if (chkChassis) {
      chkChassis.checked = this.config.showChassis || false;
      chkChassis.addEventListener('change', (e) => {
        this.config.showChassis = e.target.checked;
        this.rebuildFullCar();
      });
    }
  }

export function getCurrentGearRatio() {
    const currentG = this.config.currentGear || '1';
    if (currentG === 'N') return 0;
    if (this.config.gearboxPreset === 'custom') {
      return this.config.gearboxCustomRatios[currentG] !== undefined ? this.config.gearboxCustomRatios[currentG] : 1.0;
    }
    const preset = GEARBOX_PRESETS[this.config.gearboxPreset] || GEARBOX_PRESETS.opel_f17;
    return preset.ratios[currentG] !== undefined ? preset.ratios[currentG] : 1.0;
  }

export function updateCrankshaftUI() {
    this.updateV8UI();
    this.updatePresetCard();
    this.updateBalanceUI();
    this.updateStatusPills();

    if (this.radialUI && !this.config.customOverride && this.movingCylinders && this.movingCylinders.length > 0) {
      const angles = this.movingCylinders.map(c => Math.round(((c.crankPinAngle * 180 / Math.PI) % 360 + 360) % 360));
      this.radialUI.setCylinderCount(this.config.cylinders, angles);
    }
  }

export function updateV8UI() {
    const v8Container = document.getElementById('dev_v8_crank_container');
    const noteEl = document.getElementById('v8_crank_note');
    if (v8Container) {
      const isV8 = (this.config.layout === 'V' && this.config.cylinders === 8);
      v8Container.style.display = isV8 ? 'block' : 'none';
      if (isV8 && noteEl) {
        if (this.config.v8CrankType === 'crossplane') {
          noteEl.innerHTML = `<b>Crossplane (90°):</b> Klasyczny bulgot V8. Przeciwciężary niwelują siły bezwładności I i II rzędu.`;
        } else {
          noteEl.innerHTML = `<b>Flat-Plane (180°):</b> Lekki wał wyścigowy o szybkiej reakcji na obroty, generujący wibracje drugiego rzędu.`;
        }
      }
    }
  }

export function updatePresetCard() {
    const card = document.getElementById('crank_preset_card');
    const nameEl = document.getElementById('crank_preset_name');
    const descEl = document.getElementById('crank_preset_desc');
    const techEl = document.getElementById('crank_preset_tech');
    const badgeEl = document.getElementById('crank_preset_badge');

    if (!card) return;

    const key = (this.config.layout === 'V' && this.config.cylinders === 8)
      ? `V_8_${this.config.v8CrankType || 'crossplane'}`
      : `${this.config.layout}_${this.config.cylinders}`;

    const preset = CRANK_PRESETS[key];
    if (preset) {
      if (nameEl) nameEl.innerText = preset.name;
      if (descEl) descEl.innerText = preset.description;
      if (techEl) techEl.innerText = preset.technicalNote;
      if (badgeEl) {
        badgeEl.innerText = 'Preset Inżynieryjny';
        badgeEl.className = 'crank-badge engineered';
      }
    } else {
      const cycle = this.config.stroke === 2 ? 360 : 720;
      const dGamma = (cycle / this.config.cylinders).toFixed(1);
      if (nameEl) nameEl.innerText = `${this.config.layout}-${this.config.cylinders} (Even-Fire)`;
      if (descEl) descEl.innerText = `Niestandardowa architektura. Równomierny zapłon co ${dGamma}° z czopami dzielonymi (split-pin).`;
      if (techEl) techEl.innerText = `Interwał zapłonu Δγ = ${dGamma}°`;
      if (badgeEl) {
        badgeEl.innerText = 'Algorytm Zapasowy';
        badgeEl.className = 'crank-badge fallback';
      }
    }
  }

export function updateBalanceUI() {
    const box = document.getElementById('crank_diagnostics_box');
    const icon = document.getElementById('diag_status_icon');
    const title = document.getElementById('diag_title');
    const msg = document.getElementById('diag_message');
    const rec = document.getElementById('diag_rec');

    if (!this.currentBalanceReport || !box) return;
    const report = this.currentBalanceReport;

    box.className = `crank-diag-box ${report.status}`;
    if (icon) {
      if (report.status === 'perfect') icon.innerText = '✓';
      else if (report.status === 'warning-secondary') icon.innerText = '!';
      else if (report.status === 'warning-moment') icon.innerText = '~';
      else icon.innerText = '✕';
    }
    if (title) title.innerText = report.title;
    if (msg) msg.innerText = report.message;
    if (rec) rec.innerText = report.recommendation;
  }

export function updateStatusPills() {
    // 1. Engine status pill
    const pEngine = document.getElementById('status_engine');
    if (pEngine) {
      const layoutShort = this.config.layout === 'Inline' ? 'R' : this.config.layout === 'Boxer' ? 'B' : this.config.layout;
      const bore = this.config.boreMm || 84.0;
      const stroke = this.config.strokeMm || 90.0;
      const cyls = this.config.cylinders || 4;
      const dispCm3 = cyls * Math.PI * Math.pow(bore / 20, 2) * (stroke / 10);
      const dispL = (dispCm3 / 1000).toFixed(1);
      pEngine.innerText = `${layoutShort}${cyls} • ${dispL}L`;
    }

    // 2. Crank status pill
    const pCrank = document.getElementById('status_crank');
    if (pCrank) {
      if (this.config.customOverride) {
        pCrank.innerText = 'Custom 360°';
      } else {
        const key = (this.config.layout === 'V' && this.config.cylinders === 8)
          ? `V_8_${this.config.v8CrankType || 'crossplane'}`
          : `${this.config.layout}_${this.config.cylinders}`;
        const preset = CRANK_PRESETS[key];
        if (preset) {
          pCrank.innerText = preset.name.replace(/^(R\d+|V\d+|B\d+|VR\d+|W\d+)\s+/, '');
        } else {
          pCrank.innerText = `${this.config.cylinders}-cyl`;
        }
      }
    }

    // 3. Drivetrain status pill
    const pDrive = document.getElementById('status_drivetrain');
    if (pDrive) {
      const g = this.config.currentGear || '1';
      const rpm = this.config.rpm || 1000;
      pDrive.innerText = `${g} • ${rpm} RPM`;
    }

    // 4. Physics status pill
    const pPhys = document.getElementById('status_physics');
    if (pPhys && this.currentBalanceReport) {
      pPhys.innerText = this.currentBalanceReport.status === 'perfect' ? 'Balans OK' : 'Wibracje';
    }

    // 5. View status pill
    const pView = document.getElementById('status_view');
    if (pView) {
      pView.innerText = this.isCutaway ? 'Przekrój' : 'Studio';
    }
  }

export function updateWireframeVisibility() {
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

export function setupTooltip() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.005;
    this.raycaster.params.Points.threshold = 0.005;
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.tooltip = document.createElement('div');
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.background = 'rgba(20, 20, 25, 0.94)';
    this.tooltip.style.color = '#ffffff';
    this.tooltip.style.padding = '6px 12px';
    this.tooltip.style.borderRadius = '8px';
    this.tooltip.style.border = '1px solid rgba(255, 255, 255, 0.14)';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.display = 'none';
    this.tooltip.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
    this.tooltip.style.fontSize = '11.5px';
    this.tooltip.style.letterSpacing = '-0.01em';
    this.tooltip.style.zIndex = '90';
    this.tooltip.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
    this.tooltip.style.fontWeight = '600';
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

export function updateTooltip() {
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
        this.tooltip.innerHTML = `<span style="color: #86868b; font-size: 9.5px; text-transform: uppercase; margin-right: 6px; font-weight: 500;">ELEMENT</span><span>${foundName}</span>`;
        this.tooltip.style.display = 'block';
      } else {
        this.tooltip.style.display = 'none';
      }
      this.isRaycasting = false;
    });
  }

