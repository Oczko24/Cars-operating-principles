/**
 * Cars-operating-principles - Główny kontroler z Przewodnikiem Edukacyjnym 4-Suwu
 */

import { i18n } from "./i18n.js";
import { PARTS_DATA, calculateSpecs } from "./parts.js";
import { Scene3D } from "./scene3d.js";

class App {
  constructor() {
    this.lang = "pl";
    this.t = i18n[this.lang];
    
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

    this.setupUI();
    this.renderCategoryNav();
    this.renderPartsSelector();
    this.updateInfoDrawer();
  }

  onFrameStats(stats) {
    const fpsBadge = this.cachedUi.fpsBadge;
    if (fpsBadge) {
      fpsBadge.textContent = `${stats.fps} FPS (${stats.frameTime}ms)`;
      fpsBadge.style.color = stats.fps >= 50 ? "#10b981" : stats.fps >= 30 ? "#f59e0b" : "#ef4444";
    }

    const scrubVal = this.cachedUi.scrubVal;
    if (scrubVal && this.scene3d.isPlaying) {
      scrubVal.textContent = `${stats.crankAngleDeg}°`;
      const scrubSlider = this.cachedUi.scrubSlider;
      if (scrubSlider && !this.isUserDraggingScrub) {
        scrubSlider.value = stats.crankAngleDeg;
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
        liveDesc.innerHTML = `<strong>Cylinder #1:</strong> ${primaryCyl.desc}`;
        this.lastPrimaryDesc = primaryCyl.desc;
      }
    }
  }

