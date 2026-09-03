import * as THREE from 'three';
import { GEARBOX_PRESETS } from '../scene3d.js';
import { CRANK_PRESETS, RadialCrankUI } from '../crankshaft_solver.js';
import { i18n } from '../i18n.js';

export class DevUIController {
  [key: string]: any;

  constructor(scene) {
    this.scene = scene;
  }


showGearboxInfo() {
    const lang = this.scene.lang || 'pl';
    const t = i18n[lang] || i18n.pl;
    const gb = t.gearboxDrawer || i18n.pl.gearboxDrawer;
    const currentG = this.scene.config.currentGear || '1';

    let title = (gb as any).title;
    let principle = gb.principle;
    let why = gb.why;
    let history = gb.history;
    let examples = gb.examplesTemplate.replace('{gear}', currentG);

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
    const lang = this.scene.lang || 'pl';
    const t = i18n[lang] || i18n.pl;
    const diffType = this.scene.config.diffType || 'open';
    const dInfo = (t.diffs && t.diffs[diffType]) ? t.diffs[diffType] : (i18n.pl.diffs[diffType] || i18n.pl.diffs.open);

    let title = (dInfo as any).title;
    let principle = dInfo.principle;
    let why = dInfo.why;
    let history = dInfo.history;
    let examples = dInfo.examples;

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
          (e.target as any).classList.add('active');
          callback((e.target as any).getAttribute('data-val') || (e.target as any).getAttribute('data-gear'));
        });
      });
    };

    // ═══ OBSŁUGA GŁÓWNYCH TRYBÓW (Konfigurator vs Statystyki) ═══
    const modeBtns = document.querySelectorAll('.mode-tab-btn');
    const modeViews = document.querySelectorAll('.mode-view');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as any).dataset.mode;
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        modeViews.forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(`mode_${mode}_view`);
        if (targetView) targetView.classList.add('active');
        this.updateEngineStats();
      });
    });

    // ═══ OBSŁUGA PODZAKŁADEK KONFIGURATORA ═══
    const subtabBtns = document.querySelectorAll('.subtab-btn');
    const subtabPanes = document.querySelectorAll('.subtab-pane');
    subtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = (btn as any).dataset.subtab;
        subtabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        subtabPanes.forEach(p => p.classList.remove('active'));
        const targetPane = document.getElementById(`subtab_${subtab}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    const updateDisplacementDisplay = () => {
      const bore = this.scene.config.boreMm || 84.0;
      const stroke = this.scene.config.strokeMm || 90.0;
      const cyls = this.scene.config.cylinders || 4;
      const dispCm3 = cyls * Math.PI * Math.pow(bore / 20, 2) * (stroke / 10);
      const dispL = (dispCm3 / 1000).toFixed(2);
      const dispRounded = Math.round(dispCm3);
      const dispEl = document.getElementById('dev_disp_val');
      if (dispEl) {
        dispEl.innerText = `${dispRounded} cm³ (${dispL}L)`;
      }
      this.updateEngineStats();
    };

    setupButtonGroup('dev_layout', (val) => {
      this.scene.config.layout = val;
      const angleContainer = document.getElementById('dev_angle_container');
      if (angleContainer) {
          angleContainer.style.display = (val === 'Inline' || val === 'VR' || val === 'Boxer') ? 'none' : 'block';
      }
      if (val === 'VR') {
        const devAngle = document.getElementById('dev_angle');
        if (devAngle) (devAngle as any).value = 15;
        const devAngleVal = document.getElementById('dev_angle_val');
        if (devAngleVal) devAngleVal.innerText = "15";
        this.scene.config.vAngle = 15;
      }
      this.updateV8UI();
      updateDisplacementDisplay();
      this.scene.rebuildFullCar();
    });

    const devCyl = document.getElementById('dev_cyl');
    if (devCyl) {
      devCyl.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_cyl_val');
        if (valEl) valEl.innerText = (e.target as any).value;
        this.scene.config.cylinders = parseInt((e.target as any).value);
        this.updateV8UI();
        updateDisplacementDisplay();
        this.scene.rebuildFullCar();
      });
    }

    const devBore = document.getElementById('dev_bore');
    if (devBore) {
      devBore.addEventListener('input', (e) => {
        const val = parseFloat((e.target as any).value);
        const valEl = document.getElementById('dev_bore_val');
        if (valEl) valEl.innerText = `${val.toFixed(1)} mm`;
        this.scene.config.boreMm = val;
        updateDisplacementDisplay();
        this.scene.rebuildFullCar();
      });
    }

    const devStrokeLen = document.getElementById('dev_stroke_len');
    if (devStrokeLen) {
      devStrokeLen.addEventListener('input', (e) => {
        const val = parseFloat((e.target as any).value);
        const valEl = document.getElementById('dev_stroke_len_val');
        if (valEl) valEl.innerText = `${val.toFixed(1)} mm`;
        this.scene.config.strokeMm = val;
        updateDisplacementDisplay();
        this.scene.rebuildFullCar();
      });
    }

    const devAngle = document.getElementById('dev_angle');
    if (devAngle) {
      devAngle.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_angle_val');
        if (valEl) valEl.innerText = (e.target as any).value;
        this.scene.config.vAngle = parseInt((e.target as any).value);
        this.updateEngineStats();
        this.scene.rebuildFullCar();
      });
    }

    // ═══ WYBÓR UKŁADU WYDECHOWEGO (1 vs 2 rury) ═══
    setupButtonGroup('dev_exhaust_pipes', (val) => {
      this.scene.config.exhaustPipes = val;
      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });

    // ═══ WYBÓR WAŁU DLA V8 (Crossplane vs Flatplane) ═══
    setupButtonGroup('dev_v8_crank', (val) => {
      this.scene.config.v8CrankType = val;
      this.updateV8UI();
      this.scene.rebuildFullCar();
    });

    // ═══ TRYB WAŁU (Wzorce vs Własny Tuning) ═══
    setupButtonGroup('dev_crank_mode', (val) => {
      this.scene.config.customOverride = (val === 'custom');
      const radialContainer = document.getElementById('radial_tuning_container');
      const presetCard = document.getElementById('crank_preset_card');
      if (radialContainer) radialContainer.style.display = (val === 'custom') ? 'block' : 'none';
      if (presetCard) presetCard.style.display = (val === 'custom') ? 'none' : 'block';

      if (val === 'custom' && this.scene.radialUI && this.scene.movingCylinders.length > 0) {
        const angles = this.scene.movingCylinders.map(c => Math.round(((c.crankPinAngle * 180 / Math.PI) % 360 + 360) % 360));
        this.scene.radialUI.setAngles(angles);
      }
      this.scene.rebuildFullCar();
    });

    // ═══ INTERAKTYWNY RADIAL UI (Biegunowa Tarcza 360°) ═══
    const radialCanvas = document.getElementById('radial_crank_canvas');
    if (radialCanvas) {
      this.scene.radialUI = new RadialCrankUI(radialCanvas, (newAnglesDeg) => {
        this.scene.config.customOverride = true;
        this.scene.config.customCrankPins = [...newAnglesDeg];
        this.scene.rebuildFullCar();
      });
    }

    const btnResetCrank = document.getElementById('btn_reset_crank');
    if (btnResetCrank) {
      btnResetCrank.addEventListener('click', () => {
        this.scene.config.customCrankPins = null;
        this.scene.rebuildFullCar();
        if (this.scene.radialUI && this.scene.movingCylinders.length > 0) {
          const angles = this.scene.movingCylinders.map(c => Math.round(((c.crankPinAngle * 180 / Math.PI) % 360 + 360) % 360));
          this.scene.radialUI.setAngles(angles);
        }
      });
    }

    const chkSnap15 = document.getElementById('radial_snap_15');
    if (chkSnap15) {
      chkSnap15.addEventListener('change', (e) => {
        if (this.scene.radialUI) this.scene.radialUI.snapToGrid = (e.target as any).checked;
      });
    }

    const updateValveButtonsState = () => {
      const btn4V = document.querySelector('#dev_valves button[data-val="4"]');
      if (btn4V) {
        if (this.scene.config.valvetrain === 'OHV') {
          (btn4V as any).disabled = true;
          (btn4V as any).style.opacity = '0.5';
          (btn4V as any).style.cursor = 'not-allowed';
          (btn4V as any).title = "Układ OHV jest kompatybilny tylko z 2 zaworami na cylinder w tym symulatorze.";
        } else {
          (btn4V as any).disabled = false;
          (btn4V as any).style.opacity = '1';
          (btn4V as any).style.cursor = 'pointer';
          (btn4V as any).title = "";
        }
      }
    };

    setupButtonGroup('dev_valves', (val) => {
      if (this.scene.config.valvetrain === 'OHV' && val === '4') return; // Prevent if OHV
      this.scene.config.valves = parseInt(val);
      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });

    setupButtonGroup('dev_valvetrain', (val) => {
      this.scene.config.valvetrain = val;
      
      // Force 2 valves if switching to OHV and currently on 4 valves
      if (val === 'OHV' && this.scene.config.valves === 4) {
        this.scene.config.valves = 2;
        const btns = document.querySelectorAll('#dev_valves button');
        btns.forEach(b => b.classList.remove('active'));
        const btn2V = document.querySelector('#dev_valves button[data-val="2"]');
        if (btn2V) btn2V.classList.add('active');
      }
      
      updateValveButtonsState();
    document.addEventListener('sync_dev_ui', (e: any) => {
      const c = e.detail;
      // Sync sliders if elements exist
      const devBore = document.getElementById('dev_bore');
      if (devBore) { (devBore as any).value = c.boreMm; const v = document.getElementById('dev_bore_val'); if(v) v.innerText = c.boreMm.toFixed(1) + " mm"; }
      
      const devStroke = document.getElementById('dev_stroke_len');
      if (devStroke) { (devStroke as any).value = c.strokeMm; const v = document.getElementById('dev_stroke_len_val'); if(v) v.innerText = c.strokeMm.toFixed(1) + " mm"; }
      
      const devAngle = document.getElementById('dev_angle');
      if (devAngle) { (devAngle as any).value = c.vAngle; const v = document.getElementById('dev_angle_val'); if(v) v.innerText = c.vAngle; }
      
      this.updateEngineStats();
    });

      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });

    const updateAspirationPill = () => {
      const pill = document.getElementById('status_aspiration');
      if (pill) {
        if (this.scene.config.intakeType === 'sport') {
          pill.innerText = "Sport (Stożek)";
          pill.style.background = "rgba(239, 68, 68, 0.2)";
          pill.style.color = "#f87171";
        } else {
          pill.innerText = "Cywilny (Airbox)";
          pill.style.background = "rgba(59, 130, 246, 0.2)";
          pill.style.color = "#60a5fa";
        }
      }
    };

    setupButtonGroup('dev_intake', (val) => {
      this.scene.config.intakeType = val;
      updateAspirationPill();
      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });
    
    // Initialize defaults from DOM (Sport by default)
    this.scene.config.intakeType = (document.querySelector("#dev_intake .active") as any)?.dataset.val || 'sport';
    updateAspirationPill();

    // Initialize button state on load
    updateValveButtonsState();

    setupButtonGroup('dev_stroke', (val) => {
      this.scene.config.stroke = parseInt(val);
      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });

    setupButtonGroup('dev_placement', (val) => {
      this.scene.config.placement = val;
      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });

    setupButtonGroup('dev_orientation', (val) => {
      this.scene.config.orientation = val;
      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });

    setupButtonGroup('dev_drivetrain_layout', (val) => {
      this.scene.config.drivetrainLayout = val;
      this.updateEngineStats();
      this.scene.rebuildFullCar();
    });

    const devTilt = document.getElementById('dev_tilt');
    if (devTilt) {
      devTilt.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_tilt_val');
        if (valEl) valEl.innerText = (e.target as any).value;
        this.scene.config.tiltAngle = parseInt((e.target as any).value);
        this.scene.rebuildFullCar();
      });
    }

    const updateDatumVisibility = (isChecked) => {
      this.scene.config.showDatum = isChecked;
      if (this.scene.datumGroup) this.scene.datumGroup.visible = this.scene.config.showDatum;
      const chk1 = document.getElementById('toggle_datum');
      const chk2 = document.getElementById('dev-toggle-datum');
      if (chk1) (chk1 as any).checked = isChecked;
      if (chk2) (chk2 as any).checked = isChecked;
    };

    const toggleDatum = document.getElementById('toggle_datum');
    if (toggleDatum) {
      (toggleDatum as any).checked = false;
      toggleDatum.addEventListener('change', (e) => {
        updateDatumVisibility((e.target as any).checked);
      });
    }

    const devToggleDatum = document.getElementById('dev-toggle-datum');
    if (devToggleDatum) {
      (devToggleDatum as any).checked = false;
      devToggleDatum.addEventListener('change', (e) => {
        updateDatumVisibility((e.target as any).checked);
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
        if (valEl) valEl.innerText = (e.target as any).value;
        this.scene.config.rpm = parseInt((e.target as any).value);
        this.updateEngineStats();
      });
    }
    
    const devClutchEngaged = document.getElementById('dev_clutch_engaged');
    if (devClutchEngaged) {
      devClutchEngaged.addEventListener('change', (e) => {
        this.scene.config.clutchEngaged = (e.target as any).checked;
        this.updateEngineStats();
      });
    }

    const devFinalDrive = document.getElementById('dev_final_drive');
    if (devFinalDrive) {
      devFinalDrive.addEventListener('input', (e) => {
        const valEl = document.getElementById('dev_final_drive_val');
        if (valEl) valEl.innerText = parseFloat((e.target as any).value).toFixed(2);
        this.scene.config.finalDrive = parseFloat((e.target as any).value);
        this.updateEngineStats();
      });
    }

    // ═══ PRESETY SKRZYNI BIEGÓW ═══
    const presetBtns = document.querySelectorAll('#dev_gearbox_preset_manual button, #dev_gearbox_preset_auto button');
    presetBtns.forEach((btn: any) => {
      btn.addEventListener('click', (e: any) => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.getAttribute('data-val');
      this.scene.config.gearboxPreset = val;
      const customContainer = document.getElementById('custom_gearbox_container');
      const descEl = document.getElementById('dev_gearbox_desc');
      const btnG6 = document.getElementById('btn_gear_6');
      const btnGD = document.getElementById('btn_gear_d');
      const cvtContainer = document.getElementById('dev_cvt_ratio_container');
      const finalDriveSlider = document.getElementById('dev_final_drive');
      const finalDriveVal = document.getElementById('dev_final_drive_val');
      const isCvt = val === 'cvt_multitronic';
      
      const lang = this.scene.lang || 'pl';
      const t = i18n[lang] || i18n.pl;

      // Handle Gears UI
      const gearButtons = document.querySelectorAll('#dev_gearbox button');
      gearButtons.forEach((btn: any) => {
        const gear = btn.getAttribute('data-gear');
        if (isCvt) {
          // CVT mode: Hide 1-6, Show D, N, R
          if (['1','2','3','4','5','6'].includes(gear)) btn.style.display = 'none';
          if (['D','N','R'].includes(gear)) btn.style.display = 'inline-block';
        } else {
          // Manual mode: Show 1-5, N, R, maybe 6
          if (['D'].includes(gear)) btn.style.display = 'none';
          if (['1','2','3','4','5','N','R'].includes(gear)) btn.style.display = 'inline-block';
        }
      });

      if (cvtContainer) cvtContainer.style.display = isCvt ? 'block' : 'none';

      // Switch to N if invalid gear is selected
      if (isCvt && ['1','2','3','4','5','6'].includes(this.scene.config.currentGear)) {
        this.scene.config.currentGear = 'N';
        gearButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('#dev_gearbox button[data-gear="N"]')?.classList.add('active');
      } else if (!isCvt && this.scene.config.currentGear === 'D') {
        this.scene.config.currentGear = '1';
        gearButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('#dev_gearbox button[data-gear="1"]')?.classList.add('active');
      }

      if (val === 'custom') {
        if (customContainer) customContainer.style.display = 'block';
        if (descEl) descEl.innerHTML = t.ui.customGearboxDesc;
        if (btnG6) btnG6.style.display = 'inline-block';
      } else {
        if (customContainer) customContainer.style.display = 'none';
        const preset = GEARBOX_PRESETS[val] || GEARBOX_PRESETS.opel_f17;
        const gDict = (t.gearboxPresets && t.gearboxPresets[val]) ? t.gearboxPresets[val] : null;
        if (descEl) descEl.innerText = gDict ? gDict.desc : preset.desc;
        if (!isCvt && btnG6) btnG6.style.display = (preset.speeds === 6) ? 'inline-block' : 'none';
        if (preset.speeds === 5 && this.scene.config.currentGear === '6') {
          this.scene.config.currentGear = '5';
          gearButtons.forEach(b => b.classList.remove('active'));
          document.querySelector('#dev_gearbox button[data-gear="5"]')?.classList.add('active');
        }
        this.scene.config.finalDrive = preset.finalDrive;
        if (finalDriveSlider) (finalDriveSlider as any).value = preset.finalDrive;
        if (finalDriveVal) finalDriveVal.innerText = preset.finalDrive.toFixed(2);
      }
      
      this.updateEngineStats();
      this.scene.rebuildFullCar(); // <-- KEY FIX! Rebuilds 3D when switching presets!
      });
    });

    // ═══ SUWAKI WŁASNYCH PRZEŁOŻEŃ (Custom Gearbox) ═══
    ['1', '2', '3', '4', '5', '6', 'r'].forEach(gKey => {
      const slider = document.getElementById(`slider_g${gKey}`);
      const valEl = document.getElementById(`val_g${gKey}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const ratioVal = parseFloat((e.target as any).value);
          const actualKey = gKey === 'r' ? 'R' : gKey;
          const finalVal = gKey === 'r' ? -ratioVal : ratioVal;
          this.scene.config.gearboxCustomRatios[actualKey] = finalVal;
          if (valEl) valEl.innerText = (gKey === 'r' ? '-' : '') + ratioVal.toFixed(2);
          this.updateEngineStats();
        });
      }
    });

    const cvtSlider = document.getElementById('slider_cvt_ratio');
    const cvtVal = document.getElementById('val_cvt_ratio');
    if (cvtSlider) {
      cvtSlider.addEventListener('input', (e) => {
        const ratio = parseFloat((e.target as any).value);
        if (cvtVal) cvtVal.innerText = ratio.toFixed(2);
        this.scene.config.cvtRatio = ratio; // Przechowujemy własną zmienną dla CVT
        this.updateEngineStats();
      });
    }

    // ═══ WYBÓR AKTUALNEGO BIEGU (R, N, 1..6) ═══
    setupButtonGroup('dev_gearbox', (val) => {
      this.scene.config.currentGear = val;
      this.updateEngineStats();
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
        this.scene.config.showWireframes = (e.target as any).checked;
        this.updateWireframeVisibility();
      });
    }

    const chkHover = document.getElementById('toggle_hover');
    if (chkHover) {
      chkHover.addEventListener('change', (e) => {
        this.scene.config.enableHover = (e.target as any).checked;
        if (!this.scene.config.enableHover && this.scene.hoveredPart) {
           this.scene.hoveredPart.material.emissive.setHex(0x000000);
           this.scene.hoveredPart = null;
        }
      });
    }

    const chkChassis = document.getElementById('toggle_chassis');
    if (chkChassis) {
      (chkChassis as any).checked = this.scene.config.showChassis || false;
      chkChassis.addEventListener('change', (e) => {
        this.scene.config.showChassis = (e.target as any).checked;
        this.scene.rebuildFullCar();
      });
    }
  }

