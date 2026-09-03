/**
 * Cars-operating-principles - Główny kontroler z Przewodnikiem Edukacyjnym 4-Suwu
 */

import { i18n, detectBrowserLanguage } from "./i18n.js";
import { PARTS_DATA, calculateSpecs } from "./parts.js";
import { Scene3D } from "./scene3d.js";
import { setupDevDrawer } from "./scene/DebugTools.js";

class App {
  [key: string]: any;

  constructor() {
    this.lang = detectBrowserLanguage();
    this.t = i18n[this.lang] || i18n.pl;
    
    this.config = {
      block: "block_i4",
      valvetrain: "valve_dohc",
      aspiration: "asp_na",
      drivetrain: "drive_rwd",
      suspension: "susp_wishbone"
    };

    this.activeCategory = "block";
    this.init();
  }

  init() {
    const container = document.getElementById("canvas-container");
    this.scene3d = new Scene3D(container, (stats) => this.onFrameStats(stats));
    this.scene3d.setLanguage(this.lang);
    this.scene3d.setConfig(this.config, this.activeCategory);

    this.cachedUi = {
      fpsBadge: document.getElementById("fps-val"),
      scrubVal: document.getElementById("crank-val"),
      scrubSlider: document.getElementById("crank-scrub"),
      cylContainer: document.getElementById("cylinders-telemetry"),
      liveDesc: document.getElementById("live-stroke-desc")
    };
    this.lastCylindersHtml = "";
    this.lastPrimaryDesc = "";

    document.documentElement.lang = this.lang;
    (document as any).title = `${this.t.appTitle} | ${this.t.subtitle}`;

    this.setupUI();
    this.translateUI();
    this.renderCategoryNav();
    this.renderPartsSelector();
    this.updateInfoDrawer();
  }

  setLanguage(newLang) {
    if (newLang !== "pl" && newLang !== "en") return;
    this.lang = newLang;
    this.t = i18n[this.lang] || i18n.pl;
    try {
      window.localStorage.setItem("lang", this.lang);
    } catch (e) {
      // ignore
    }
    document.documentElement.lang = this.lang;
    (document as any).title = `${this.t.appTitle} | ${this.t.subtitle}`;

    // Zaktualizuj stan przełącznika
    document.querySelectorAll(".lang-pill .lang-opt").forEach(opt => {
      opt.classList.toggle("active", (opt as any).dataset.lang === this.lang);
    });

    this.translateUI();
    this.renderCategoryNav();
    this.renderPartsSelector();
    this.updateInfoDrawer();

    if (this.scene3d) {
      this.scene3d.setLanguage(this.lang);
    }
  }

  onFrameStats(stats) {
    const fpsBadge = this.cachedUi.fpsBadge;
    if (fpsBadge) {
      fpsBadge.textContent = `${stats.fps} FPS`;
      fpsBadge.style.color = stats.fps >= 50 ? "#30d158" : stats.fps >= 30 ? "#ff9f0a" : "#ff453a";
    }

    const scrubVal = this.cachedUi.scrubVal;
    if (scrubVal && this.scene3d.isPlaying) {
      scrubVal.textContent = `${stats.crankAngleDeg}°`;
      const scrubSlider = this.cachedUi.scrubSlider;
      if (scrubSlider && !this.isUserDraggingScrub) {
        (scrubSlider as any).value = stats.crankAngleDeg;
      }
    }

    // Pasek stanu 4-suwu na żywo z opisem dla każdego cylindra (aktualizuj tylko przy zmianie fazy)
    const cylContainer = this.cachedUi.cylContainer;
    if (cylContainer && stats.cylinders && stats.cylinders.length > 0) {
      const newHtml = stats.cylinders.map(c => `
        <div class="cyl-card ${c.phaseClass}">
          <div class="cyl-num">CYL #${c.id}</div>
          <div class="cyl-phase">${c.phase}</div>
        </div>
      `).join("");

      if (newHtml !== this.lastCylindersHtml) {
        cylContainer.innerHTML = newHtml;
        this.lastCylindersHtml = newHtml;
      }

      // Aktywny opis pierwszego cylindra
      const primaryCyl = stats.cylinders[0];
      const liveDesc = this.cachedUi.liveDesc;
      if (liveDesc && primaryCyl && primaryCyl.desc !== this.lastPrimaryDesc) {
        const prefix = this.lang === 'pl' ? 'Cylinder #1:' : 'Cylinder #1:';
        liveDesc.innerHTML = `<strong>${prefix}</strong> ${primaryCyl.desc}`;
        this.lastPrimaryDesc = primaryCyl.desc;
      }
    }
  }

  translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const keys = key.split('.');
      let val = this.t;
      for (const k of keys) {
        if (val) val = val[k];
      }
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val.includes('<')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const keys = key.split('.');
      let val = this.t;
      for (const k of keys) {
        if (val) val = val[k];
      }
      if (val) (el as any).title = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const keys = key.split('.');
      let val = this.t;
      for (const k of keys) {
        if (val) val = val[k];
      }
      if (val) (el as any).placeholder = val;
    });
  }

  setupUI() {
    // 0. Przełącznik języka (PL / EN)
    const langToggleBtn = document.getElementById("lang-toggle-btn");
    if (langToggleBtn) {
      document.querySelectorAll(".lang-pill .lang-opt").forEach(opt => {
        opt.classList.toggle("active", (opt as any).dataset.lang === this.lang);
      });

      langToggleBtn.addEventListener("click", () => {
        const nextLang = this.lang === "pl" ? "en" : "pl";
        this.setLanguage(nextLang);
      });
    }

    // 1. Przewodnik 4-Suwowy (Skok do suwów 1-4)
    const strokeSteps = document.querySelectorAll(".stroke-step-btn");
    strokeSteps.forEach(btn => {
      btn.addEventListener("click", () => {
        strokeSteps.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const strokeNum = parseInt((btn as any).dataset.stroke, 10);
        this.scene3d.jumpToStroke(strokeNum);
        
        // Zaktualizuj przyciski prędkości na pauzę
        document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
        document.querySelector('.speed-btn[data-speed="0"]')?.classList.add("active");
      });
    });

    // 2. Wybór skupienia kamery (Focus)
    const focusButtons = document.querySelectorAll(".focus-btn");
    focusButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        focusButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.scene3d.setFocus((btn as any).dataset.focus);
      });
    });

    // 3. Kontrola tempa Slow-Mo
    const speedButtons = document.querySelectorAll(".speed-btn");
    speedButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        speedButtons.forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".stroke-step-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const speed = parseFloat((btn as any).dataset.speed);
        if (speed === 0) {
          this.scene3d.isPlaying = false;
        } else {
          this.scene3d.isPlaying = true;
          this.scene3d.setSpeed(speed);
        }
      });
    });

    // 4. Ręczny suwak kąta wału
    const scrubSlider = document.getElementById("crank-scrub");
    const scrubVal = document.getElementById("crank-val");
    this.isUserDraggingScrub = false;

    scrubSlider.addEventListener("mousedown", () => { this.isUserDraggingScrub = true; });
    scrubSlider.addEventListener("touchstart", () => { this.isUserDraggingScrub = true; });
    window.addEventListener("mouseup", () => { this.isUserDraggingScrub = false; });
    window.addEventListener("touchend", () => { this.isUserDraggingScrub = false; });

    scrubSlider.addEventListener("input", (e) => {
      const deg = parseInt((e.target as any).value, 10);
      scrubVal.textContent = `${deg}°`;
      this.scene3d.setManualCrankAngle(deg);
    });

    // 5. Widok eksplodowany
    const explodeSlider = document.getElementById("explode-slider");
    explodeSlider.addEventListener("input", (e) => {
      const val = parseFloat((e.target as any).value);
      this.scene3d.setExploded(val);
    });

    // 6. Przełącznik Przekroju
    const cutawayBtn = document.getElementById("cutaway-btn");
    cutawayBtn.addEventListener("click", () => {
      const isCutaway = this.scene3d.toggleCutaway();
      cutawayBtn.classList.toggle("active", isCutaway);
    });

    // 7. Wysuwany panel wiedzy
    const infoToggle = document.getElementById("info-toggle-btn");
    const infoDrawer = document.getElementById("info-drawer");
    const infoClose = document.getElementById("info-close-btn");

    infoToggle.addEventListener("click", () => {
      infoDrawer.classList.toggle("open");
    });
    infoClose?.addEventListener("click", () => {
      infoDrawer.classList.remove("open");
    });
    // 8. Dev Drawer (Tryb Deweloperski) - przeniesiony do DebugTools.js
    setupDevDrawer(this);
  }

  renderCategoryNav() {
    const nav = document.getElementById("category-nav");
    nav.innerHTML = "";

    const categories = Object.keys(this.t.categories);
    categories.forEach((catKey) => {
      const btn = document.createElement("button");
      btn.className = `cat-chip ${catKey === this.activeCategory ? "active" : ""}`;
      btn.textContent = this.t.categories[catKey];
      btn.addEventListener("click", () => {
        this.activeCategory = catKey;
        this.renderCategoryNav();
        this.renderPartsSelector();
        this.scene3d.setConfig(this.config, this.activeCategory);
        this.updateInfoDrawer();
      });
      nav.appendChild(btn);
    });
  }

  renderPartsSelector() {
    const container = document.getElementById("parts-selector");
    container.innerHTML = "";

    const availableParts = Object.keys(PARTS_DATA[this.activeCategory]);
    availableParts.forEach((partId) => {
      const partInfo = this.t.parts[partId];
      if (!partInfo) return;

      const isSelected = this.config[this.activeCategory] === partId;
      const chip = document.createElement("button");
      chip.className = `part-chip ${isSelected ? "selected" : ""}`;
      chip.innerHTML = `<span class="part-chip-name">${partInfo.name.split(' (')[0]}</span>`;

      chip.addEventListener("click", () => {
        this.config[this.activeCategory] = partId;
        this.renderPartsSelector();
        this.scene3d.setConfig(this.config, this.activeCategory);
        this.updateInfoDrawer();
      });

      container.appendChild(chip);
    });
  }

  updateInfoDrawer() {
    const currentPartId = this.config[this.activeCategory];
    const data = (this.t.parts && this.t.parts[currentPartId]) ? this.t.parts[currentPartId] : (i18n.pl.parts && i18n.pl.parts[currentPartId]);
    if (!data) return;

    const titleEl = document.getElementById("drawer-title");
    if (titleEl) titleEl.textContent = data.name;
    const princEl = document.getElementById("drawer-principle");
    if (princEl) princEl.textContent = data.principle;
    const whyEl = document.getElementById("drawer-why");
    if (whyEl) whyEl.textContent = data.why;
    const histEl = document.getElementById("drawer-history");
    if (histEl) histEl.textContent = data.history;
    const exEl = document.getElementById("drawer-examples");
    if (exEl) exEl.textContent = data.examples;

    const specs = calculateSpecs(this.config);
    const hpUnit = this.lang === 'pl' ? 'KM' : 'HP';
    const hpEl = document.getElementById("drawer-hp");
    if (hpEl) hpEl.textContent = `${specs.hp} ${hpUnit}`;
    const tqEl = document.getElementById("drawer-torque");
    if (tqEl) tqEl.textContent = `${specs.torque} Nm`;
    const wtEl = document.getElementById("drawer-weight");
    if (wtEl) wtEl.textContent = `${specs.weight} kg`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  (window as any).app = new App();
});