  setupUI() {
    // 1. Przewodnik 4-Suwowy (Skok do suwów 1-4)
    const strokeSteps = document.querySelectorAll(".stroke-step-btn");
    strokeSteps.forEach(btn => {
      btn.addEventListener("click", () => {
        strokeSteps.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const strokeNum = parseInt(btn.dataset.stroke, 10);
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
        this.scene3d.setFocus(btn.dataset.focus);
      });
    });

    // 3. Kontrola tempa Slow-Mo
    const speedButtons = document.querySelectorAll(".speed-btn");
    speedButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        speedButtons.forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".stroke-step-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const speed = parseFloat(btn.dataset.speed);
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
      const deg = parseInt(e.target.value, 10);
      scrubVal.textContent = `${deg}°`;
      this.scene3d.setManualCrankAngle(deg);
    });

    // 5. Widok eksplodowany
    const explodeSlider = document.getElementById("explode-slider");
    explodeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
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
    // 8. Dev Drawer (Tryb Deweloperski)
    const devBtn = document.getElementById("dev-mode-btn");
    const devDrawer = document.getElementById("dev-drawer");
    const devClose = document.getElementById("dev-close-btn");
    const checkOverlapBtn = document.getElementById("dev-check-overlap");
    const copyOverlapBtn = document.getElementById("dev-copy-overlap");
    const clearOverlapBtn = document.getElementById("dev-clear-overlap");
    const devSummaryText = document.getElementById("dev-summary-text");
    const devStatusBadge = document.getElementById("dev-status-badge");
    const resultsDiv = document.getElementById("dev-overlap-results");

    let lastCollisionReportText = "";

    const updateDevSummary = () => {
      if (devSummaryText && this.scene3d && this.scene3d.config) {
        const c = this.scene3d.config;
        const angle = (c.layout === 'V' || c.layout === 'VR' || c.layout === 'W') ? ` ${c.vAngle}°` : '';
        devSummaryText.textContent = `${c.layout}${angle} (${c.cylinders}-cyl, ${c.valves}V, ${c.valvetrain || 'OHC'})`;
      }
    };

    const toggleDevDrawer = (forceState) => {
      if (!devDrawer) return;
      const isOpen = forceState !== undefined ? forceState : !devDrawer.classList.contains("open");
      devDrawer.classList.toggle("open", isOpen);
      devBtn?.classList.toggle("active", isOpen);
      if (isOpen) {
        updateDevSummary();
        renderPartsCatalog();
        // Zamknij prawy panel wiedzy, jeśli był otwarty
        if (infoDrawer?.classList.contains("open")) {
          infoDrawer.classList.remove("open");
        }
      }
    };

    if (devBtn) {
      devBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDevDrawer();
      });
    }

    if (devClose) {
      devClose.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDevDrawer(false);
      });
    }

    // Zamknięcie paneli klawiszem Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toggleDevDrawer(false);
        infoDrawer?.classList.remove("open");
      }
    });

    // Uruchomienie analizy kolizji i overlapingu
    if (checkOverlapBtn) {
      checkOverlapBtn.addEventListener("click", () => {
        updateDevSummary();
        const res = this.scene3d.checkOverlap();
        const collisions = Array.isArray(res) ? res : (res.collisions || []);
        const totalChecked = res.totalChecked || 0;
        const cfg = this.scene3d.config;
        const crankAngleDeg = (res.crankAngleDeg !== undefined) ? res.crankAngleDeg : Math.round(((this.scene3d.crankAngle * 180 / Math.PI) % 720 + 720) % 720);

        const timestamp = new Date().toLocaleTimeString('pl-PL');
        const configStr = `${cfg.layout} ${cfg.cylinders}-cyl | ${cfg.valves}V | ${cfg.valvetrain || 'OHC'} | Kąt V: ${cfg.vAngle || 0}°`;

        if (collisions.length > 0) {
          if (devStatusBadge) {
            devStatusBadge.className = "dev-badge warn";
            devStatusBadge.textContent = `${collisions.length} kolizji`;
          }
          if (resultsDiv) {
            resultsDiv.innerHTML = `
<div style="margin-bottom: 4px; font-size: 11px; color: #f59e0b;">
  📍 Kąt wału: <b>${crankAngleDeg}°</b> (0-720°)
</div>
<div style="margin-bottom: 8px; color: #f87171; font-weight: bold;">⚠️ Wykryto ${collisions.length} kolizji (przebadano ${totalChecked} modułów):</div>
${collisions.join('<br>')}
<div style="margin-top: 10px; color: #94a3b8; font-size: 11px;">Sprawdź geometrię, pozycję osprzętu i odstępy montażowe elementów.</div>`;
          }

          const rawList = Array.isArray(res.rawList) ? res.rawList : collisions.map(c => c.replace(/<[^>]*>/g, ''));
          lastCollisionReportText = `=== RAPORT OVERLAPINGU MODUŁÓW (DEV MODE) ===
Data: ${new Date().toLocaleString('pl-PL')}
Konfiguracja: ${configStr}
Kąt wału korbowego: ${crankAngleDeg}° (0-720°)
Zbadano obiektów: ${totalChecked}
Status: Wykryto ${collisions.length} kolizji

Wykryte kolizje:
${rawList.join('\n')}
`;
          if (copyOverlapBtn) copyOverlapBtn.disabled = false;
        } else {
          if (devStatusBadge) {
            devStatusBadge.className = "dev-badge ok";
            devStatusBadge.textContent = "0 kolizji (OK)";
          }
          if (resultsDiv) {
            resultsDiv.innerHTML = `
<div style="margin-bottom: 4px; font-size: 11px; color: #f59e0b;">
  📍 Kąt wału: <b>${crankAngleDeg}°</b> (0-720°)
</div>
<div style="color: #34d399; font-weight: bold;">✓ Brak kolizji między modułami!</div>
<div style="margin-top: 6px; color: #94a3b8; font-size: 11px;">
  Przeanalizowano <b>${totalChecked}</b> modułów silnika i podwozia pod kątem OBB (Oriented Bounding Box).
  Wszystkie elementy zachowują odpowiednie luzy montażowe.
</div>`;
          }

          lastCollisionReportText = `=== RAPORT OVERLAPINGU MODUŁÓW (DEV MODE) ===
Data: ${new Date().toLocaleString('pl-PL')}
Konfiguracja: ${configStr}
Kąt wału korbowego: ${crankAngleDeg}° (0-720°)
Zbadano obiektów: ${totalChecked}
Status: BRAK KOLIZJI (Układ w 100% poprawny geometrycznie)
`;
          if (copyOverlapBtn) copyOverlapBtn.disabled = false;
        }
      });
    }

    // Kopiowanie raportu do schowka
    if (copyOverlapBtn) {
      copyOverlapBtn.addEventListener("click", async () => {
        if (!lastCollisionReportText) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(lastCollisionReportText);
          } else {
            const ta = document.createElement("textarea");
            ta.value = lastCollisionReportText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
          }
          const originalHTML = copyOverlapBtn.innerHTML;
          copyOverlapBtn.classList.add("copied");
          copyOverlapBtn.innerHTML = "<span>✓ Skopiowano!</span>";
          setTimeout(() => {
            copyOverlapBtn.classList.remove("copied");
            copyOverlapBtn.innerHTML = originalHTML;
          }, 2200);
        } catch (err) {
          console.error("Błąd kopiowania do schowka:", err);
        }
      });
    }

    // Czyszczenie wyników
    if (clearOverlapBtn) {
      clearOverlapBtn.addEventListener("click", () => {
        if (resultsDiv) {
          resultsDiv.innerHTML = "Kliknij przycisk powyżej, aby przeanalizować scenę 3D pod kątem kolizji i overlapingu modułów.";
        }
        if (devStatusBadge) {
          devStatusBadge.className = "dev-badge info";
          devStatusBadge.textContent = "Gotowy";
        }
        if (copyOverlapBtn) {
          copyOverlapBtn.disabled = true;
        }
        lastCollisionReportText = "";
      });
    }

    // ═══ SPIS CZĘŚCI (KATALOG PODZESPOŁÓW WG KATEGORII) ═══
    const catalogListEl = document.getElementById("dev-parts-catalog-list");
    const totalPartsCountEl = document.getElementById("dev-parts-total-count");
    const partsSearchInput = document.getElementById("dev-parts-search");
    const copyPartsBtn = document.getElementById("dev-copy-parts");

    let lastPartsText = "";

    const renderPartsCatalog = (filterText = "") => {
      if (!catalogListEl || !this.scene3d || !this.scene3d.getPartsCatalog) return;
      const catalog = this.scene3d.getPartsCatalog();
      if (totalPartsCountEl) {
        totalPartsCountEl.textContent = `${catalog.totalCount} szt. (${catalog.uniqueCount} typów)`;
      }

      const q = (filterText || "").toLowerCase().trim();
      let html = "";
      let copyText = `=== KATALOG CZĘŚCI SILNIKA I PODWOZIA ===\nŁącznie: ${catalog.totalCount} elementów (${catalog.uniqueCount} unikalnych typów)\n\n`;

      catalog.categories.forEach(cat => {
        const filteredItems = q ? cat.items.filter(it => it.name.toLowerCase().includes(q)) : cat.items;
        if (filteredItems.length === 0) return;

        const catCount = filteredItems.reduce((sum, it) => sum + it.count, 0);
        copyText += `[${cat.icon} ${cat.name}] (${catCount} szt.):\n`;
        filteredItems.forEach(it => {
          copyText += `  • ${it.count}× ${it.name}\n`;
        });
        copyText += "\n";

        html += `
          <div class="dev-cat-card">
            <div class="dev-cat-header">
              <span>${cat.icon} ${cat.name}</span>
              <span class="dev-part-count">${catCount} szt.</span>
            </div>
            <div class="dev-cat-items">
              ${filteredItems.map(it => `
                <div class="dev-part-row">
                  <span>${it.name}</span>
                  <span class="dev-part-count">${it.count}×</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });

      if (!html) {
        html = `<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 12px;">Brak części pasujących do filtra "${filterText}"</div>`;
      }

      catalogListEl.innerHTML = html;
      lastPartsText = copyText;
    };

    if (partsSearchInput) {
      partsSearchInput.addEventListener("input", (e) => {
        renderPartsCatalog(e.target.value);
      });
    }

    if (copyPartsBtn) {
      copyPartsBtn.addEventListener("click", async () => {
        if (!lastPartsText) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(lastPartsText);
          } else {
            const ta = document.createElement("textarea");
            ta.value = lastPartsText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
          }
          const originalHTML = copyPartsBtn.innerHTML;
          copyPartsBtn.classList.add("copied");
          copyPartsBtn.innerHTML = "<span>✓ Skopiowano!</span>";
          setTimeout(() => {
            copyPartsBtn.classList.remove("copied");
            copyPartsBtn.innerHTML = originalHTML;
          }, 2000);
        } catch (err) {
          console.error("Błąd kopiowania spisu części:", err);
        }
      });
    }

    // Przeładowanie strony (Reload)
    const reloadPageBtn = document.getElementById("dev-reload-page");
    if (reloadPageBtn) {
      reloadPageBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }
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
    const data = this.t.parts[currentPartId];
    if (!data) return;

    document.getElementById("drawer-title").textContent = data.name;
    document.getElementById("drawer-principle").textContent = data.principle;
    document.getElementById("drawer-why").textContent = data.why;
    document.getElementById("drawer-history").textContent = data.history;
    document.getElementById("drawer-examples").textContent = data.examples;

    const specs = calculateSpecs(this.config);
    document.getElementById("drawer-hp").textContent = `${specs.hp} KM`;
    document.getElementById("drawer-torque").textContent = `${specs.torque} Nm`;
    document.getElementById("drawer-weight").textContent = `${specs.weight} kg`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