getCurrentGearRatio() {
    const currentG = this.scene.config.currentGear || '1';
    if (currentG === 'N') return 0;
    
    if (this.scene.config.gearboxPreset === 'cvt_multitronic') {
      if (currentG === 'D') return this.scene.config.cvtRatio !== undefined ? this.scene.config.cvtRatio : 2.60;
      if (currentG === 'R') return -2.40; // Stałe przełożenie wsteczne dla CVT
      // Fallback jeśli przełączymy z manuala:
      return this.scene.config.cvtRatio !== undefined ? this.scene.config.cvtRatio : 2.60;
    }

    if (this.scene.config.gearboxPreset === 'custom') {
      return this.scene.config.gearboxCustomRatios[currentG] !== undefined ? this.scene.config.gearboxCustomRatios[currentG] : 1.0;
    }
    const preset = GEARBOX_PRESETS[this.scene.config.gearboxPreset] || GEARBOX_PRESETS.opel_f17;
    return preset.ratios[currentG] !== undefined ? preset.ratios[currentG] : 1.0;
  }

updateCrankshaftUI() {
    this.updateV8UI();
    this.updatePresetCard();
    this.updateBalanceUI();
    this.updateStatusPills();
    this.updateEngineStats();

    if (this.scene.radialUI && !this.scene.config.customOverride && this.scene.movingCylinders && this.scene.movingCylinders.length > 0) {
      const angles = this.scene.movingCylinders.map(c => Math.round(((c.crankPinAngle * 180 / Math.PI) % 360 + 360) % 360));
      this.scene.radialUI.setCylinderCount(this.scene.config.cylinders, angles);
    }
  }

