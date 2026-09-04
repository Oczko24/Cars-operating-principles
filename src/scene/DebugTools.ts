import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export let transformControl = null;
export function setupDebugClicker(scene3d) {
    if (!transformControl) {
        transformControl = new TransformControls(scene3d.camera, scene3d.renderer.domElement);
        transformControl.addEventListener('dragging-changed', function (event) {
            scene3d.controls.enabled = !(event as any).value;
        });
        
        transformControl.addEventListener('change', function () {
            if (!transformControl.object || scene3d.controls.enabled) return;
            // Only log if dragging (OrbitControls disabled)
            const targetObj = transformControl.object;
            const name = targetObj.userData?.name || targetObj.name || "Nieznany obiekt";
            const wPos = new THREE.Vector3();
            targetObj.getWorldPosition(wPos);
            let localEnginePos = "N/A";
            if (scene3d.engineMountGroup) {
                const lPos = wPos.clone();
                scene3d.engineMountGroup.worldToLocal(lPos);
                localEnginePos = `X: ${lPos.x.toFixed(3)}, Y: ${lPos.y.toFixed(3)}, Z: ${lPos.z.toFixed(3)}`;
            }
            
            // throttle console logging to not freeze UI
            if (!transformControl.userData) transformControl.userData = {};
            const now = Date.now();
            if (now - (transformControl.userData.lastLogTime || 0) > 100) {
                transformControl.userData.lastLogTime = now;
                const logMsg = `[PRZESUNIĘTO] ${name} | Świat: X=${wPos.x.toFixed(3)}, Y=${wPos.y.toFixed(3)}, Z=${wPos.z.toFixed(3)} | Lokalne: ${localEnginePos}`;
                // update latest log instead of appending if we are dragging continuously?
                window.dispatchEvent(new CustomEvent('inspector-log', { detail: logMsg }));
            }
        });
        scene3d.scene.add(transformControl);
    }

    window.addEventListener('dblclick', (e) => {
      scene3d.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      scene3d.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      scene3d.raycaster.setFromCamera(scene3d.mouse, scene3d.camera);
      const objectsToIntersect = scene3d.carGroup ? [scene3d.carGroup] : scene3d.scene.children;
      const intersects = scene3d.raycaster.intersectObjects(objectsToIntersect, true);
      
      if (intersects.length > 0) {
        // Skip TransformControl parts, GridHelper, and logically hidden objects
        const filtered = intersects.filter((hit: any) => {
            if (hit.object.isTransformControls || hit.object.type === 'GridHelper') return false;
            // Sprawdź widoczność rodziców – Raycaster w Three.js nie dziedziczy visible = false z grupy
            let curr = hit.object;
            while (curr) {
                if (curr.visible === false) return false;
                curr = curr.parent;
            }
            // Zablokowanie raycastingu dla obiektów, które mają to ustawione
            if (hit.object.userData && hit.object.userData.noRaycast) return false;
            return true;
        });
        if (filtered.length > 0) {
            const hit = filtered[0];
            let curr = hit.object;
            let foundName = null;
            while (curr) {
              if (curr.userData && curr.userData.name) {
                foundName = curr.userData.name;
                break;
              }
              curr = curr.parent;
            }
            const name = foundName || hit.object.name || "Nieznany obiekt";
            
            // Attach transform controls
            let targetObj = hit.object;
            if (foundName) {
                // attach to group if group has the name
                let p = targetObj;
                while (p) {
                    if (p.userData && p.userData.name === foundName) {
                        targetObj = p;
                        break;
                    }
                    p = p.parent;
                }
            }
            
            // --- MATEMATYCZNE WYLICZANIE ŚRODKA OBIEKTU ---
            // Żeby obiekt obracał się wokół własnego środka, przesuwamy jego pivot
            if (!targetObj.userData.centered) {
                const worldBox = new THREE.Box3().setFromObject(targetObj);
                const centerWorld = new THREE.Vector3();
                worldBox.getCenter(centerWorld);
                
                // Konwersja na przestrzeń lokalną
                const centerLocal = targetObj.worldToLocal(centerWorld.clone());
                
                // 1. Przesunięcie geometrii, jeśli obiekt ją posiada
                const meshObj = targetObj as THREE.Mesh;
                if (meshObj.isMesh && meshObj.geometry) {
                    meshObj.geometry.translate(-centerLocal.x, -centerLocal.y, -centerLocal.z);
                }
                
                // 2. Przesunięcie pozycji wszystkich dzieci
                targetObj.children.forEach(child => {
                    child.position.sub(centerLocal);
                });
                
                // 3. Rekompensata pozycji samego obiektu w przestrzeni rodzica
                const compensate = centerLocal.clone();
                compensate.multiply(targetObj.scale);
                compensate.applyQuaternion(targetObj.quaternion);
                targetObj.position.add(compensate);
                
                targetObj.userData.centered = true;
            }
            // ----------------------------------------------

            transformControl.attach(targetObj);
            const animKeywords = ["Tłok", "Korbowód", "Wał", "Zawór", "Wałek", "Popychacz", "Sprężyna", "Koło", "Pasek", "Krzywka", "Sworzeń"];
            const isAnimated = animKeywords.some(kw => name.includes(kw));
            if (isAnimated) {
                transformControl.showX = false;
                transformControl.showY = false;
                transformControl.showZ = false;
                // Also warn in log
                const logMsg = `[INFO] Obiekt animowany (${name}) - przeciąganie wyłączone.`;
                window.dispatchEvent(new CustomEvent('inspector-log', { detail: logMsg }));
            } else {
                transformControl.showX = true;
                transformControl.showY = true;
                transformControl.showZ = true;
            }
            
            const wPos = new THREE.Vector3();
            hit.object.getWorldPosition(wPos);
            
            let localEnginePos = "N/A";
            if (scene3d.engineMountGroup) {
              const lPos = wPos.clone();
              scene3d.engineMountGroup.worldToLocal(lPos);
              localEnginePos = `X: ${lPos.x.toFixed(3)}, Y: ${lPos.y.toFixed(3)}, Z: ${lPos.z.toFixed(3)}`;
            }
            
            const logMsg = `[DEBUG KLIK] ${name} | Świat: X=${wPos.x.toFixed(3)}, Y=${wPos.y.toFixed(3)}, Z=${wPos.z.toFixed(3)} | Lokalne: ${localEnginePos}`;
            console.log(logMsg);
            
            // Dispatch custom event for our log console
            window.dispatchEvent(new CustomEvent('inspector-log', { detail: logMsg }));
            window.dispatchEvent(new CustomEvent('part-selected', { detail: { object: targetObj, name: name } }));
        } else {
            transformControl.detach();
        }
      } else {
          transformControl.detach();
      }
    });
}

