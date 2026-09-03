/**
 * Cars-operating-principles - Lekki, proceduralny silnik schematów 2D (Canvas)
 * Czysta matematyka i renderowanie wektorowe bez zewnętrznych bibliotek.
 */

export class SchematicRenderer {
  [key: string]: any;

  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.angle = 0;
    this.rpm = 1200;
    this.isRunning = true;
    this.currentMode = "block"; // block, suspension, drivetrain
    this.currentConfig = null;
    this.lastTime = performance.now();

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 400;
    this.height = Math.min(360, Math.max(260, rect.width * 0.55));
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform?.() || this.ctx.scale(1, 1);
    this.ctx.scale(dpr, dpr);
  }

  setConfig(config, activeCategory = "block") {
    this.currentConfig = config;
    this.currentMode = activeCategory;
  }

  setRpm(rpm) {
    this.rpm = rpm;
  }

  togglePlay() {
    this.isRunning = !this.isRunning;
    return this.isRunning;
  }

  loop(time) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    if (this.isRunning) {
      const speed = (this.rpm / 60) * Math.PI * 2; // radians/sec
      this.angle = (this.angle + speed * dt) % (Math.PI * 4); // 720 deg for 4-stroke
    }

    this.render();
    requestAnimationFrame(this.loop);
  }

  render() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    // Tło siatki inżynieryjnej
    this.drawGrid();

    if (this.currentMode === "suspension") {
      this.drawSuspension();
    } else if (this.currentMode === "drivetrain") {
      this.drawDrivetrain();
    } else {
      this.drawEngineCycle();
    }
  }

  drawGrid() {
    const { ctx, width, height } = this;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  drawEngineCycle() {
    const { ctx, width, height } = this;
    const config = this.currentConfig || { block: "block_i4", valvetrain: "valve_dohc", aspiration: "asp_na" };
    const cx = width / 2;
    const cy = height * 0.65;
    const strokePhase = this.angle % (Math.PI * 4); // 0 do 4PI (720 deg)

    // Wyznaczenie suwu (4-suw): 1. Ssanie, 2. Sprężanie, 3. Praca (Zapłon), 4. Wydech
    let phaseName = "1. SSANIE (Intake)";
    let phaseColor = "rgba(0, 180, 255, 0.25)";
    let valveInOpen = false;
    let valveExOpen = false;
    let isFiring = false;

    if (strokePhase < Math.PI) {
      phaseName = "1. SSANIE";
      phaseColor = "rgba(40, 150, 255, 0.25)";
      valveInOpen = true;
    } else if (strokePhase < Math.PI * 2) {
      phaseName = "2. SPRĘŻANIE";
      phaseColor = "rgba(255, 200, 50, 0.2)";
    } else if (strokePhase < Math.PI * 3) {
      phaseName = "3. PRACA (ZAPŁON)";
      phaseColor = "rgba(255, 70, 30, 0.4)";
      isFiring = strokePhase < Math.PI * 2.3;
    } else {
      phaseName = "4. WYDECH";
      phaseColor = "rgba(180, 180, 180, 0.25)";
      valveExOpen = true;
    }

    // Parametry korbowodu i tłoka
    const crankR = 32;
    const rodL = 80;
    const crankAngle = this.angle % (Math.PI * 2);
    
    // Kąt cylindrów w zależności od wybranego bloku
    let bankAngle = 0;
    if (config.block === "block_v6" || config.block === "block_v8") bankAngle = 0.52; // ~60/90 deg
    if (config.block === "block_boxer4") bankAngle = Math.PI / 2; // 180 deg

    // Rysowanie cylindra
    this.drawCylinder(cx, cy, crankR, rodL, crankAngle, bankAngle, phaseColor, valveInOpen, valveExOpen, isFiring, config);
    if (bankAngle > 0) {
      this.drawCylinder(cx, cy, crankR, rodL, crankAngle + Math.PI, -bankAngle, "rgba(255,255,255,0.05)", false, false, false, config);
    }

    // Info o fazie pracy
    ctx.fillStyle = "#a0aec0";
    ctx.font = "12px monospace";
    ctx.fillText(`CYKL: ${phaseName}`, 16, 24);
    ctx.fillText(`KĄT WAŁU: ${Math.round((this.angle * 180 / Math.PI) % 720)}°`, 16, 42);
    if (config.valvetrain === "valve_vtec" && this.rpm > 5500) {
      ctx.fillStyle = "#ff0055";
      ctx.fillText("⚡ VTEC ENGAGED (High Lift Cam)", 16, 60);
    }
  }

  drawCylinder(cx, cy, crankR, rodL, crankAngle, angleOffset, chamberColor, vIn, vEx, firing, config) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleOffset);

    // Pozycja sworznia korbowego
    const pinX = Math.sin(crankAngle) * crankR;
    const pinY = -Math.cos(crankAngle) * crankR;

    // Pozycja tłoka (uproszczona kinematyka)
    const pistonY = pinY - Math.sqrt(rodL * rodL - pinX * pinX);

    // Cylinder ścianki
    const cylW = 60;
    const cylH = 110;
    const topY = -rodL - crankR - 25;

    ctx.fillStyle = chamberColor;
    ctx.fillRect(-cylW / 2, topY, cylW, Math.abs(topY - pistonY));

    ctx.strokeStyle = "#4a5568";
    ctx.lineWidth = 3;
    ctx.strokeRect(-cylW / 2, topY, cylW, cylH);

    // Iskra zapłonowa
    if (firing) {
      ctx.fillStyle = "#fffa65";
      ctx.beginPath();
      ctx.arc(0, topY + 4, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Zawory
    const vOffsetIn = vIn ? 6 : 0;
    const vOffsetEx = vEx ? 6 : 0;
    ctx.fillStyle = vIn ? "#38bdf8" : "#94a3b8";
    ctx.fillRect(-18, topY - 8 + vOffsetIn, 12, 4); // Ssący
    ctx.fillStyle = vEx ? "#f87171" : "#94a3b8";
    ctx.fillRect(6, topY - 8 + vOffsetEx, 12, 4);   // Wydechowy

    // Tłok
    const pW = 56;
    const pH = 30;
    ctx.fillStyle = "#e2e8f0";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-pW / 2, pistonY - pH / 2, pW, pH, 4);
    ctx.fill();
    ctx.stroke();

    // Korbowód
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, pistonY);
    ctx.lineTo(pinX, pinY);
    ctx.stroke();

    // Wał korbowy (wykorbienie)
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(pinX, pinY);
    ctx.stroke();

    // Główny czop
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawSuspension() {
    const { ctx, width, height } = this;
    const cx = width / 2;
    const cy = height * 0.55;
    const config = this.currentConfig || { suspension: "susp_wishbone" };
    const bounce = Math.sin(this.angle * 2) * 14;

    ctx.fillStyle = "#a0aec0";
    ctx.font = "12px monospace";
    ctx.fillText(`UKŁAD: ${config.suspension.toUpperCase()}`, 16, 24);

    if (config.suspension === "susp_leaf") {
      // Resor piórowy + sztywna belka
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Łuk resoru
      ctx.ellipse(cx, cy + 20 + bounce, 120, 24 + bounce * 0.3, 0, 0, Math.PI);
      ctx.stroke();

      // Sztywna belka mostu
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 100, cy + 25 + bounce);
      ctx.lineTo(cx + 100, cy + 25 + bounce);
      ctx.stroke();

      // Koła
      this.drawWheel(cx - 100, cy + 25 + bounce, 0);
      this.drawWheel(cx + 100, cy + 25 + bounce, 0);
    } else {
      // Niezależne (Podwójne wahacze / MacPherson)
      const camber = (config.suspension === "susp_wishbone") ? (bounce * 0.02) : (bounce * 0.05);

      // Rama
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 30, cy - 60, 60, 100);

      // Wahacze
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      // Górny wahacz
      ctx.beginPath();
      ctx.moveTo(cx + 25, cy - 20);
      ctx.lineTo(cx + 80, cy - 20 + bounce * 0.6);
      ctx.stroke();
      // Dolny wahacz
      ctx.beginPath();
      ctx.moveTo(cx + 25, cy + 30);
      ctx.lineTo(cx + 85, cy + 30 + bounce);
      ctx.stroke();

      // Amortyzator
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + 40, cy - 50);
      ctx.lineTo(cx + 80, cy + 25 + bounce);
      ctx.stroke();

      // Koło ze zmiennym kątem (camber)
      this.drawWheel(cx + 90, cy + 10 + bounce, camber);
    }
  }

  drawDrivetrain() {
    const { ctx, width, height } = this;
    const cx = width / 2;
    const cy = height / 2;
    const config = this.currentConfig || { drivetrain: "drive_rwd" };

    ctx.fillStyle = "#a0aec0";
    ctx.font = "12px monospace";
    ctx.fillText(`NAPĘD: ${config.drivetrain.toUpperCase()}`, 16, 24);

    // Obrys podwozia
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 50, cy - 90, 100, 180);

    // Silnik (z przodu)
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(cx - 20, cy - 80, 40, 45);

    // Koła
    this.drawChassisWheel(cx - 65, cy - 60);
    this.drawChassisWheel(cx + 55, cy - 60);
    this.drawChassisWheel(cx - 65, cy + 50);
    this.drawChassisWheel(cx + 55, cy + 50);

    // Wały napędowe w zależności od wybranego napędu
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;

    if (config.drivetrain === "drive_fwd") {
      ctx.beginPath();
      ctx.moveTo(cx - 55, cy - 60);
      ctx.lineTo(cx + 55, cy - 60);
      ctx.stroke();
    } else if (config.drivetrain === "drive_rwd") {
      // Wał centralny + tylny most
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.lineTo(cx, cy + 50);
      ctx.moveTo(cx - 55, cy + 50);
      ctx.lineTo(cx + 55, cy + 50);
      ctx.stroke();
    } else {
      // AWD (Przód + Tył + Centralny)
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.lineTo(cx, cy + 50);
      ctx.moveTo(cx - 55, cy - 60);
      ctx.lineTo(cx + 55, cy - 60);
      ctx.moveTo(cx - 55, cy + 50);
      ctx.lineTo(cx + 55, cy + 50);
      ctx.stroke();
    }
  }

  drawWheel(x, y, angle) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.fillRect(-8, -35, 16, 70);
    ctx.strokeRect(-8, -35, 16, 70);
    ctx.restore();
  }

  drawChassisWheel(x, y) {
    const { ctx } = this;
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, 12, 28);
    ctx.strokeRect(x, y, 12, 28);
  }
}