updateV8UI() {
    const v8Container = document.getElementById('dev_v8_crank_container');
    const noteEl = document.getElementById('v8_crank_note');
    if (v8Container) {
      const isV8 = (this.scene.config.layout === 'V' && this.scene.config.cylinders === 8);
      v8Container.style.display = isV8 ? 'block' : 'none';
      if (isV8 && noteEl) {
        const lang = this.scene.lang || 'pl';
        const t = i18n[lang] || i18n.pl;
        if (this.scene.config.v8CrankType === 'crossplane') {
          noteEl.innerHTML = t.ui.v8CrossplaneNote;
        } else {
          noteEl.innerHTML = t.ui.v8FlatplaneNote;
        }
      }
    }
  }

updatePresetCard() {
    const card = document.getElementById('crank_preset_card');
    const nameEl = document.getElementById('crank_preset_name');
    const descEl = document.getElementById('crank_preset_desc');
    const techEl = document.getElementById('crank_preset_tech');
    const badgeEl = document.getElementById('crank_preset_badge');

    if (!card) return;

    const lang = this.scene.lang || 'pl';
    const t = i18n[lang] || i18n.pl;

    const key = (this.scene.config.layout === 'V' && this.scene.config.cylinders === 8)
      ? `V_8_${this.scene.config.v8CrankType || 'crossplane'}`
      : `${this.scene.config.layout}_${this.scene.config.cylinders}`;

    const preset = (t.crankPresets && t.crankPresets[key]) ? t.crankPresets[key] : CRANK_PRESETS[key];
    if (preset) {
      if (nameEl) nameEl.innerText = preset.name;
      if (descEl) descEl.innerText = preset.description;
      if (techEl) techEl.innerText = preset.technicalNote;
      if (badgeEl) {
        badgeEl.innerText = t.ui.crankEngineeredBadge;
        badgeEl.className = 'crank-badge engineered';
      }
    } else {
      const cycle = this.scene.config.stroke === 2 ? 360 : 720;
      const dGamma = (cycle / this.scene.config.cylinders).toFixed(1);
      const fb = t.crankPresets?.fallbackTemplate || i18n.pl.crankPresets.fallbackTemplate;
      if (nameEl) nameEl.innerText = fb.name.replace('{layout}', this.scene.config.layout).replace('{cylinders}', this.scene.config.cylinders);
      if (descEl) descEl.innerText = fb.desc.replace('{dGamma}', dGamma);
      if (techEl) techEl.innerText = fb.tech.replace('{dGamma}', dGamma);
      if (badgeEl) {
        badgeEl.innerText = t.ui.crankFallbackBadge;
        badgeEl.className = 'crank-badge fallback';
      }
    }
  }