export function setupDevDrawer(app) {
    const devBtn = document.getElementById("dev-mode-btn");
    const devDrawer = document.getElementById("dev-drawer");
    const devClose = document.getElementById("dev-close-btn");
    const checkOverlapBtn = document.getElementById("dev-check-overlap");
    const copyOverlapBtn = document.getElementById("dev-copy-overlap");
    const clearOverlapBtn = document.getElementById("dev-clear-overlap");
    const devSummaryText = document.getElementById("dev-summary-text");
    const devStatusBadge = document.getElementById("dev-status-badge");
    const resultsDiv = document.getElementById("dev-overlap-results");
    const infoDrawer = document.getElementById("info-drawer");

    const logContainer = document.createElement('div');
    logContainer.style.position = 'relative';
    logContainer.style.marginBottom = '10px';

    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy logs';
    copyBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: rgba(255,255,255,0.2); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;';
    copyBtn.onclick = () => {
        const text = Array.from(logConsole.children).map(c => c.textContent).join('\n');
        navigator.clipboard.writeText(text);
        copyBtn.innerText = 'Copied!';
        setTimeout(() => copyBtn.innerText = 'Copy logs', 2000);
    };

    const logConsole = document.createElement('div');
    logConsole.style.cssText = 'height: 150px; background: rgba(0,0,0,0.8); color: #0f0; font-family: monospace; font-size: 10px; overflow-y: auto; padding: 5px; padding-top: 25px; border: 1px solid #333;';
    logConsole.id = 'inspector-log-console';
    
    logContainer.appendChild(copyBtn);
    logContainer.appendChild(logConsole);
    
    // insert log console before catalog
    const catalogSection = document.querySelector('.dev-catalog-section');
    if (catalogSection) {
        catalogSection.parentNode.insertBefore(logContainer, catalogSection);
    }

    window.addEventListener('inspector-log', (e) => {
        const line = document.createElement('div');
        // @ts-ignore
        line.textContent = e.detail;
        logConsole.appendChild(line);
        logConsole.scrollTop = logConsole.scrollHeight;
    });

    let lastCollisionReportText = "";

    const updateDevSummary = () => {
      if (devSummaryText && app.scene3d && app.scene3d.config) {
        const c = app.scene3d.config;
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
        if (infoDrawer?.classList.contains("open")) {
          infoDrawer.classList.remove("open");
        }
      }
    };

    if (devBtn) {
      devBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDevDrawer(undefined);
      });
    }

    if (devClose) {
      devClose.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDevDrawer(false);
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toggleDevDrawer(false);
        infoDrawer?.classList.remove("open");
      }
    });

    if (checkOverlapBtn) {
      checkOverlapBtn.addEventListener("click", () => {
        updateDevSummary();
        const res = app.scene3d.telemetry.checkOverlap();
        const collisions = Array.isArray(res) ? res : (res.collisions || []);
        const totalChecked = res.totalChecked || 0;
        const cfg = app.scene3d.config;
        const crankAngleDeg = (res.crankAngleDeg !== undefined) ? res.crankAngleDeg : Math.round(((app.scene3d.crankAngle * 180 / Math.PI) % 720 + 720) % 720);

        const configStr = `${cfg.layout} ${cfg.cylinders}-cyl | ${cfg.valves}V | ${cfg.valvetrain || 'OHC'} | Kąt V: ${cfg.vAngle || 0}°\nSpecyfikacja: Napęd: ${cfg.drivetrainLayout || 'RWD'} | Wydech: ${cfg.exhaustPipes === 'dual' ? '2 rury' : '1 rura'} | Położenie: ${cfg.placement || 'front'} ${cfg.orientation || 'longitudinal'}`;

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
          lastCollisionReportText = `=== RAPORT OVERLAPINGU MODUŁÓW (DEV MODE) ===\nData: ${new Date().toLocaleString('pl-PL')}\nKonfiguracja: ${configStr}\nKąt wału korbowego: ${crankAngleDeg}° (0-720°)\nZbadano obiektów: ${totalChecked}\nStatus: Wykryto ${collisions.length} kolizji\n\nWykryte kolizje:\n${rawList.join('\n')}\n`;
          if (copyOverlapBtn) (copyOverlapBtn as any).disabled = false;
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
  Przeanalizowano <b>${totalChecked}</b> modułów silnika i podwozia.
</div>`;
          }
          lastCollisionReportText = `=== RAPORT OVERLAPINGU MODUŁÓW (DEV MODE) ===\nData: ${new Date().toLocaleString('pl-PL')}\nKonfiguracja: ${configStr}\nKąt wału korbowego: ${crankAngleDeg}° (0-720°)\nZbadano obiektów: ${totalChecked}\nStatus: BRAK KOLIZJI\n`;
          if (copyOverlapBtn) (copyOverlapBtn as any).disabled = false;
        }
      });
    }

    if (copyOverlapBtn) {
      copyOverlapBtn.addEventListener("click", async () => {
        if (!lastCollisionReportText) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(lastCollisionReportText);
          } else {
            const ta = document.createElement("textarea");
            (ta as any).value = lastCollisionReportText;
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
        } catch (err) {}
      });
    }

    if (clearOverlapBtn) {
      clearOverlapBtn.addEventListener("click", () => {
        if (resultsDiv) resultsDiv.innerHTML = "Kliknij przycisk powyżej, aby przeanalizować scenę 3D pod kątem kolizji.";
        if (devStatusBadge) {
          devStatusBadge.className = "dev-badge info";
          devStatusBadge.textContent = "Gotowy";
        }
        if (copyOverlapBtn) (copyOverlapBtn as any).disabled = true;
        lastCollisionReportText = "";
      });
    }

    const catalogListEl = document.getElementById("dev-parts-catalog-list");
    const totalPartsCountEl = document.getElementById("dev-parts-total-count");
    const partsSearchInput = document.getElementById("dev-parts-search");
    const copyPartsBtn = document.getElementById("dev-copy-parts");

    let lastPartsText = "";

    const renderPartsCatalog = (filterText = "") => {
      if (!catalogListEl || !app.scene3d || !app.scene3d.telemetry || !app.scene3d.telemetry.getPartsCatalog) return;
      const catalog = app.scene3d.telemetry.getPartsCatalog();
      if (totalPartsCountEl) totalPartsCountEl.textContent = `${catalog.totalCount} szt. (${catalog.uniqueCount} typów)`;

      const q = (filterText || "").toLowerCase().trim();
      let html = "";
      let copyText = `=== KATALOG CZĘŚCI SILNIKA I PODWOZIA ===\nŁącznie: ${catalog.totalCount} elementów (${catalog.uniqueCount} unikalnych typów)\n\n`;

      catalog.categories.forEach(cat => {
        const filteredItems = q ? cat.items.filter(it => it.name.toLowerCase().includes(q)) : cat.items;
        if (filteredItems.length === 0) return;
        const catCount = filteredItems.reduce((sum, it) => sum + it.count, 0);
        copyText += `[${cat.icon} ${cat.name}] (${catCount} szt.):\n`;
        filteredItems.forEach(it => { copyText += `  • ${it.count}× ${it.name}\n`; });
        copyText += "\n";
        html += `
          <div class="dev-cat-card">
            <div class="dev-cat-header"><span>${cat.icon} ${cat.name}</span><span class="dev-part-count">${catCount} szt.</span></div>
            <div class="dev-cat-items">
              ${filteredItems.map(it => `
                <div class="dev-part-row"><span>${it.name}</span><span class="dev-part-count">${it.count}×</span></div>
              `).join('')}
            </div>
          </div>
        `;
      });
      if (!html) html = `<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 12px;">Brak części pasujących do filtra "${filterText}"</div>`;
      catalogListEl.innerHTML = html;
      lastPartsText = copyText;
    };

    if (partsSearchInput) {
      partsSearchInput.addEventListener("input", (e) => renderPartsCatalog((e.target as any).value));
    }

    if (copyPartsBtn) {
      copyPartsBtn.addEventListener("click", async () => {
        if (!lastPartsText) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(lastPartsText);
          } else {
            const ta = document.createElement("textarea");
            (ta as any).value = lastPartsText;
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
        } catch (err) {}
      });
    }

    const reloadPageBtn = document.getElementById("dev-reload-page");
    if (reloadPageBtn) {
      reloadPageBtn.addEventListener("click", () => window.location.reload());
    }
}
