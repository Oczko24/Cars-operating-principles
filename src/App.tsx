import React, { useState, useEffect, useRef } from 'react';
import { Canvas3D } from './components/Canvas3D';
import { i18n, detectBrowserLanguage } from './i18n';
import { PARTS_DATA, calculateSpecs } from './parts';
import { setupDevDrawer, setupSettingsModal } from './scene/DebugTools';

export default function App() {
  const [lang, setLang] = useState(() => detectBrowserLanguage());
  const [config, setConfig] = useState({
    block: "block_i4",
    valvetrain: "valve_dohc",
    aspiration: "asp_na",
    drivetrain: "drive_rwd",
    suspension: "susp_wishbone"
  });
  const [activeCategory, setActiveCategory] = useState("block");
  
let cachedUi = {
  fpsBadge: null as HTMLElement | null,
  scrubVal: null as HTMLElement | null,
  scrubSlider: null as HTMLInputElement | null,
  cylContainer: null as HTMLElement | null,
  liveDesc: null as HTMLElement | null,
};

const getCached = (key: keyof typeof cachedUi, id: string) => {
  if (!cachedUi[key]) {
    cachedUi[key] = document.getElementById(id) as any;
  }
  return cachedUi[key];
};

let lastCylindersHtml = "";
let lastPrimaryDesc = "";

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [focusMode, setFocusMode] = useState("all");

  
  const sceneRef = useRef<any>(null);

  const t = i18n[lang as keyof typeof i18n] || i18n.pl;

  const currentPartId = config[activeCategory as keyof typeof config];
  const currentPartData = t.parts?.[currentPartId as keyof typeof t.parts] || i18n.pl.parts?.[currentPartId as keyof typeof i18n.pl.parts];
  const specs = calculateSpecs(config);


  useEffect(() => {
    // We should call setupDevDrawer if we pass a mock app object
    // Or refactor DebugTools later. For now we just mount it.
    setupSettingsModal();
  }, []);

  
  const handlePreset = (preset: string) => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    const newConfig = { ...config };
    if (preset === 'saab') {
      scene.config.layout = 'Inline';
      scene.config.cylinders = 4;
      scene.config.boreMm = 80.5;
      scene.config.strokeMm = 88.2;
      scene.config.placement = 'front';
      scene.config.orientation = 'transverse';
      scene.config.drivetrainLayout = 'FWD';
      scene.config.gearboxPreset = 'opel_f17';
      scene.config.intakeType = 'standard';
    } else if (preset === 'bmw') {
      scene.config.layout = 'Inline';
      scene.config.cylinders = 4;
      scene.config.boreMm = 82.0;
      scene.config.strokeMm = 94.6;
      scene.config.placement = 'front';
      scene.config.orientation = 'longitudinal';
      scene.config.drivetrainLayout = 'RWD';
      scene.config.gearboxPreset = 'zf_8hp';
    } else if (preset === 'corvette') {
      scene.config.layout = 'V';
      scene.config.cylinders = 8;
      scene.config.vAngle = 90;
      scene.config.v8CrankType = 'crossplane';
      scene.config.exhaustPipes = 'dual';
      scene.config.boreMm = 99.0;
      scene.config.strokeMm = 92.0;
      scene.config.placement = 'front';
      scene.config.orientation = 'longitudinal';
      scene.config.drivetrainLayout = 'RWD';
      scene.config.gearboxPreset = 'tremec_t56';
    } else if (preset === 'subaru') {
      scene.config.layout = 'Boxer';
      scene.config.cylinders = 4;
      scene.config.boreMm = 92.0;
      scene.config.strokeMm = 75.0;
      scene.config.exhaustPipes = 'dual';
      scene.config.placement = 'front';
      scene.config.orientation = 'longitudinal';
      scene.config.drivetrainLayout = 'AWD';
      scene.config.gearboxPreset = 'cvt_multitronic';
    }
    if (scene.devUIController) {
        scene.devUIController.updateEngineStats();
    }
    document.dispatchEvent(new CustomEvent('sync_dev_ui', { detail: scene.config }));
    scene.rebuildFullCar();
  };

  
  const handleFocus = (focus: string) => {
    setFocusMode(focus);
    if(sceneRef.current) sceneRef.current.setCameraFocus(focus);
  };
  const handleStroke = (stroke: number) => {
    if(sceneRef.current) sceneRef.current.jumpToStroke(stroke);
  };
  const handleSpeed = (speed: number) => {
    if(sceneRef.current) {
        if(speed === 0) sceneRef.current.isPlaying = false;
        else {
            sceneRef.current.isPlaying = true;
            sceneRef.current.setSpeed(speed);
        }
    }
  };

  const handleFrameStats = (newStats: any) => {
    const fpsBadge = getCached("fpsBadge", "fps-val");
    if (fpsBadge) {
      fpsBadge.textContent = `${newStats.fps} FPS`;
      fpsBadge.style.color = newStats.fps >= 50 ? "#30d158" : newStats.fps >= 30 ? "#ff9f0a" : "#ff453a";
    }

    const scrubVal = getCached("scrubVal", "crank-val");
    if (scrubVal && sceneRef.current?.isPlaying) {
      scrubVal.textContent = `${newStats.crankAngleDeg}°`;
      const scrubSlider = getCached("scrubSlider", "crank-scrub") as HTMLInputElement;
      if (scrubSlider && document.activeElement !== scrubSlider) {
        scrubSlider.value = newStats.crankAngleDeg;
      }
    }

    const cylContainer = getCached("cylContainer", "cylinders-telemetry");
    if (cylContainer && newStats.cylinders && newStats.cylinders.length > 0) {
      const newHtml = newStats.cylinders.map((c: any) => `
        <div class="cyl-card ${c.phaseClass}">
          <div class="cyl-num">CYL #${c.id}</div>
          <div class="cyl-phase">${c.phase}</div>
        </div>
      `).join("");

      if (newHtml !== lastCylindersHtml) {
        cylContainer.innerHTML = newHtml;
        lastCylindersHtml = newHtml;
      }

      const primaryCyl = newStats.cylinders[0];
      const liveDesc = getCached("liveDesc", "live-stroke-desc");
      if (liveDesc && primaryCyl && primaryCyl.desc !== lastPrimaryDesc) {
        const prefix = lang === 'pl' ? 'Cylinder #1:' : 'Cylinder #1:';
        liveDesc.innerHTML = `<strong>${prefix}</strong> ${primaryCyl.desc}`;
        lastPrimaryDesc = primaryCyl.desc;
      }
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas3D 
        config={config} 
        activeCategory={activeCategory} 
        lang={lang} 
        onFrameStats={handleFrameStats} 
        sceneRef={sceneRef} 
      />
      
  
  <div id="focus_modes_bar" style={{ 'position': 'absolute', 'top': '20px', 'left': '50%', 'transform': 'translateX(-50%)', 'display': 'flex', 'gap': '20px', 'zIndex': '100', 'background': 'rgba(0,0,0,0.7)', 'padding': '10px 25px', 'borderRadius': '40px', 'backdropFilter': 'blur(10px)', 'border': '1px solid rgba(255,255,255,0.15)', 'boxShadow': '0 4px 15px rgba(0,0,0,0.5)' }}>
    <button className={`focus-btn ${focusMode === "all" ? "active" : ""}`} data-focus="all" onClick={() => handleFocus("all")} style={{ 'fontSize': '32px', 'background': 'none', 'border': 'none', 'cursor': 'pointer', 'filter': 'grayscale(0%)', 'transition': '0.3s', 'transform': 'scale(1.1)' }} title="Całe auto">🚗</button>
    <button className={`focus-btn ${focusMode === "engine" ? "active" : ""}`} data-focus="engine" onClick={() => handleFocus("engine")} style={{ 'fontSize': '32px', 'background': 'none', 'border': 'none', 'cursor': 'pointer', 'filter': 'grayscale(100%)', 'opacity': '0.6', 'transition': '0.3s' }} title="Silnik">⚙️</button>
    <button className={`focus-btn ${focusMode === "gearbox" ? "active" : ""}`} data-focus="gearbox" onClick={() => handleFocus("gearbox")} style={{ 'fontSize': '32px', 'background': 'none', 'border': 'none', 'cursor': 'pointer', 'filter': 'grayscale(100%)', 'opacity': '0.6', 'transition': '0.3s' }} title="Skrzynia Biegów">🕹️</button>
    <button className={`focus-btn ${focusMode === "drivetrain" ? "active" : ""}`} data-focus="drivetrain" onClick={() => handleFocus("drivetrain")} style={{ 'fontSize': '32px', 'background': 'none', 'border': 'none', 'cursor': 'pointer', 'filter': 'grayscale(100%)', 'opacity': '0.6', 'transition': '0.3s' }} title="Układ Napędowy">🏎️</button>
  </div>


  {/*  LEWY PANEL GŁÓWNY (Apple Pro Minimal Sidebar)  */}
  <aside className="sidebar-left">
    <div className="sidebar-header">
      <div className="brand-pill">
        <span className="brand-dot"></span>
        <span className="brand-title">CARS 3D</span>
        <span className="brand-subtitle">PRO STUDIO</span>
      </div>
      <div style={{ 'display': 'flex', 'alignItems': 'center', 'gap': '6px' }}>
        <button id="lang-toggle-btn" onClick={() => setLang(lang === "pl" ? "en" : "pl")} className="lang-pill" data-i18n-title="ui.langSwitchTitle" title="Zmień język (Polski / English)">
          <span className="lang-opt" data-lang="pl">PL</span>
          <span className="lang-divider">/</span>
          <span className="lang-opt" data-lang="en">EN</span>
        </button>
        <div className="fps-badge" id="fps-val" data-i18n-title="ui.fpsBadgeTitle" title="Wydajność renderowania" >60 FPS</div>
      </div>
    </div>

    {/*  PRESETY (Szybki wybór auta) - Tabela 2x2  */}
    <div style={{ 'padding': '12px 15px 12px 15px', 'background': 'rgba(0,0,0,0.2)', 'borderBottom': '1px solid var(--border-subtle)' }}>
      <div style={{ 'fontSize': '10px', 'color': 'var(--text-secondary)', 'textTransform': 'uppercase', 'fontWeight': '700', 'letterSpacing': '1px', 'marginBottom': '10px' }} data-i18n="ui.quickPresets">Gotowe Presety (Wybierz)</div>
      <div style={{ 'display': 'grid', 'gridTemplateColumns': '1fr 1fr', 'gap': '8px' }}>
        <button className="car-preset-btn" data-preset="saab" onClick={() => handlePreset("saab")} style={{ 'background': 'var(--bg-surface)', 'border': '1px solid var(--border-strong)', 'color': 'var(--text-primary)', 'padding': '8px 10px', 'borderRadius': '8px', 'fontSize': '12px', 'fontWeight': '500', 'cursor': 'pointer', 'transition': '0.2s', 'boxShadow': '0 2px 5px rgba(0,0,0,0.2)' }} onMouseOver={(e) => e.currentTarget.style.borderColor="var(--accent-blue)"} onMouseOut={(e) => e.currentTarget.style.borderColor="var(--border-strong)"}>Saab 9-3 (F17)</button>
        <button className="car-preset-btn" data-preset="bmw" onClick={() => handlePreset("bmw")} style={{ 'background': 'var(--bg-surface)', 'border': '1px solid var(--border-strong)', 'color': 'var(--text-primary)', 'padding': '8px 10px', 'borderRadius': '8px', 'fontSize': '12px', 'fontWeight': '500', 'cursor': 'pointer', 'transition': '0.2s', 'boxShadow': '0 2px 5px rgba(0,0,0,0.2)' }} onMouseOver={(e) => e.currentTarget.style.borderColor="var(--accent-blue)"} onMouseOut={(e) => e.currentTarget.style.borderColor="var(--border-strong)"}>BMW F30 (8HP)</button>
        <button className="car-preset-btn" data-preset="corvette" onClick={() => handlePreset("corvette")} style={{ 'background': 'var(--bg-surface)', 'border': '1px solid var(--border-strong)', 'color': 'var(--text-primary)', 'padding': '8px 10px', 'borderRadius': '8px', 'fontSize': '12px', 'fontWeight': '500', 'cursor': 'pointer', 'transition': '0.2s', 'boxShadow': '0 2px 5px rgba(0,0,0,0.2)' }} onMouseOver={(e) => e.currentTarget.style.borderColor="var(--accent-blue)"} onMouseOut={(e) => e.currentTarget.style.borderColor="var(--border-strong)"}>Corvette C5 (V8)</button>
        <button className="car-preset-btn" data-preset="subaru" onClick={() => handlePreset("subaru")} style={{ 'background': 'var(--bg-surface)', 'border': '1px solid var(--border-strong)', 'color': 'var(--text-primary)', 'padding': '8px 10px', 'borderRadius': '8px', 'fontSize': '12px', 'fontWeight': '500', 'cursor': 'pointer', 'transition': '0.2s', 'boxShadow': '0 2px 5px rgba(0,0,0,0.2)' }} onMouseOver={(e) => e.currentTarget.style.borderColor="var(--accent-blue)"} onMouseOut={(e) => e.currentTarget.style.borderColor="var(--border-strong)"}>Subaru (CVT)</button>
      </div>
    </div>

    {/*  GŁÓWNY PRZEŁĄCZNIK TRYBÓW (Apple Segmented Tab Switcher)  */}
    <div className="main-mode-switcher">
      <button className="mode-tab-btn active" data-mode="config">
        <span className="mode-icon">🛠️</span>
        <span data-i18n="ui.modeConfig">Konfigurator</span>
      </button>
      <button className="mode-tab-btn" data-mode="stats">
        <span className="mode-icon">📊</span>
        <span data-i18n="ui.modeStats">Statystyki & Osiągi</span>
      </button>
      <button className="mode-tab-btn" data-mode="tree">
        <span className="mode-icon">🌲</span>
        <span>Drzewo</span>
      </button>
    </div>

    {/*  ═══════════════════════════════════════════════════
         WIDOK 1: KONFIGURATOR (MODYFIKACJE PODZESPOŁÓW)
         ═══════════════════════════════════════════════════  */}
    <div id="mode_config_view" className="mode-view active">
      {/*  PODZAKŁADKI KONFIGURATORA  */}
      <div className="subtab-nav">
        <button className="subtab-btn active" data-subtab="engine" data-i18n-title="ui.subtabEngineTitle" title="Architektura, cylindry i rozrząd">
          <span className="subtab-icon">🏎️</span>
          <span className="subtab-text" data-i18n="ui.subtabEngine">Silnik</span>
        </button>
        <button className="subtab-btn" data-subtab="aspiration" data-i18n-title="ui.subtabAspirationTitle" title="Dolot, doładowanie, wydech i montaż">
          <span className="subtab-icon">🌪️</span>
          <span className="subtab-text" data-i18n="ui.subtabAspiration">Dolot/Wydech</span>
        </button>
        <button className="subtab-btn" data-subtab="crank" data-i18n-title="ui.subtabCrankTitle" title="Geometria wału korbowego i zapłon">
          <span className="subtab-icon">🗜️</span>
          <span className="subtab-text" data-i18n="ui.subtabCrank">Wał</span>
        </button>
        <button className="subtab-btn" data-subtab="drivetrain" data-i18n-title="ui.subtabDrivetrainTitle" title="Układ napędowy, RPM i skrzynia biegów">
          <span className="subtab-icon">⚙️</span>
          <span className="subtab-text" data-i18n="ui.subtabDrivetrain">Napęd</span>
        </button>
        <button className="subtab-btn" data-subtab="view" data-i18n-title="ui.subtabViewTitle" title="Narzędzia widoku, przekrój i kamera">
          <span className="subtab-icon">👁️</span>
          <span className="subtab-text" data-i18n="ui.subtabView">Widok</span>
        </button>
      </div>

      {/*  1. PODZAKŁADKA: SILNIK (ENGINE CORE)  */}
      <div id="subtab_engine" className="subtab-pane active">
        {/*  Pasek szybkich parametrów fizycznych silnika (Bez wróżenia mocy z fusów)  */}
        <div className="quick-stats-strip">
          <div className="quick-stat-item">
            <span className="quick-stat-label">Pojemność</span>
            <b className="quick-stat-val" id="qs_engine_disp">2.0L (1995 cm³)</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">Średnica × Skok</span>
            <b className="quick-stat-val" id="qs_engine_bore_stroke" style={{ 'color': 'var(--accent-amber)' }}>84.0 × 90.0 mm</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">Geometria B/S</span>
            <b className="quick-stat-val" id="qs_engine_bs" style={{ 'color': 'var(--accent-cyan)' }}>0.93</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">v_mean (Tłok)</span>
            <b className="quick-stat-val" id="qs_engine_pspeed" style={{ 'color': 'var(--accent-green)' }}>6.0 m/s</b>
          </div>
        </div>

        <div className="panel-section">
          <label className="control-label" data-i18n="ui.cylinderLayout">Układ cylindrów:</label>
          <div className="focus-group" id="dev_layout" style={{ 'flexWrap': 'wrap' }}>
            <button className="config-btn active" data-val="Inline" data-i18n="ui.layoutInline" data-i18n-title="ui.layoutInlineTitle" title="Rzędowy (Inline) - najpopularniejszy układ.">Rzędowy</button>
            <button className="config-btn" data-val="V" data-i18n="ui.layoutV" data-i18n-title="ui.layoutVTitle" title="Widlasty (V) - zwarty blok, dwa rzędy cylindrów.">Widlasty</button>
            <button className="config-btn" data-val="VR" data-i18n="ui.layoutVR" data-i18n-title="ui.layoutVRTitle" title="VR - wąski kąt rozwarcia (ok. 15°), wspólna głowica.">VR</button>
            <button className="config-btn" data-val="W" data-i18n="ui.layoutW" data-i18n-title="ui.layoutWTitle" title="W - połączenie dwóch bloków VR (np. W12, W16).">W</button>
            <button className="config-btn" data-val="Boxer" data-i18n="ui.layoutBoxer" data-i18n-title="ui.layoutBoxerTitle" title="Boxer (Przeciwsobny) - cylindry leżące płasko (180°).">Boxer</button>
          </div>
          
          <label className="control-label"><span data-i18n="ui.cylinderCount">Liczba cylindrów:</span> <b id="dev_cyl_val" className="highlight-val">4</b></label>
          <input type="range" id="dev_cyl" className="styled-slider" min="1" max="16" step="1" defaultValue="4" />

          <label className="control-label"><span data-i18n="ui.bore">Średnica tłoka (Bore):</span> <b id="dev_bore_val" className="highlight-val">84.0 mm</b></label>
          <input type="range" id="dev_bore" className="styled-slider" min="50" max="120" step="0.5" defaultValue="84" />

          <label className="control-label"><span data-i18n="ui.stroke">Skok tłoka (Stroke):</span> <b id="dev_stroke_len_val" className="highlight-val">90.0 mm</b></label>
          <input type="range" id="dev_stroke_len" className="styled-slider" min="50" max="140" step="0.5" defaultValue="90" />

          <div className="spec-summary-card">
            <span className="spec-summary-title" data-i18n="ui.displacement">Pojemność skokowa</span>
            <b id="dev_disp_val" className="spec-summary-val">1995 cm³ (2.0L)</b>
          </div>
          
          <div id="dev_angle_container" style={{ 'display': 'none' }}>
            <label className="control-label"><span data-i18n="ui.vAngle">Kąt rozwarcia (V-Angle):</span> <b id="dev_angle_val" className="highlight-val">60</b>°</label>
            <input type="range" id="dev_angle" className="styled-slider" min="15" max="180" step="5" defaultValue="60" />
          </div>

          <label className="control-label" data-i18n="ui.cycle">Cykl pracy:</label>
          <div className="focus-group" id="dev_stroke">
            <button className="config-btn active" data-val="4" data-i18n="ui.cycle4Btn">4-suw (Otto)</button>
            <button className="config-btn" data-val="2" data-i18n="ui.cycle2Btn">2-suw</button>
          </div>

          <label className="control-label" data-i18n="ui.valvesPerCyl">Zawory na cylinder:</label>
          <div className="focus-group" id="dev_valves">
            <button className="config-btn" data-val="2" data-i18n="ui.valves2Btn">2 zawory</button>
            <button className="config-btn active" data-val="4" data-i18n="ui.valves4Btn">4 zawory</button>
          </div>

          <label className="control-label" data-i18n="ui.valvetrain">Układ rozrządu:</label>
          <div className="focus-group" id="dev_valvetrain">
            <button className="config-btn active" data-val="OHC" data-i18n="ui.valvetrainOHCBtn">OHC (Głowica)</button>
            <button className="config-btn" data-val="OHV" data-i18n="ui.valvetrainOHVBtn">OHV (Popychacze)</button>
          </div>
          
          <label className="control-label">Technologia zmiennych faz (VVT):</label>
          <div className="focus-group" id="dev_vvt">
            <button className="config-btn active" data-val="none">Brak (Stale)</button>
            <button className="config-btn" data-val="VTEC" disabled style={{ 'opacity': '0.45', 'cursor': 'not-allowed' }} title="Zmienne fazy rozrządu - wkrótce!">VVT / VTEC (Wkrótce)</button>
          </div>
        </div>
      </div>

      {/*  2. PODZAKŁADKA: DOLOT, WYDECH & MONTAŻ  */}
      <div id="subtab_aspiration" className="subtab-pane">
        {/*  Pasek szybkich statystyk dolotu/wydechu  */}
        <div className="quick-stats-strip">
          <div className="quick-stat-item">
            <span className="quick-stat-label">Dolot</span>
            <b className="quick-stat-val" id="qs_asp_intake">Sport Stożek</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">Zawory / Rozrząd</span>
            <b className="quick-stat-val" id="qs_asp_valves" style={{ 'color': 'var(--accent-cyan)' }}>4V OHC</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">Masa zespołu</span>
            <b className="quick-stat-val" id="qs_asp_weight">168 kg</b>
          </div>
        </div>

        <div className="panel-section">
          <label className="control-label">Układ dolotowy powietrza:</label>
          <div className="focus-group" id="dev_intake">
            <button className="config-btn active" data-val="sport">Sportowy (Stożek)</button>
            <button className="config-btn" data-val="normal">Cywilny (Airbox)</button>
          </div>

          <label className="control-label">Doładowanie (Forced Induction):</label>
          <div className="focus-group" id="dev_aspiration">
            <button className="config-btn active" data-val="na">N/A (Wolnossący)</button>
            <button className="config-btn" data-val="turbo" disabled style={{ 'opacity': '0.45', 'cursor': 'not-allowed' }} title="Turbosprężarka - wkrótce!">Turbo (Wkrótce)</button>
            <button className="config-btn" data-val="supercharger" disabled style={{ 'opacity': '0.45', 'cursor': 'not-allowed' }} title="Kompresor - wkrótce!">Kompresor (Wkrótce)</button>
          </div>

          <label className="control-label" data-i18n="ui.exhaustPipes">Układ Wydechowy:</label>
          <div className="focus-group" id="dev_exhaust_pipes">
            <button className="config-btn active" data-val="single" data-i18n="ui.exhaustSingleBtn">Pojedynczy (1 rura)</button>
            <button className="config-btn" data-val="dual" data-i18n="ui.exhaustDualBtn">Podwójny (2 rury)</button>
          </div>

          <label className="control-label" data-i18n="ui.enginePlacement">Położenie silnika w ramie:</label>
          <div className="focus-group" id="dev_placement">
            <button className="config-btn active" data-val="front" data-i18n="ui.placementFrontBtn">Z przodu</button>
            <button className="config-btn" data-val="mid" data-i18n="ui.placementMidBtn">Centralnie</button>
            <button className="config-btn" data-val="rear" data-i18n="ui.placementRearBtn">Z tyłu</button>
          </div>

          <label className="control-label" data-i18n="ui.orientation">Orientacja montażu:</label>
          <div className="focus-group" id="dev_orientation">
            <button className="config-btn active" data-val="longitudinal" data-i18n="ui.orientationLongBtn">Wzdłużny</button>
            <button className="config-btn" data-val="transverse" data-i18n="ui.orientationTransBtn">Poprzeczny</button>
          </div>

          <div className="crank-edu-note" style={{ 'marginTop': '6px' }}>
            <b>Układ:</b> Szeroki chwytak zimnego powietrza (Ram-Air) zoptymalizowany nad chłodnicą.
          </div>
        </div>
      </div>

      {/*  3. PODZAKŁADKA: WAŁ KORBOWY & ZAPŁON  */}
      <div id="subtab_crank" className="subtab-pane">
        {/*  Pasek szybkich statystyk wału i wyważenia  */}
        <div className="quick-stats-strip">
          <div className="quick-stat-item">
            <span className="quick-stat-label">Kolejność</span>
            <b className="quick-stat-val" id="qs_crank_order">1-3-4-2</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">Balans I</span>
            <b className="quick-stat-val" id="qs_crank_f1" style={{ 'color': 'var(--accent-green)' }}>100% OK</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">Kultura</span>
            <b className="quick-stat-val" id="qs_crank_status" style={{ 'color': 'var(--accent-cyan)' }}>Perfekcyjna</b>
          </div>
        </div>

        <div className="panel-section">
          {/*  WYBÓR WAŁU DLA V8 (Crossplane vs Flat-plane)  */}
          <div id="dev_v8_crank_container" style={{ 'display': 'none', 'marginBottom': '8px' }}>
            <label className="control-label" data-i18n="ui.v8Crank">Geometria wału V8:</label>
            <div className="focus-group" id="dev_v8_crank">
              <button className="config-btn active" data-val="crossplane" data-i18n="ui.v8CrossplaneBtn">Crossplane (90°)</button>
              <button className="config-btn" data-val="flatplane" data-i18n="ui.v8FlatplaneBtn">Flat-plane (180°)</button>
            </div>
            <div id="v8_crank_note" className="crank-edu-note">
              <b>Crossplane (90°):</b> Klasyczny bulgot V8, przeciwciężary niwelują siły bezwładności I i II rzędu.
            </div>
          </div>

          <label className="control-label" data-i18n="ui.crankConfigMode">Tryb konfiguracji wału:</label>
          <div className="focus-group" id="dev_crank_mode">
            <button className="config-btn active" data-val="preset" data-i18n="ui.presetModeBtn">Wzorce Inżynieryjne</button>
            <button className="config-btn" data-val="custom" data-i18n="ui.customModeBtn">Tuning 360°</button>
          </div>

          {/*  KARTA WZORCA INŻYNIERYJNEGO  */}
          <div id="crank_preset_card" className="crank-preset-card">
            <div className="crank-preset-header">
              <span className="crank-preset-title" id="crank_preset_name">R4 Flat-Plane 180°</span>
              <span className="crank-badge engineered" id="crank_preset_badge" data-i18n="ui.crankEngineeredBadge">Preset Inżynieryjny</span>
            </div>
            <p className="crank-preset-desc" id="crank_preset_desc">Kolejność zapłonu 1-3-4-2. Powszechny standard.</p>
            <div className="crank-preset-tech" id="crank_preset_tech">Interwał zapłonów: 180°</div>
          </div>

          {/*  INTERAKTYWNA TARCZA BIEGUNOWA W TRYBIE WŁASNYM  */}
          <div id="radial_tuning_container" style={{ 'display': 'none', 'marginTop': '8px' }}>
            <div style={{ 'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '6px' }}>
              <span className="control-label" style={{ 'margin': '0' }} data-i18n="ui.radialTuningLabel">Tarcza wykorbień (360°):</span>
              <button id="btn_reset_crank" className="dev-btn-small" data-i18n="ui.resetCrankBtn" data-i18n-title="ui.resetCrankTitle" title="Przywróć domyślne kąty wzorca">Reset</button>
            </div>
            <div className="radial-canvas-wrap">
              <canvas id="radial_crank_canvas" width="200" height="200" className="radial-canvas"></canvas>
            </div>
            <div className="radial-helper-bar">
              <label style={{ 'display': 'flex', 'alignItems': 'center', 'gap': '6px', 'fontSize': '11px', 'color': 'var(--text-secondary)', 'cursor': 'pointer' }}>
                <input type="checkbox" id="radial_snap_15" />
                <span data-i18n="ui.snap15Label">Przyciągaj co 15° (Snap)</span>
              </label>
            </div>
          </div>

          {/*  DIAGNOSTYKA I WIZUALIZACJA BALANSU SILNIKA (W CZASIE RZECZYWISTYM)  */}
          <div style={{ 'marginTop': '10px' }}>
            <label className="control-label" data-i18n="ui.physicsAndBalance">Wyważenie & Kultura pracy (Na żywo):</label>
            <div id="crank_diagnostics_box" className="crank-diag-box perfect">
              <div className="diag-header">
                <span id="diag_status_icon">✓</span>
                <strong id="diag_title">Perfekcyjny Balans</strong>
              </div>
              <p id="diag_message" className="diag-text">Siły I i II rzędu oraz momenty znoszą się do zera.</p>
              <div id="diag_rec" className="diag-rec">Złoty standard kultury pracy silnika spalinowego.</div>
            </div>

            {/*  Radar / Orbita Wibracji Masowych na Żywo  */}
            <div style={{ 'marginTop': '8px', 'display': 'flex', 'flexDirection': 'column', 'alignItems': 'center', 'background': 'rgba(0,0,0,0.3)', 'border': '1px solid var(--border-subtle)', 'borderRadius': '8px', 'padding': '8px' }}>
              <div style={{ 'display': 'flex', 'justifyContent': 'space-between', 'width': '100%', 'fontSize': '10px', 'color': 'var(--text-secondary)', 'marginBottom': '4px' }}>
                <span>Orbita sił i momentów (Lissajous)</span>
                <span style={{ 'display': 'flex', 'gap': '8px' }}>
                  <span style={{ 'color': '#ef4444' }}>● Siły</span>
                  <span style={{ 'color': '#f59e0b' }}>● Momenty</span>
                </span>
              </div>
              <canvas id="dev_vibration_canvas" width="180" height="130" className="physics-canvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      {/*  4. PODZAKŁADKA: UKŁAD NAPĘDOWY & SKRZYNIA  */}
      <div id="subtab_drivetrain" className="subtab-pane">
        {/*  Pasek szybkich statystyk napędu  */}
        <div className="quick-stats-strip">
          <div className="quick-stat-item">
            <span className="quick-stat-label">Prędkość</span>
            <b className="quick-stat-val" id="qs_drive_speed">0 km/h</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">Redukcja</span>
            <b className="quick-stat-val" id="qs_drive_reduction">14.68:1</b>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-label">V_max biegu</span>
            <b className="quick-stat-val" id="qs_drive_redline_spd" style={{ 'color': 'var(--accent-blue)' }}>58 km/h</b>
          </div>
        </div>

        <div className="panel-section">
          <label className="control-label" data-i18n="ui.drivetrainLayout">Rodzaj napędu:</label>
          <div className="focus-group" id="dev_drivetrain_layout">
            <button className="config-btn active" data-val="RWD">RWD</button>
            <button className="config-btn" data-val="FWD">FWD</button>
            <button className="config-btn" data-val="AWD">AWD</button>
            <button className="config-btn" data-val="4x4">4x4</button>
          </div>

          <label className="control-label"><span data-i18n="ui.engineRpm">Obroty silnika:</span> <b id="dev_rpm_val" className="highlight-val">1000</b> RPM</label>
          <input type="range" id="dev_rpm" className="styled-slider" min="0" max="8000" step="100" defaultValue="1000" />

          <div style={{ 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'space-between', 'margin': '4px 0 8px 0' }}>
            <label className="control-label" style={{ 'margin': '0' }} data-i18n="ui.clutchEngaged">Sprzęgło załączone:</label>
            <input type="checkbox" id="dev_clutch_engaged" defaultChecked />
          </div>

          <label className="control-label" data-i18n="ui.gearboxPreset">Typ Skrzyni Biegów:</label>
          
          <div style={{ 'fontSize': '11px', 'color': '#888', 'margin': '8px 0 4px 0', 'textTransform': 'uppercase', 'letterSpacing': '0.5px' }}>Manualne</div>
          <div className="focus-group" id="dev_gearbox_preset_manual" style={{ 'flexWrap': 'wrap', 'marginBottom': '8px' }}>
            <button className="config-btn active" data-val="opel_f17">F17 (5b FWD)</button>
            <button className="config-btn" data-val="bmw_zf_gs6">BMW (6b RWD)</button>
            <button className="config-btn" data-val="tremec_t56">Tremec T56</button>
            <button className="config-btn" data-val="rally_dogbox">Kłowa (6b)</button>
          </div>
          
          <div style={{ 'fontSize': '11px', 'color': '#888', 'margin': '8px 0 4px 0', 'textTransform': 'uppercase', 'letterSpacing': '0.5px' }}>Automaty / Inne</div>
          <div className="focus-group" id="dev_gearbox_preset_auto" style={{ 'flexWrap': 'wrap' }}>
            <button className="config-btn" data-val="zf_8hp">Automat (ZF)</button>
            <button className="config-btn" data-val="cvt_multitronic">CVT (Wariator)</button>
            <button className="config-btn" data-val="custom" data-i18n="ui.gearboxCustomBtn">Własna</button>
          </div>
          <div id="dev_gearbox_desc" className="crank-edu-note" style={{ 'marginBottom': '8px' }}>
            Klasyczna 5-biegowa skrzynia (bazowe przełożenia Saab 9-3 1.8i). Dobre stopniowanie miejskie.
          </div>

          {/*  BIEG (Włączone przełożenie)  */}
          <label className="control-label" data-i18n="ui.currentGear">Aktualny Bieg:</label>
          <div className="focus-group" id="dev_gearbox" style={{ 'flexWrap': 'wrap' }}>
            <button className="config-btn" data-gear="R">R</button>
            <button className="config-btn" data-gear="N">N</button>
            <button className="config-btn active" data-gear="1">1</button>
            <button className="config-btn" data-gear="2">2</button>
            <button className="config-btn" data-gear="3">3</button>
            <button className="config-btn" data-gear="4">4</button>
            <button className="config-btn" data-gear="5">5</button>
            <button className="config-btn" data-gear="6" id="btn_gear_6" style={{ 'display': 'none' }}>6</button>
            <button className="config-btn" data-gear="D" id="btn_gear_d" style={{ 'display': 'none' }}>D</button>
          </div>

          <div id="dev_cvt_ratio_container" style={{ 'display': 'none', 'marginTop': '10px', 'background': 'rgba(255,255,255,0.05)', 'padding': '8px', 'borderRadius': '4px' }}>
            <label className="control-label" style={{ 'display': 'flex', 'justifyContent': 'space-between' }}>
              <span data-i18n="ui.cvtRatio">Wariator (Przełożenie):</span>
              <span id="val_cvt_ratio" style={{ 'color': '#64ffda', 'fontWeight': 'bold' }}>2.60</span>
            </label>
            <div style={{ 'display': 'flex', 'alignItems': 'center', 'gap': '8px' }}>
              <span style={{ 'fontSize': '10px', 'color': '#888' }}>Low</span>
              <input type="range" className="control-slider" id="slider_cvt_ratio" min="0.60" max="2.60" step="0.01" defaultValue="2.60" style={{ 'flex': '1', 'direction': 'rtl' }} />
              <span style={{ 'fontSize': '10px', 'color': '#888' }}>High</span>
            </div>
          </div>

          {/*  WŁASNE PRZEŁOŻENIA (Custom Gearbox Editor)  */}
          <div id="custom_gearbox_container" style={{ 'display': 'none' }}>
            <label className="control-label" style={{ 'color': 'var(--text-primary)', 'fontWeight': '600' }} data-i18n="ui.customGearboxTitle">Edycja Przełożeń Biegów:</label>
            <div className="gearbox-custom-grid">
              <div className="gear-ratio-item">
                <label><span data-i18n="ui.gear1Label">1. Bieg:</span> <b id="val_g1">3.73</b></label>
                <input type="range" id="slider_g1" className="styled-slider" min="1.5" max="5.0" step="0.01" defaultValue="3.73" />
              </div>
              <div className="gear-ratio-item">
                <label><span data-i18n="ui.gear2Label">2. Bieg:</span> <b id="val_g2">2.14</b></label>
                <input type="range" id="slider_g2" className="styled-slider" min="1.0" max="3.5" step="0.01" defaultValue="2.14" />
              </div>
              <div className="gear-ratio-item">
                <label><span data-i18n="ui.gear3Label">3. Bieg:</span> <b id="val_g3">1.41</b></label>
                <input type="range" id="slider_g3" className="styled-slider" min="0.8" max="2.5" step="0.01" defaultValue="1.41" />
              </div>
              <div className="gear-ratio-item">
                <label><span data-i18n="ui.gear4Label">4. Bieg:</span> <b id="val_g4">1.12</b></label>
                <input type="range" id="slider_g4" className="styled-slider" min="0.6" max="1.8" step="0.01" defaultValue="1.12" />
              </div>
              <div className="gear-ratio-item">
                <label><span data-i18n="ui.gear5Label">5. Bieg:</span> <b id="val_g5">0.89</b></label>
                <input type="range" id="slider_g5" className="styled-slider" min="0.5" max="1.4" step="0.01" defaultValue="0.89" />
              </div>
              <div className="gear-ratio-item">
                <label><span data-i18n="ui.gear6Label">6. Bieg:</span> <b id="val_g6">0.75</b></label>
                <input type="range" id="slider_g6" className="styled-slider" min="0.4" max="1.2" step="0.01" defaultValue="0.75" />
              </div>
              <div className="gear-ratio-item" style={{ 'gridColumn': 'span 2' }}>
                <label><span data-i18n="ui.gearRLabel">Wsteczny (R):</span> <b id="val_gr">-3.31</b></label>
                <input type="range" id="slider_gr" className="styled-slider" min="1.5" max="4.5" step="0.01" defaultValue="3.31" />
              </div>
            </div>
          </div>
          
          <label className="control-label"><span data-i18n="ui.finalDrive">Przełożenie główne (Dyferencjał):</span> <b id="dev_final_drive_val" className="highlight-val">3.94</b></label>
          <input type="range" id="dev_final_drive" className="styled-slider" min="1.0" max="6.0" step="0.01" defaultValue="3.94" />

          <label className="control-label" data-i18n="ui.clutchType">Typ Sprzęgła:</label>
          <div className="focus-group" id="dev_clutch">
            <button className="config-btn active" data-val="single" data-i18n="ui.clutchSingleBtn">Jednotarczowe</button>
            <button className="config-btn" data-val="dual" data-i18n="ui.clutchDualBtn">DCT (Dwusprzęgłowe)</button>
          </div>

          <label className="control-label" data-i18n="ui.diffType">Mechanizm Różnicowy (Tył):</label>
          <div className="focus-group" id="dev_diff">
            <button className="config-btn active" data-val="open" data-i18n="ui.diffOpenBtn">Otwarty</button>
            <button className="config-btn" data-val="lsd_mech" data-i18n="ui.diffLsdBtn">Szpera (LSD)</button>
            <button className="config-btn" data-val="locker" data-i18n="ui.diffLockerBtn">Blokada 100%</button>
          </div>
          
          {/*  TELEMETRIA PRĘDKOŚCI  */}
          <div className="gear-telemetry-grid">
            <div>
              <span className="control-label" style={{ 'margin': '0', 'fontSize': '10px' }} data-i18n="ui.wheelSpeed">Prędkość kół:</span>
              <div id="dev_wheel_speed" className="gear-tele-val">0 km/h</div>
            </div>
            <div>
              <span className="control-label" style={{ 'margin': '0', 'fontSize': '10px' }} data-i18n="ui.wheelRpm">Obroty koła:</span>
              <div id="dev_wheel_rpm" className="gear-tele-val">0 RPM</div>
            </div>
            <div style={{ 'gridColumn': 'span 2', 'borderTop': '1px solid var(--border-subtle)', 'paddingTop': '6px', 'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center' }}>
              <span style={{ 'fontSize': '10.5px', 'color': 'var(--text-secondary)' }} data-i18n="ui.totalReduction">Całkowita redukcja:</span>
              <b id="dev_total_reduction" style={{ 'fontFamily': 'var(--font-mono)', 'fontSize': '11px', 'color': 'var(--text-primary)' }}>14.68:1</b>
            </div>
          </div>
        </div>
      </div>

      {/*  5. PODZAKŁADKA: WIDOK & KAMERA  */}
      <div id="subtab_view" className="subtab-pane">
        <div className="panel-section">
          <div style={{ 'display': 'flex', 'flexDirection': 'column', 'gap': '8px', 'marginBottom': '10px' }}>
            <label style={{ 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'space-between', 'color': 'var(--text-secondary)', 'cursor': 'pointer', 'fontSize': '11.5px' }}>
              <span data-i18n="ui.toggleWireframes">Zarys (Cylindry / Głowice)</span>
              <input type="checkbox" id="toggle_wireframes" defaultChecked />
            </label>
            <label style={{ 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'space-between', 'color': 'var(--text-secondary)', 'cursor': 'pointer', 'fontSize': '11.5px' }}>
              <span data-i18n="ui.toggleHover">Podświetlanie obiektów (Hover)</span>
              <input type="checkbox" id="toggle_hover" defaultChecked />
            </label>
            <label style={{ 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'space-between', 'color': 'var(--text-secondary)', 'cursor': 'pointer', 'fontSize': '11.5px' }}>
              <span data-i18n="ui.toggleDatum">Pokaż Datum silnika (Centrum)</span>
              <input type="checkbox" id="toggle_datum" />
            </label>
            <label style={{ 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'space-between', 'color': 'var(--text-secondary)', 'cursor': 'pointer', 'fontSize': '11.5px' }}>
              <span data-i18n="ui.toggleChassis">Podwozie, koła i zawieszenie</span>
              <input type="checkbox" id="toggle_chassis" />
            </label>
          </div>



          <div style={{ 'marginTop': '8px' }}>
            <button id="cutaway-btn" onClick={(e) => { const isCutaway = sceneRef.current?.toggleCutaway(); e.currentTarget.classList.toggle("active", isCutaway); }} className="hud-btn active" style={{ 'width': '100%', 'justifyContent': 'center' }} data-i18n="ui.cutawayBtn">
              Przekrój bloku silnika
            </button>
          </div>
          <label className="control-label" style={{ 'marginTop': '10px' }} data-i18n="ui.explodeSlider">Eksplozja podzespołów:</label>
          <input type="range" id="explode-slider" className="styled-slider" min="0" max="1" defaultValue="0" step="0.01" onChange={(e) => sceneRef.current?.setExploded(parseFloat(e.target.value))} />
        </div>
      </div>
    </div>

    {/*  ═══════════════════════════════════════════════════
         WIDOK 2: STATYSTYKI & OSIĄGI (LIVE SPECS DASHBOARD)
         ═══════════════════════════════════════════════════  */}
    <div id="mode_stats_view" className="mode-view">
      {/*  HEADER PODSUMOWANIA ARCHITEKTURY  */}
      <div className="stats-hero-banner">
        <span className="stats-hero-badge" id="stats_engine_pill">R4 2.0L DOHC</span>
        <span className="stats-hero-sub" id="stats_aspiration_pill">N/A • Sport Cone</span>
      </div>

      {/*  GŁÓWNE OSIĄGI (HERO KPI GRID)  */}
      <div className="stats-kpi-grid">
        <div className="stat-card hero-card">
          <span className="stat-card-title" data-i18n="ui.statsPowerTitle">Moc szacunkowa</span>
          <div className="stat-card-value" id="stat_power_val">210 KM</div>
          <div className="stat-card-sub" id="stat_power_kw">154 kW @ 6400 RPM</div>
        </div>

        <div className="stat-card hero-card">
          <span className="stat-card-title" data-i18n="ui.statsTorqueTitle">Maks. Moment</span>
          <div className="stat-card-value" id="stat_torque_val">265 Nm</div>
          <div className="stat-card-sub" id="stat_torque_rpm">@ 4200 RPM</div>
        </div>

        <div className="stat-card">
          <span className="stat-card-title" data-i18n="ui.statsPowerPerLiter">Moc z 1 litra</span>
          <div className="stat-card-value" id="stat_power_per_liter">105.3 KM/L</div>
          <div className="stat-card-sub" id="stat_specific_output">Wysilona wolnossąca</div>
        </div>

        <div className="stat-card">
          <span className="stat-card-title" data-i18n="ui.statsRedlineTitle">Max RPM (Redline)</span>
          <div className="stat-card-value" id="stat_redline_val">7400 RPM</div>
          <div className="stat-card-sub" id="stat_cycle_label">Cykl 4-suwowy</div>
        </div>

        <div className="stat-card">
          <span className="stat-card-title" data-i18n="ui.statsWeightTitle">Masa zespołu</span>
          <div className="stat-card-value" id="stat_weight_val">168 kg</div>
          <div className="stat-card-sub" id="stat_weight_sub">Silnik + Skrzynia</div>
        </div>

        <div className="stat-card">
          <span className="stat-card-title" data-i18n="ui.statsPowerToWeight">Stosunek moc/masa</span>
          <div className="stat-card-value" id="stat_ptw_val">1.25 KM/kg</div>
          <div className="stat-card-sub" id="stat_ptw_ton">1250 KM / tonę silnika</div>
        </div>
      </div>

      {/*  GEOMETRIA & KINEMATYKA TŁOKA  */}
      <div className="panel-section" style={{ 'marginTop': '10px' }}>
        <div className="section-title-bar">
          <span className="section-icon">📐</span>
          <h4 className="section-title" data-i18n="ui.statsGeomSection">Geometria & Kinematyka Tłoka</h4>
        </div>

        <div className="stat-row">
          <span className="stat-row-label" data-i18n="ui.statsDisplacement">Pojemność całkowita:</span>
          <b className="stat-row-val" id="stat_disp_full">1995 cm³ (2.0L)</b>
        </div>
        <div className="stat-row">
          <span className="stat-row-label" data-i18n="ui.statsUnitDisp">Pojemność 1 cylindra:</span>
          <b className="stat-row-val" id="stat_unit_disp">498.8 cm³ / cyl</b>
        </div>
        <div className="stat-row">
          <span className="stat-row-label" data-i18n="ui.statsBoreStroke">Średnica × Skok:</span>
          <b className="stat-row-val" id="stat_bore_stroke">84.0 × 90.0 mm</b>
        </div>
        
        <div className="stat-sub-card">
          <div style={{ 'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '2px' }}>
            <span style={{ 'fontSize': '10.5px', 'color': 'var(--text-secondary)' }} data-i18n="ui.statsBsRatio">Proporcja B/S:</span>
            <b id="stat_bs_val" style={{ 'fontFamily': 'var(--font-mono)', 'color': 'var(--accent-cyan)', 'fontSize': '12px' }}>0.93</b>
          </div>
          <div className="stat-note-text" id="stat_bs_desc">Długoskokowy (Podkwadratowy) • wysoki moment obrotowy na dole</div>
        </div>

        {/*  ŚREDNIA PRĘDKOŚĆ TŁOKA Z WSKAŹNIKIEM GRAFICZNYM  */}
        <div style={{ 'marginTop': '8px' }}>
          <div style={{ 'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '4px' }}>
            <span style={{ 'fontSize': '10.5px', 'color': 'var(--text-secondary)' }} data-i18n="ui.statsMeanPistonSpeed">Średnia prędkość tłoka (v_mean):</span>
            <b id="stat_piston_speed_val" className="highlight-val">6.0 m/s</b>
          </div>
          <div className="piston-speed-track">
            <div id="stat_piston_speed_bar" className="piston-speed-bar" style={{ 'width': '25%' }}></div>
          </div>
          <div style={{ 'display': 'flex', 'justifyContent': 'space-between', 'fontSize': '9.5px', 'color': 'var(--text-tertiary)', 'marginTop': '2px' }}>
            <span>0 m/s</span>
            <span id="stat_piston_speed_status" style={{ 'color': 'var(--accent-green)' }}>Bezpieczna (&lt; 15 m/s)</span>
            <span id="stat_piston_speed_redline_label">@ Redline: 21.6 m/s</span>
          </div>
        </div>
      </div>

      {/*  PRĘDKOŚCI TEORETYCZNE NA BIEGACH  */}
      <div className="panel-section" style={{ 'marginTop': '10px' }}>
        <div className="section-title-bar">
          <span className="section-icon">🏁</span>
          <h4 className="section-title" data-i18n="ui.statsGearsSection">Prędkości Teoretyczne na Biegach</h4>
        </div>

        <div className="gear-matrix-table-wrap">
          <table className="gear-matrix-table">
            <thead>
              <tr>
                <th data-i18n="ui.statsColGear">Bieg</th>
                <th data-i18n="ui.statsColRatio">Przeł.</th>
                <th id="th_speed_rpm">@ 1000 RPM</th>
                <th id="th_speed_redline">@ Redline</th>
              </tr>
            </thead>
            <tbody id="gear_matrix_body">
              {/*  Wypełniane dynamicznie przez JS  */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    {/*  ═══════════════════════════════════════════════════
         WIDOK 3: DRZEWO CZĘŚCI
         ═══════════════════════════════════════════════════  */}
    <div id="mode_tree_view" className="mode-view">
      <div className="panel-section">
        <div className="section-title-bar">
          <span className="section-icon">🌲</span>
          <h4 className="section-title">Eksplorator Części</h4>
        </div>
        <div id="parts-tree-container" className="parts-tree">
          {/*  Tree UI will be generated here by JS  */}
        </div>
      </div>
    </div>

    {/*  CZĘŚCI I MODUŁY (Dla kompatybilności wstecznej)  */}
    <div className="panel-section" style={{ 'display': 'none' }}>
      
      <nav className="category-pills" id="category-nav">
        {Object.keys(t.categories).map((catKey) => (
          <button 
            key={catKey}
            className={`cat-chip ${catKey === activeCategory ? "active" : ""}`}
            onClick={() => setActiveCategory(catKey)}
          >
            {t.categories[catKey as keyof typeof t.categories]}
          </button>
        ))}
      </nav>

      
      <div className="parts-chips-container" id="parts-selector">
        {Object.keys(PARTS_DATA[activeCategory as keyof typeof PARTS_DATA]).map((partId) => {
          const partInfo = t.parts[partId as keyof typeof t.parts];
          if (!partInfo) return null;
          const isSelected = config[activeCategory as keyof typeof config] === partId;
          return (
            <button 
              key={partId}
              className={`part-chip ${isSelected ? "selected" : ""}`}
              onClick={() => {
                setConfig({ ...config, [activeCategory]: partId });
              }}
            >
              <span className="part-chip-name">{partInfo.name.split(' (')[0]}</span>
            </button>
          );
        })}
      </div>

    </div>
  </aside>

  {/*  DOLNY PANEL TELEMETRII (Apple Pro Dock)  */}
  <footer className="bottom-hud">
    <div className="live-stroke-banner" id="live-stroke-desc" data-i18n="ui.liveCamera">Kamera aktywna</div>
    <div className="cylinders-telemetry-bar" id="cylinders-telemetry"></div>
    
    <div className="controls-toolbar">
      <div className="hud-group">
        <span className="hud-label" data-i18n="ui.timeLabel">CZAS:</span>
        <div className="btn-group">
          <button className="speed-btn" data-speed="0" onClick={() => handleSpeed(parseFloat("0"))}>⏸</button>
          <button className="speed-btn" data-speed="0.2" onClick={() => handleSpeed(parseFloat("0.2"))}>0.2x</button>
          <button className="speed-btn active" data-speed="0.35" onClick={() => handleSpeed(parseFloat("0.35"))}>0.35x</button>
          <button className="speed-btn" data-speed="1.0" onClick={() => handleSpeed(parseFloat("1.0"))}>1.0x</button>
        </div>
      </div>
      
      <div className="hud-group slider-group">
        <span className="hud-label" data-i18n="ui.crankAngleLabel">KĄT WAŁU:</span>
        <input type="range" id="crank-scrub" className="styled-slider" min="0" max="720" defaultValue="0" step="1" onChange={(e) => sceneRef.current?.setManualCrankAngle(parseInt(e.target.value))} />
        <span className="hud-val" id="crank-val">0°</span>
      </div>

      <button id="info-toggle-btn" onClick={() => setIsInfoOpen(!isInfoOpen)} className="hud-btn" style={{ 'marginLeft': 'auto' }} data-i18n="ui.knowledgeBaseBtn">
        Baza Wiedzy
      </button>
    </div>
    
    {/*  Ukryte elementy dla kompatybilności app.js  */}
    <div style={{ 'display': 'none' }}>
        <button className="stroke-step-btn" data-stroke="1" onClick={() => handleStroke(1)}></button>
        <button className="stroke-step-btn" data-stroke="2" onClick={() => handleStroke(2)}></button>
        <button className="stroke-step-btn" data-stroke="3" onClick={() => handleStroke(3)}></button>
        <button className="stroke-step-btn" data-stroke="4" onClick={() => handleStroke(4)}></button>
    </div>
  </footer>

  {/*  PRAWY PANEL WIEDZY (Info Drawer)  */}
  <aside id="info-drawer" className={`info-drawer ${isInfoOpen ? "open" : ""}`}>
    <div className="drawer-header">
      <h3 id="drawer-title" data-i18n="ui.drawerTitleDefault">Komponent</h3>
      <button id="info-close-btn" onClick={() => setIsInfoOpen(false)} className="drawer-close" data-i18n-title="ui.drawerCloseTitle" title="Zamknij">✕</button>
    </div>
    <div className="drawer-telemetry">
      <div className="mini-spec"><span className="spec-label" data-i18n="ui.drawerHp">Moc:</span> <strong id="drawer-hp">0 KM</strong></div>
      <div className="mini-spec"><span className="spec-label" data-i18n="ui.drawerTorque">Moment:</span> <strong id="drawer-torque">0 Nm</strong></div>
      <div className="mini-spec"><span className="spec-label" data-i18n="ui.drawerWeight">Masa:</span> <strong id="drawer-weight">0 kg</strong></div>
    </div>
    <div className="drawer-content">
      <div className="drawer-block"><span className="drawer-tag" data-i18n="ui.drawerTagPrinciple">ZASADA DZIAŁANIA</span><p id="drawer-principle"></p></div>
      <div className="drawer-block"><span className="drawer-tag" data-i18n="ui.drawerTagWhy">CEL KONSTRUKCYJNY</span><p id="drawer-why"></p></div>
      <div className="drawer-block highlight-block"><span className="drawer-tag" data-i18n="ui.drawerTagHistory">GENEZA & HISTORIA</span><p id="drawer-history"></p></div>
      <div className="drawer-block"><span className="drawer-tag" data-i18n="ui.drawerTagExamples">PRZYKŁADY ZASTOSOWAŃ</span><p id="drawer-examples"></p></div>
    </div>
  </aside>

  {/*  DEV / DEBUG DRAWER & TOGGLE  */}
  <div style={{ 'position': 'fixed', 'top': '16px', 'right': '16px', 'zIndex': '50', 'display': 'flex', 'gap': '8px', 'alignItems': 'center' }}>
    <button id="settings-btn" className="settings-toggle" title="Ustawienia techniczne">
      ⚙️
    </button>
    <button id="dev-mode-btn" className="dev-mode-toggle" style={{ 'position': 'static' }} data-i18n-title="ui.devModeBtnTitle" title="Włącz / Wyłącz Inspektor">
      Inspector Pro
    </button>
  </div>

  <aside id="dev-drawer" className="dev-drawer">
    <div className="drawer-header">
      <h3 style={{ 'color': 'var(--text-primary)', 'margin': '0', 'fontSize': '1.1rem', 'fontWeight': '700' }} data-i18n="ui.inspectorPro">
        Inspector Pro
      </h3>
      <button id="dev-close-btn" className="drawer-close" data-i18n-title="ui.devCloseTitle" title="Zamknij panel (Esc)">✕</button>
    </div>
    
    <div className="drawer-content" style={{ 'flex': '1', 'display': 'flex', 'flexDirection': 'column' }}>
      <div id="dev-config-summary" className="dev-meta-pill">
        <span style={{ 'color': 'var(--text-secondary)' }}><span data-i18n="ui.devSummaryLayout">Układ:</span> <strong id="dev-summary-text" style={{ 'color': '#fff' }}>Inline-4</strong></span>
        <span id="dev-status-badge" className="dev-badge info" data-i18n="ui.devStatusReady">Gotowy</span>
      </div>

      <div className="dev-btn-group">
        <button id="dev-check-overlap" className="dev-btn-primary">
          <span data-i18n="ui.devCheckCollisionsBtn">Sprawdź Kolizje OBB</span>
        </button>
        <button id="dev-copy-overlap" className="dev-btn-secondary" disabled data-i18n-title="ui.devCopyReportTitle" title="Skopiuj raport kolizji do schowka">
          <span data-i18n="ui.devCopyReportBtn">Kopiuj</span>
        </button>
        <button id="dev-clear-overlap" className="dev-btn-icon" data-i18n-title="ui.devClearResultsTitle" title="Wyczyść wyniki">
          <span>✕</span>
        </button>
      </div>

      <div id="dev-overlap-results" className="dev-results-box" style={{ 'marginBottom': '14px' }} data-i18n="ui.devOverlapPlaceholder">
Kliknij przycisk powyżej, aby przeanalizować scenę 3D pod kątem kolizji i overlapingu modułów.
      </div>

      {/*  SPIS CZĘŚCI I PODZESPOŁÓW WG KATEGORII  */}
      <div className="dev-catalog-section" style={{ 'marginBottom': '14px' }}>
        <div style={{ 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'space-between', 'marginBottom': '8px' }}>
          <div style={{ 'fontSize': '11px', 'color': 'var(--text-primary)', 'textTransform': 'uppercase', 'letterSpacing': '0.5px', 'fontWeight': '600' }}>
            <span data-i18n="ui.devPartsCatalog">Spis Części</span> (<span id="dev-parts-total-count" style={{ 'color': 'var(--accent-blue)' }}>0 szt.</span>)
          </div>
          <button id="dev-copy-parts" className="dev-btn-small" data-i18n="ui.devCopyPartsBtn" data-i18n-title="ui.devCopyPartsTitle" title="Skopiuj spis wszystkich części do schowka">
            Kopiuj spis
          </button>
        </div>

        <div style={{ 'marginBottom': '8px' }}>
          <input type="text" id="dev-parts-search" data-i18n-placeholder="ui.devPartsSearchPlaceholder" placeholder="Filtruj część (np. tłok, wał, zawór)..." style={{ 'width': '100%' }} />
        </div>

        <div id="dev-parts-catalog-list" className="dev-catalog-box">
          {/*  Wypełniane dynamicznie przez JS  */}
        </div>
      </div>

      {/*  OPCJE DEWELOPERSKIE SCENY I SYSTEMU  */}
      <div style={{ 'background': 'rgba(255, 255, 255, 0.03)', 'border': '1px solid var(--border-subtle)', 'borderRadius': '8px', 'padding': '12px', 'marginTop': 'auto' }}>
        <div style={{ 'fontSize': '11px', 'color': 'var(--text-secondary)', 'textTransform': 'uppercase', 'letterSpacing': '0.5px', 'marginBottom': '8px', 'fontWeight': '600' }} data-i18n="ui.devViewTools">
          Narzędzia Widoku
        </div>
        <label style={{ 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'space-between', 'color': 'var(--text-primary)', 'cursor': 'pointer', 'fontSize': '12px', 'marginBottom': '10px' }}>
          <span data-i18n="ui.devShowDatum">Pokaż centrum silnika (Wektory / Datum)</span>
          <input type="checkbox" id="dev-toggle-datum" />
        </label>
        <button id="dev-reload-page" className="dev-btn-secondary" style={{ 'width': '100%', 'padding': '8px', 'fontWeight': '600' }} data-i18n="ui.devReloadApp" data-i18n-title="ui.devReloadAppTitle" title="Przeładuj całą stronę i zresetuj stan">
          Przeładuj aplikację
        </button>
        <button id="sandbox-btn" className="dev-btn-secondary" style={{ 'width': '100%', 'padding': '8px', 'fontWeight': '600', 'marginTop': '6px', 'background': 'rgba(59, 130, 246, 0.2)', 'color': '#60a5fa', 'border': '1px solid #3b82f6' }} onClick={() => window.location.href="sandbox.html"}>
          🛠️ Otwórz AI Modeler Sandbox
        </button>
      </div>
    </div>
  </aside>

  {/*  USTAWIENIA TECHNICZNE / MODAL  */}
  <div id="settings-modal" className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>Ustawienia Techniczne</h3>
        <button id="close-settings-btn" className="modal-close">✕</button>
      </div>
      <div className="modal-body">
         <p style={{ 'color': 'var(--text-secondary)', 'fontSize': '13px', 'marginBottom': '20px' }}>
           Opcje takie jak limit FPS, jakość renderowania czy antyaliasing (Wkrótce)
         </p>

         <hr style={{ 'border': '0', 'borderTop': '1px solid var(--border-medium)', 'margin': '20px 0' }} />
         
         <div style={{ 'display': 'flex', 'gap': '15px', 'justifyContent': 'center' }}>
           <a href="/privacy" style={{ 'color': '#94a3b8', 'textDecoration': 'none', 'fontSize': '13px', 'transition': 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity="1"} onMouseOut={(e) => e.currentTarget.style.opacity="0.8"}>Polityka Prywatności</a>
           <a href="/legal" style={{ 'color': '#94a3b8', 'textDecoration': 'none', 'fontSize': '13px', 'transition': 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity="1"} onMouseOut={(e) => e.currentTarget.style.opacity="0.8"}>Noty Prawne</a>
         </div>
      </div>
    </div>
  </div>

  

    </div>
  );
}