updateBalanceUI() {
    const box = document.getElementById('crank_diagnostics_box');
    const icon = document.getElementById('diag_status_icon');
    const title = document.getElementById('diag_title');
    const msg = document.getElementById('diag_message');
    const rec = document.getElementById('diag_rec');

    if (!this.scene.currentBalanceReport || !box) return;
    const report = this.scene.currentBalanceReport;
    const lang = this.scene.lang || 'pl';
    const t = i18n[lang] || i18n.pl;
    const br = t.balanceReports || i18n.pl.balanceReports;

    box.className = `crank-diag-box ${report.status}`;
    if (icon) {
      if (report.status === 'perfect') icon.innerText = '✓';
      else if (report.status === 'warning-secondary') icon.innerText = '!';
      else if (report.status === 'warning-moment') icon.innerText = '~';
      else icon.innerText = '✕';
    }

    let reportTitle = (report as any).title;
    let reportMsg = report.message;
    let reportRec = report.recommendation;

    if (report.status === 'perfect' && br.perfect) {
      reportTitle = (br.perfect as any).title;
      reportMsg = br.perfect.message;
      reportRec = br.perfect.recommendation;
    } else if (report.status === 'warning-secondary' && br.warningSecondary) {
      reportTitle = (br.warningSecondary as any).title;
      const pct = (report.metrics?.f2Score ? report.metrics.f2Score * 100 : 0).toFixed(1);
      reportMsg = br.warningSecondary.messageTemplate.replace('{percent}', pct);
      reportRec = br.warningSecondary.recommendation;
    } else if (report.status === 'warning-moment' && br.warningMoment) {
      reportTitle = (br.warningMoment as any).title;
      reportMsg = br.warningMoment.message;
      reportRec = br.warningMoment.recommendation;
    } else if (report.status === 'error-primary' && br.errorPrimary) {
      reportTitle = (br.errorPrimary as any).title;
      const pct = (report.metrics?.f1Score ? report.metrics.f1Score * 100 : 0).toFixed(1);
      reportMsg = br.errorPrimary.messageTemplate.replace('{percent}', pct);
      reportRec = br.errorPrimary.recommendation;
    } else if (br.balanced) {
      reportTitle = (br.balanced as any).title;
      reportMsg = br.balanced.message;
      reportRec = br.balanced.recommendation;
    }

    if (title) title.innerText = reportTitle;
    if (msg) msg.innerText = reportMsg;
    if (rec) rec.innerText = reportRec;

    const qsCrankF1 = document.getElementById('qs_crank_f1');
    const qsCrankStatus = document.getElementById('qs_crank_status');
    if (qsCrankF1 && report.metrics) {
      const f1Pct = Math.max(0, Math.min(100, Math.round((1.0 - (report.metrics.f1Score || 0)) * 100)));
      qsCrankF1.innerText = `${f1Pct}%`;
      qsCrankF1.style.color = f1Pct > 90 ? 'var(--accent-green)' : (f1Pct > 60 ? 'var(--accent-amber)' : 'var(--accent-red)');
    }
    if (qsCrankStatus) {
      if (report.status === 'perfect') {
        qsCrankStatus.innerText = lang === 'pl' ? 'Perfekcyjna' : 'Perfect';
        qsCrankStatus.style.color = 'var(--accent-cyan)';
      } else if (report.status === 'warning-secondary') {
        qsCrankStatus.innerText = lang === 'pl' ? 'Siły II rzędu' : '2nd Order';
        qsCrankStatus.style.color = 'var(--accent-amber)';
      } else if (report.status === 'warning-moment') {
        qsCrankStatus.innerText = lang === 'pl' ? 'Momenty' : 'Moments';
        qsCrankStatus.style.color = 'var(--accent-amber)';
      } else {
        qsCrankStatus.innerText = lang === 'pl' ? 'Niewyważony' : 'Unbalanced';
        qsCrankStatus.style.color = 'var(--accent-red)';
      }
    }
  }

