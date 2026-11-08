/**
 * scripts/inspect_3d.js
 * Narzędzie automatycznej weryfikacji wizualnej 3D dla AI i deweloperów.
 * Uruchamia bezgłową przeglądarkę Puppeteer, ustawia kamerę na podzespół,
 * wykonuje zrzut ekranu i sprawdza kolizje OBB oraz błędy konsoli.
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : defaultValue;
}

const focus = getArg('focus', 'drivetrain'); // 'engine', 'drivetrain', 'car'
const gearbox = getArg('gearbox', null);
const outputName = getArg('output', `temp/inspect_${focus}.png`);
const outputPath = path.resolve(process.cwd(), outputName);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

let browserInstance = null;

const cleanupBrowser = async () => {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (_) {}
    browserInstance = null;
  }
};

process.on('SIGINT', async () => {
  await cleanupBrowser();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await cleanupBrowser();
  process.exit(143);
});

(async () => {
  console.log(`[Inspekcja 3D] Rozpoczynam (Focus: ${focus}, Gearbox: ${gearbox || 'default'})...`);
  
  try {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-background-timer-throttling'
      ]
    });

    const page = await browserInstance.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
        errors.push(`[Console Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => errors.push(`[Page Error] ${err.message}`));

    await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    // Ustawienie konfiguracji i kamery
    const report = await page.evaluate(async (f, gb) => {
      const app = window.app;
      if (!app || !app.scene3d) {
        return { error: 'Aplikacja 3D nie została zainicjalizowana (brak window.app.scene3d)' };
      }

      if (gb) {
        app.scene3d.config.gearboxPreset = gb;
        app.scene3d.rebuildFullCar();
      }

      if (typeof app.scene3d.setFocusMode === 'function') {
        app.scene3d.setFocusMode(f);
      } else if (typeof app.scene3d.setFocus === 'function') {
        app.scene3d.setFocus(f);
      }
      
      // Specjalne ustawienia kamery dla szczegółowego widoku skrzyni biegów
      if (f === 'gearbox' || f === 'drivetrain') {
        app.scene3d.controls.target.set(0, 0.2, 0.4);
        app.scene3d.camera.position.set(1.2, 0.8, 1.2);
        app.scene3d.controls.update();
      }

      // Sprawdzenie kolizji OBB
      const overlap = app.scene3d.telemetry ? app.scene3d.telemetry.checkOverlap() : { collisions: [] };

      return {
        success: true,
        fps: app.scene3d.fps,
        collisions: overlap.collisions || [],
        totalChecked: overlap.totalChecked || 0,
        config: app.scene3d.config
      };
    }, focus, gearbox);

    // Poczekaj na wyrenderowanie 2 klatek
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: outputPath, type: 'png' });

    console.log(`\n[Inspekcja 3D] Zrzut ekranu zapisany: ${outputPath}`);
    console.log(`[Inspekcja 3D] Raport:`);
    console.log(`   - Status: ${report.success ? 'OK' : 'Blad'}`);
    if (report.error) {
      console.log(`   - Szczegoly bledu: ${report.error}`);
    }
    console.log(`   - Zbadano podzespolow: ${report.totalChecked || 0}`);
    console.log(`   - Wykryte kolizje OBB: ${report.collisions ? report.collisions.length : 0}`);
    if (report.collisions && report.collisions.length > 0) {
      report.collisions.slice(0, 5).forEach(c => console.log(`     Kolizja: ${c.replace(/<[^>]*>/g, '')}`));
    }
    if (errors.length > 0) {
      console.log(`   - Bledy konsoli (${errors.length}):`);
      errors.forEach(e => console.log(`     Blad: ${e}`));
    } else {
      console.log(`   - Bledy konsoli: 0 (Czysto)`);
    }

    await cleanupBrowser();
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('[Inspekcja 3D] Blad krytyczny:', err);
    await cleanupBrowser();
    process.exit(1);
  } finally {
    await cleanupBrowser();
  }
})();