updateStatusPills() {
    const lang = this.scene.lang || 'pl';
    const t = i18n[lang] || i18n.pl;

    // 1. Engine status pill
    const pEngine = document.getElementById('status_engine');
    if (pEngine) {
      const layoutShort = (this.scene.config.layout === 'Inline') ? (lang === 'pl' ? 'R' : 'I') : (this.scene.config.layout === 'Boxer' ? 'B' : this.scene.config.layout);
      const bore = this.scene.config.boreMm || 84.0;
      const stroke = this.scene.config.strokeMm || 90.0;
      const cyls = this.scene.config.cylinders || 4;
      const dispCm3 = cyls * Math.PI * Math.pow(bore / 20, 2) * (stroke / 10);
      const dispL = (dispCm3 / 1000).toFixed(1);
      pEngine.innerText = `${layoutShort}${cyls} • ${dispL}L`;
    }

    // 2. Crank status pill
    const pCrank = document.getElementById('status_crank');
    if (pCrank) {
      if (this.scene.config.customOverride) {
        pCrank.innerText = 'Custom 360°';
      } else {
        const key = (this.scene.config.layout === 'V' && this.scene.config.cylinders === 8)
          ? `V_8_${this.scene.config.v8CrankType || 'crossplane'}`
          : `${this.scene.config.layout}_${this.scene.config.cylinders}`;
        const preset = (t.crankPresets && t.crankPresets[key]) ? t.crankPresets[key] : CRANK_PRESETS[key];
        if (preset) {
          pCrank.innerText = preset.name.replace(/^(R\d+|I\d+|V\d+|B\d+|VR\d+|W\d+)\s+/, '');
        } else {
          pCrank.innerText = `${this.scene.config.cylinders}-cyl`;
        }
      }
    }

    // 3. Drivetrain status pill
    const pDrive = document.getElementById('status_drivetrain');
    if (pDrive) {
      const g = this.scene.config.currentGear || '1';
      const rpm = this.scene.config.rpm || 1000;
      pDrive.innerText = `${g} • ${rpm} RPM`;
    }

    // 4. Physics status pill
    const pPhys = document.getElementById('status_physics');
    if (pPhys && this.scene.currentBalanceReport) {
      pPhys.innerText = this.scene.currentBalanceReport.status === 'perfect' ? t.ui.balanceOkPill : t.ui.balanceVibPill;
    }

    // 5. View status pill
    const pView = document.getElementById('status_view');
    if (pView) {
      pView.innerText = this.scene.isCutaway ? t.ui.viewStatusCutaway : t.ui.viewStatusStudio;
    }
  }

updateWireframeVisibility() {
    const v = this.scene.config.showWireframes;
    if (this.scene.movingCylinders) {
        this.scene.movingCylinders.forEach(c => {
            if (c.sleeve) c.sleeve.visible = v;
            if (c.head) c.head.visible = v;
        });
    }
    // Wyszukaj miskę olejową po nazwie
    if (this.scene.engineGroup) {
      this.scene.engineGroup.children.forEach(child => {
          if (child.userData.name === "Miska olejowa (Zarys)") {
              child.visible = v;
          }
      });
    }
  }

setupTooltip() {
    this.scene.raycaster = new THREE.Raycaster();
    this.scene.raycaster.params.Line.threshold = 0.005;
    this.scene.raycaster.params.Points.threshold = 0.005;
    this.scene.mouse = new THREE.Vector2(-9999, -9999);
    this.scene.tooltip = document.createElement('div');
    this.scene.tooltip.style.position = 'fixed';
    this.scene.tooltip.style.background = 'rgba(20, 20, 25, 0.94)';
    this.scene.tooltip.style.color = '#ffffff';
    this.scene.tooltip.style.padding = '6px 12px';
    this.scene.tooltip.style.borderRadius = '8px';
    this.scene.tooltip.style.border = '1px solid rgba(255, 255, 255, 0.14)';
    this.scene.tooltip.style.pointerEvents = 'none';
    this.scene.tooltip.style.display = 'none';
    this.scene.tooltip.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
    this.scene.tooltip.style.fontSize = '11.5px';
    this.scene.tooltip.style.letterSpacing = '-0.01em';
    this.scene.tooltip.style.zIndex = '90';
    this.scene.tooltip.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
    this.scene.tooltip.style.fontWeight = '600';
    this.scene.tooltip.style.whiteSpace = 'nowrap';
    document.body.appendChild(this.scene.tooltip);

    window.addEventListener('mousemove', (e) => {
      // Jeśli kursor znajduje się nad elementami interfejsu (sidebar, HUD, drawer, przyciski), ukryj tooltip
      const target = e.target;
      if (
        target &&
        (target as any).closest &&
        (target as any).closest('.sidebar-left, .bottom-hud, .info-drawer, .dev-drawer, .dev-mode-toggle, button, input, select, textarea')
      ) {
        this.scene.mouse.set(-9999, -9999);
        this.scene.tooltip.style.display = 'none';
        return;
      }

      this.scene.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.scene.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      let left = e.clientX + 16;
      let top = e.clientY + 16;
      if (left + 220 > window.innerWidth) left = e.clientX - 230;
      if (top + 40 > window.innerHeight) top = e.clientY - 40;
      this.scene.tooltip.style.left = `${left}px`;
      this.scene.tooltip.style.top = `${top}px`;
      this.updateTooltip();
    });

    window.addEventListener('mouseleave', () => {
      this.scene.mouse.set(-9999, -9999);
      if (this.scene.tooltip) this.scene.tooltip.style.display = 'none';
    });

    this.scene.isRaycasting = false;
  }

updateTooltip() {
    if (!this.scene.raycaster || !this.scene.scene || !this.scene.camera || this.scene.isRaycasting) return;
    this.scene.isRaycasting = true;
    requestAnimationFrame(() => {
      this.scene.raycaster.setFromCamera(this.scene.mouse, this.scene.camera);
      const intersects = this.scene.raycaster.intersectObjects(this.scene.scene.children, true);
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
        this.scene.tooltip.innerHTML = `<span style="color: #86868b; font-size: 9.5px; text-transform: uppercase; margin-right: 6px; font-weight: 500;">ELEMENT</span><span>${foundName}</span>`;
        this.scene.tooltip.style.display = 'block';
      } else {
        this.scene.tooltip.style.display = 'none';
      }
      this.scene.isRaycasting = false;
    });
  }

/**
 * Kompleksowe obliczanie statystyk, osiągów i parametrów inżynieryjnych w czasie rzeczywistym
 */
updateEngineStats() {
  const lang = this.scene.lang || 'pl';
  const t = i18n[lang] || i18n.pl;

  const bore = this.scene.config.boreMm || 84.0;
  const stroke = this.scene.config.strokeMm || 90.0;
  const cyls = this.scene.config.cylinders || 4;
  const layout = this.scene.config.layout || 'Inline';
  const cycle = this.scene.config.stroke || 4;
  const valves = this.scene.config.valves || 4;
  const valvetrain = this.scene.config.valvetrain || 'OHC';
  const intake = this.scene.config.intakeType || 'sport';
  const aspiration = this.scene.config.aspiration || 'na';
  const rpm = this.scene.config.rpm || 1000;
  const exhaustPipes = this.scene.config.exhaustPipes || 'single';
  const drivetrain = this.scene.config.drivetrainLayout || 'RWD';

  // 1. Geometria i pojemność
  const dispCm3 = cyls * Math.PI * Math.pow(bore / 20, 2) * (stroke / 10);
  const dispL = (dispCm3 / 1000).toFixed(1);
  const dispRounded = Math.round(dispCm3);
  const unitDispCm3 = (dispCm3 / cyls).toFixed(1);
  const bsRatio = (bore / stroke);

  // 2. Redline (Maksymalne obroty)
  let baseRedline = 6800;
  baseRedline += (bsRatio - 1.0) * 1200; // Krótkoskokowe silniki kręcą się wyżej
  if (valvetrain === 'OHC') baseRedline += 500;
  else baseRedline -= 700; // OHV
  if (valves === 4) baseRedline += 300;
  if (cycle === 2) baseRedline += 600;
  const redline = Math.min(9500, Math.max(5000, Math.round(baseRedline / 100) * 100));

  // 3. Średnia prędkość tłoka v_mean (m/s)
  const strokeM = stroke / 1000;
  const vMeanRpm = (2 * strokeM * rpm) / 60;
  const vMeanRedline = (2 * strokeM * redline) / 60;

  // Status prędkości tłoka
  let speedStatusText = t.ui.speedSafe;
  let speedColor = "var(--accent-green)";
  if (vMeanRpm >= 20.0) {
    speedStatusText = t.ui.speedExtreme;
    speedColor = "var(--accent-red)";
  } else if (vMeanRpm >= 15.0) {
    speedStatusText = t.ui.speedModerate;
    speedColor = "var(--accent-amber)";
  }
  const speedBarPct = Math.min(100, Math.max(2, (vMeanRpm / 25) * 100));

  // 4. Przyspieszenie tłoka a_max (m/s^2 i g)
  const omega = (2 * Math.PI * rpm) / 60;
  const crankRadiusM = strokeM / 2;
  const lambda = 1 / 3.2; // Stosunek r do długości korbowodu L (~1.6x stroke)
  const aMax = crankRadiusM * Math.pow(omega, 2) * (1 + lambda);
  const aMaxG = (aMax / 9.81).toFixed(1);

  // 5. Ciśnienie użyteczne (BMEP) i Moc / Moment
  let bmepBar = 11.2;
  if (intake === 'sport') bmepBar += 0.4;
  if (valves === 4) bmepBar += 1.2;
  if (valvetrain === 'OHC') bmepBar += 0.6;
  if (cycle === 2) bmepBar *= 0.85; // 2-suwy mają nieco niższy BMEP przez płukanie

  // Moment obrotowy Nm (realistyczny standard wolnossący OEM: 92 - 100 Nm / litr)
  let baseTorquePerL = 96; // Nm na litr dla seryjnego silnika
  if (intake === 'sport') baseTorquePerL *= 1.02;
  if (valves === 4) baseTorquePerL *= 1.06;
  if (valvetrain === 'OHV') baseTorquePerL *= 1.03;
  if (cycle === 2) baseTorquePerL *= 1.30;
  const maxTorque = Math.round((dispCm3 / 1000) * baseTorquePerL);

  // Obroty momentu i mocy
  const powerRpm = Math.round(redline * (valvetrain === 'OHC' ? 0.85 : 0.78) / 100) * 100;
  const torqueRpm = Math.round(powerRpm * 0.65 / 100) * 100;

  // Moc szacunkowa KM (Realistyczne OEM: ~72-78 KM / litr dla 4V OHC, ~58-62 KM / litr dla 2V)
  let flowEfficiency = (valves === 4 ? 1.0 : 0.84) * (valvetrain === 'OHC' ? 1.0 : 0.90) * (intake === 'sport' ? 1.02 : 1.0);
  if (cycle === 2) flowEfficiency *= 1.25;
  const maxPowerHp = Math.round(((maxTorque * powerRpm) / 7120) * flowEfficiency);
  const maxPowerKw = Math.round(maxPowerHp * 0.7355);
  const powerPerLiter = ((maxPowerHp / (dispCm3 / 1000))).toFixed(1);

  // 6. Masa zespołu (kg)
  let baseWeight = 22 + cyls * 16;
  if (valvetrain === 'OHC') baseWeight += 10;
  if (valves === 4) baseWeight += 6;
  if (exhaustPipes === 'dual') baseWeight += 8;
  if (drivetrain === 'RWD') baseWeight += 45;
  else if (drivetrain === 'FWD') baseWeight += 25;
  else if (drivetrain === 'AWD') baseWeight += 75;
  else if (drivetrain === '4x4') baseWeight += 90;
  const totalWeight = Math.round(baseWeight);
  const ptwRatio = (maxPowerHp / totalWeight).toFixed(2);
  const ptwTon = Math.round((maxPowerHp / totalWeight) * 1000);

  // 7. Aktualizacja DOM w trybie Statystyki
  const elPowerVal = document.getElementById('stat_power_val');
  if (elPowerVal) elPowerVal.innerText = `${maxPowerHp} KM`;
  const elPowerKw = document.getElementById('stat_power_kw');
  if (elPowerKw) elPowerKw.innerText = `${maxPowerKw} kW @ ${powerRpm} RPM`;

  const elTorqueVal = document.getElementById('stat_torque_val');
  if (elTorqueVal) elTorqueVal.innerText = `${maxTorque} Nm`;
  const elTorqueRpm = document.getElementById('stat_torque_rpm');
  if (elTorqueRpm) elTorqueRpm.innerText = `@ ${torqueRpm} RPM`;

  const elPpl = document.getElementById('stat_power_per_liter');
  if (elPpl) elPpl.innerText = `${powerPerLiter} KM/L`;

  const elRedline = document.getElementById('stat_redline_val');
  if (elRedline) elRedline.innerText = `${redline} RPM`;
  const elCycleLabel = document.getElementById('stat_cycle_label');
  if (elCycleLabel) elCycleLabel.innerText = cycle === 2 ? (lang === 'pl' ? 'Cykl 2-suwowy' : '2-Stroke Cycle') : (lang === 'pl' ? 'Cykl 4-suwowy (Otto)' : '4-Stroke (Otto)');

  const elWeightVal = document.getElementById('stat_weight_val');
  if (elWeightVal) elWeightVal.innerText = `${totalWeight} kg`;

  const elPtwVal = document.getElementById('stat_ptw_val');
  if (elPtwVal) elPtwVal.innerText = `${ptwRatio} KM/kg`;
  const elPtwTon = document.getElementById('stat_ptw_ton');
  if (elPtwTon) elPtwTon.innerText = `${ptwTon} KM / tonę`;

  // Baner w nagłówku statystyk
  const elEnginePill = document.getElementById('stats_engine_pill');
  if (elEnginePill) {
    const layoutShort = (layout === 'Inline') ? (lang === 'pl' ? 'R' : 'I') : (layout === 'Boxer' ? 'B' : layout);
    elEnginePill.innerText = `${layoutShort}${cyls} • ${dispL}L ${valvetrain} (${valves}V)`;
  }
  const elAspPill = document.getElementById('stats_aspiration_pill');
  if (elAspPill) {
    const aspName = aspiration === 'na' ? 'N/A' : aspiration.toUpperCase();
    const intName = intake === 'sport' ? 'Sport Cone' : 'Airbox';
    elAspPill.innerText = `${aspName} • ${intName}`;
  }

  // Geometria
  const elDispFull = document.getElementById('stat_disp_full');
  if (elDispFull) elDispFull.innerText = `${dispRounded} cm³ (${dispL}L)`;
  const elUnitDisp = document.getElementById('stat_unit_disp');
  if (elUnitDisp) elUnitDisp.innerText = `${unitDispCm3} cm³ / cyl`;
  const elBoreStroke = document.getElementById('stat_bore_stroke');
  if (elBoreStroke) elBoreStroke.innerText = `${bore.toFixed(1)} × ${stroke.toFixed(1)} mm`;

  const elBsVal = document.getElementById('stat_bs_val');
  if (elBsVal) elBsVal.innerText = bsRatio.toFixed(2);
  const elBsDesc = document.getElementById('stat_bs_desc');
  if (elBsDesc) {
    if (bsRatio > 1.05) elBsDesc.innerText = t.ui.bsOversquare;
    else if (bsRatio < 0.95) elBsDesc.innerText = t.ui.bsUndersquare;
    else elBsDesc.innerText = t.ui.bsSquare;
  }

  // Piston speed
  const elPistonSpeedVal = document.getElementById('stat_piston_speed_val');
  if (elPistonSpeedVal) elPistonSpeedVal.innerText = `${vMeanRpm.toFixed(1)} m/s`;
  const elPistonSpeedBar = document.getElementById('stat_piston_speed_bar');
  if (elPistonSpeedBar) elPistonSpeedBar.style.width = `${speedBarPct}%`;
  const elPistonSpeedStatus = document.getElementById('stat_piston_speed_status');
  if (elPistonSpeedStatus) {
    elPistonSpeedStatus.innerText = speedStatusText;
    elPistonSpeedStatus.style.color = speedColor;
  }
  const elRedlineSpeed = document.getElementById('stat_piston_speed_redline_label');
  if (elRedlineSpeed) elRedlineSpeed.innerText = `@ Redline: ${vMeanRedline.toFixed(1)} m/s`;

  // Szybkie statystyki podzakładek (Quick Stats Strips)
  const qsEngDisp = document.getElementById('qs_engine_disp');
  if (qsEngDisp) qsEngDisp.innerText = `${dispL}L (${dispRounded} cm³)`;
  const qsEngBoreStroke = document.getElementById('qs_engine_bore_stroke');
  if (qsEngBoreStroke) qsEngBoreStroke.innerText = `${bore.toFixed(1)} × ${stroke.toFixed(1)} mm`;
  const qsEngBs = document.getElementById('qs_engine_bs');
  if (qsEngBs) qsEngBs.innerText = `${bsRatio.toFixed(2)}`;
  const qsEngPspeed = document.getElementById('qs_engine_pspeed');
  if (qsEngPspeed) qsEngPspeed.innerText = `${vMeanRpm.toFixed(1)} m/s`;

  const qsAspIntake = document.getElementById('qs_asp_intake');
  if (qsAspIntake) qsAspIntake.innerText = intake === 'sport' ? (lang === 'pl' ? 'Sport Stożek' : 'Sport Cone') : (lang === 'pl' ? 'Cywilny Airbox' : 'Civil Airbox');
  const qsAspValves = document.getElementById('qs_asp_valves');
  if (qsAspValves) qsAspValves.innerText = `${valves}V ${valvetrain}`;
  const qsAspWeight = document.getElementById('qs_asp_weight');
  if (qsAspWeight) qsAspWeight.innerText = `${totalWeight} kg`;

  // Wał korbowy quick stats
  const qsCrankOrder = document.getElementById('qs_crank_order');
  const qsCrankF1 = document.getElementById('qs_crank_f1');
  const qsCrankStatus = document.getElementById('qs_crank_status');
  if (qsCrankOrder) {
    const key = (layout === 'V' && cyls === 8) ? `V_8_${this.scene.config.v8CrankType || 'crossplane'}` : `${layout}_${cyls}`;
    const preset = CRANK_PRESETS[key];
    qsCrankOrder.innerText = preset ? (preset.firingOrder ? preset.firingOrder.join('-') : `${cyls} cyl`) : `${cyls} cyl`;
  }
  if (qsCrankF1) {
    qsCrankF1.innerText = "100% OK";
  }
  if (qsCrankStatus) {
    const diagBox = document.getElementById('crank_diagnostics_box');
    if (diagBox && diagBox.classList.contains('warning')) {
      qsCrankStatus.innerText = lang === 'pl' ? 'Wibracje II' : 'Vibrations';
      qsCrankStatus.style.color = 'var(--accent-amber)';
    } else {
      qsCrankStatus.innerText = lang === 'pl' ? 'Perfekcyjna' : 'Balanced';
      qsCrankStatus.style.color = 'var(--accent-cyan)';
    }
  }

  // Napęd quick stats
  const qsDriveSpeed = document.getElementById('qs_drive_speed');
  const qsDriveRed = document.getElementById('qs_drive_reduction');
  const qsDriveRedlineSpd = document.getElementById('qs_drive_redline_spd');
  const currentRatio = this.getCurrentGearRatio();
  const absRatio = Math.abs(currentRatio);
  const totalReduction = absRatio > 0 ? (absRatio * (this.scene.config.finalDrive || 3.94)) : 0;
  const tireCircumferenceM = 2 * Math.PI * 0.32;
  const currentSpeed = (totalReduction > 0 && this.scene.config.clutchEngaged) ? Math.round((rpm * tireCircumferenceM * 60) / (totalReduction * 1000)) : 0;
  const redlineSpeed = (totalReduction > 0) ? Math.round((redline * tireCircumferenceM * 60) / (totalReduction * 1000)) : 0;

  if (qsDriveSpeed) qsDriveSpeed.innerText = `${currentSpeed} km/h`;
  if (qsDriveRed) qsDriveRed.innerText = totalReduction > 0 ? `${totalReduction.toFixed(2)}:1` : 'Luz (N)';
  if (qsDriveRedlineSpd) qsDriveRedlineSpd.innerText = totalReduction > 0 ? `${redlineSpeed} km/h` : '---';

  // 8. Tabela Prędkości Biegów
  this.updateGearSpeedTable(redline);
}

/**
 * Tabela prędkości teoretycznych na poszczególnych biegach
 */
updateGearSpeedTable(redline) {
  const tableBody = document.getElementById('gear_matrix_body');
  if (!tableBody) return;

  const currentGear = this.scene.config.currentGear || '1';
  const rpm = this.scene.config.rpm || 1000;
  const red = redline || 6800;
  const finalDrive = this.scene.config.finalDrive || 3.94;
  const tireCircumferenceM = 2 * Math.PI * 0.32; // ~2.011m (promień koła 32cm)

  const thRpm = document.getElementById('th_speed_rpm');
  if (thRpm) thRpm.innerText = `@ ${rpm} RPM`;
  const thRed = document.getElementById('th_speed_redline');
  if (thRed) thRed.innerText = `@ ${red} RPM`;

  // Pobierz przełożenia biegów
  let ratios = {};
  if (this.scene.config.gearboxPreset === 'custom') {
    ratios = this.scene.config.gearboxCustomRatios || {};
  } else {
    const preset = GEARBOX_PRESETS[this.scene.config.gearboxPreset] || GEARBOX_PRESETS.opel_f17;
    ratios = preset.ratios || {};
  }

  const gearKeys = Object.keys(ratios).filter(k => k !== 'N');
  // Sort gears 1..6, then R
  gearKeys.sort((a, b) => {
    if (a === 'R') return 1;
    if (b === 'R') return -1;
    return parseInt(a, 10) - parseInt(b, 10);
  });

  const rowsHtml = gearKeys.map(gKey => {
    const ratio = ratios[gKey];
    if (ratio === 0 || ratio === undefined) return '';
    const absRatio = Math.abs(ratio);
    const totalReduction = absRatio * finalDrive;
    
    // Prędkość km/h = (RPM * C * 60) / (totalReduction * 1000)
    const speedAtRpm = Math.round((rpm * tireCircumferenceM * 60) / (totalReduction * 1000));
    const speedAtRedline = Math.round((red * tireCircumferenceM * 60) / (totalReduction * 1000));
    const isActive = (gKey === currentGear);

    return `
      <tr class="${isActive ? 'active-gear' : ''}">
        <td><b>${gKey}</b></td>
        <td>${ratio.toFixed(2)}</td>
        <td>${speedAtRpm} km/h</td>
        <td>${speedAtRedline} km/h</td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = rowsHtml;
}

}
