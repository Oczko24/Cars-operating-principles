/**
 * Cars-operating-principles: Crankshaft Kinematics & Phasing Solver
 * Moduł hybrydowego wyznaczania geometrii wału korbowego, kolejności zapłonu
 * oraz edukacyjnej diagnostyki wyważenia masowego.
 */

/**
 * Baza sprawdzonych inżynieryjnych wzorców zapłonu z bogatym opisem edukacyjnym.
 */
export const CRANK_PRESETS = {
  "Inline_2": {
    name: "R2 Crossplane 270°",
    firingAngles: [0, 270],
    description: "Wał o przesunięciu 270° (np. Yamaha CP2 w MT-07, Triumph Scrambler, Honda Africa Twin). Przesunięcie to eliminuje nakładanie się momentu bezwładnościowego mas wirujących, dając płynne oddawanie mocy i dźwięk zbliżony do V90°.",
    technicalNote: "Interwał zapłonów: 270° - 450°. Zapewnia doskonałą trakcję koła tylnego."
  },
  "Inline_3": {
    name: "R3 120° Even-Fire",
    firingAngles: [0, 240, 480],
    description: "Klasyczny wał 3-cylindrowy z czopami co 120° (np. Triumph Triple, Ford 1.0 EcoBoost). Zapewnia równy zapłon co 240° obrotu wału.",
    technicalNote: "Siły I i II rzędu są zrównoważone, lecz powstaje moment przechylający (rocking couple), wymagający wałka wyrównoważającego."
  },
  "Inline_4": {
    name: "R4 Flat-Plane 180° (1-3-4-2)",
    firingAngles: [0, 540, 180, 360],
    description: "Najpopularniejszy układ na świecie (np. Honda Civic, VW Golf). Skrajne czopy (1-4) są w fazie 0°, a środkowe (2-3) w fazie 180°. Kolejność zapłonu 1-3-4-2 co 180°.",
    technicalNote: "Siły I rzędu idealnie znoszą się w parach. Siły II rzędu (przyspieszenia tłoków) sumują się przy 2x RPM, co wywołuje charakterystyczne mrowienie."
  },
  "Inline_5": {
    name: "R5 72° Even-Fire (1-2-4-5-3)",
    firingAngles: [0, 144, 576, 288, 432],
    description: "Legendarny układ z rajdowej grupy B i aut sportowych (Audi Quattro 2.2/2.5 TFSI, Volvo T5). Kąt wykorbień 72° daje unikalny gang i zapłon co 144°.",
    technicalNote: "Kolejność 1-2-4-5-3 zapewnia ciągłe zachodzenie na siebie suwów pracy, dając niezwykłą elastyczność silnika."
  },
  "Inline_6": {
    name: "R6 120° Lustrzany (1-5-3-6-2-4)",
    firingAngles: [0, 480, 240, 600, 120, 360],
    description: "Arystokracja inżynierii spalinowej (BMW M3, Toyota Supra 2JZ). Wał jest w pełni symetryczny (1-6, 2-5, 3-4 z czopami co 120°). Zapłon co 120°.",
    technicalNote: "Natywna, matematyczna perfekcja: siły i momenty I oraz II rzędu wynoszą DOKŁADNIE ZERO bez żadnych wałków wyrównoważających!"
  },
  "V_8_crossplane": {
    name: "V8 Crossplane 90° (Krzyżowy)",
    firingAngles: [0, 540, 270, 90, 630, 450, 360, 180],
    description: "Ikona amerykańskiej i niemieckiej motoryzacji (Ford Mustang GT, Chevrolet Corvette, Mercedes-AMG V8). Czopy rozmieszczone są w 4 płaszczyznach co 90°.",
    technicalNote: "Wymaga masywnych przeciwciężarów, ale całkowicie eliminuje wibracje I i II rzędu, generując słynny, nieregularny bulgot w wydechu."
  },
  "V_8_flatplane": {
    name: "V8 Flat-Plane 180° (Płaski)",
    firingAngles: [0, 90, 180, 270, 360, 450, 540, 630],
    description: "Wyścigowy układ supersamochodów (Ferrari 458 Italia, Ford Mustang Shelby GT350, Corvette C8 Z06). Wał działa jak dwa połączone silniki R4.",
    technicalNote: "Brak ciężkich przeciwciężarów pozwala wkręcać się na 9000 RPM w ułamku sekundy. Kosztem są silne wibracje drugiego rzędu."
  },
  "V_10": {
    name: "V10 72° Even-Fire",
    firingAngles: [0, 144, 288, 432, 576, 72, 216, 360, 504, 648],
    description: "Dźwięk bolidów F1 lat 90./00. oraz supersamochodów (Lexus LFA, Audi R8, Lamborghini Huracán). Zapłon co 72°.",
    technicalNote: "W silnikach V90° (np. Dodge Viper) stosuje się czopy dzielone (split-pin o przesunięciu 18°), by utrzymać równy interwał 72°."
  },
  "V_12": {
    name: "V12 60° (Dwa połączone L6)",
    firingAngles: [0, 60, 240, 300, 480, 540, 120, 180, 360, 420, 600, 660],
    description: "Szczyt luksusu i aksamitnej kultury pracy (Ferrari, Aston Martin, Rolls-Royce). Dwa idealnie wyważone rzędy R6 złączone wspólnym wałem. Zapłon co 60°.",
    technicalNote: "Praca jest tak gładka, że na pracującym silniku V12 można postawić monetę na krawędzi bez jej przewrócenia."
  },
  "Boxer_4": {
    name: "Boxer 4 (H4) 180°",
    firingAngles: [0, 360, 180, 540],
    description: "Klasyk Subaru i Porsche (Impreza WRX STI, Porsche 718 Cayman). Każdy przeciwległy tłok ma własny czop przesunięty o 180°.",
    technicalNote: "Tłoki poruszają się w stronę środka i na zewnątrz jednocześnie, co idealnie neutralizuje siły I i II rzędu. Niski środek ciężkości."
  },
  "Boxer_6": {
    name: "Boxer 6 (H6) 180°",
    firingAngles: [0, 480, 240, 600, 120, 360],
    description: "Serce Porsche 911 od 1963 roku. Połączenie zalet płaskiego układu przeciwsobnego i 6 cylindrów z zapłonem co 120°.",
    technicalNote: "Perfekcyjny balans masowy w każdej płaszczyźnie, zero sił i momentów resztkowych, fenomenalna reakcja na gaz."
  }
};

/**
 * Rozwiązuje kolejność i kąty fazowe zapłonu (w stopniach 0-720°) dla konfiguracji silnika.
 */
export function resolveFiringSequence(config) {
  const { layout, cylinders: N, stroke = 4, v8CrankType = 'crossplane', customOverride, customFiringAngles } = config;
  const cycleDeg = stroke === 2 ? 360 : 720;

  // 1. Warstwa 1: Custom Override (Tryb Użytkownika)
  if (customOverride && Array.isArray(customFiringAngles) && customFiringAngles.length === N) {
    return customFiringAngles.map(angle => ((angle % cycleDeg) + cycleDeg) % cycleDeg);
  }

  // 2. Warstwa 2: Baza Wzorców Inżynieryjnych (Engineered Presets)
  let presetKey = `${layout}_${N}`;
  if (layout === "V" && N === 8) {
    presetKey = `V_8_${v8CrankType === 'flatplane' ? 'flatplane' : 'crossplane'}`;
  }

  if (CRANK_PRESETS[presetKey]) {
    const preset = CRANK_PRESETS[presetKey].firingAngles;
    if (stroke === 2) {
      return preset.map(a => a / 2);
    }
    return [...preset];
  }

  // 3. Warstwa 3: Deterministyczny Fallback Even-Fire (np. V7, L11)
  const deltaGamma = cycleDeg / N;
  const fallbackAngles = [];

  if (layout === "Boxer") {
    for (let i = 0; i < N; i++) {
      const pairFiring = Math.floor(i / 2) * deltaGamma;
      const offset = (i % 2 === 0) ? 0 : (cycleDeg / 2);
      fallbackAngles.push((pairFiring + offset) % cycleDeg);
    }
  } else {
    for (let i = 0; i < N; i++) {
      fallbackAngles.push((i * deltaGamma) % cycleDeg);
    }
  }

  return fallbackAngles;
}

/**
 * Rozwiązuje kąty wykorbień (Crankpin Angles) w radianach (0 do 2PI) dla każdego cylindra.
 */
export function resolveCrankPinAngles(config, bankAngles) {
  const { cylinders: N, customOverride, customCrankPins } = config;
  const firingAnglesDeg = resolveFiringSequence(config);

  const pins = [];
  for (let i = 0; i < N; i++) {
    const bank = bankAngles ? bankAngles[i] : 0;
    if (customOverride && Array.isArray(customCrankPins) && customCrankPins[i] !== undefined) {
      // Bezpośredni kąt wykorbienia czopa w radianach
      pins.push((customCrankPins[i] * Math.PI / 180) % (Math.PI * 2));
    } else {
      // Formuła deterministyczna: phi_i = gamma_i + bank_i
      const firingRad = (firingAnglesDeg[i] * Math.PI) / 180;
      pins.push((firingRad + bank) % (Math.PI * 2));
    }
  }
  return pins;
}

/**
 * Dokonuje rygorystycznej analizy wyważenia masowego i generuje edukacyjne komunikaty diagnostyczne.
 */
export function analyzeEngineBalance(cylinderConfigs, config) {
  if (!cylinderConfigs || cylinderConfigs.length === 0) {
    return {
      status: "info",
      primaryForce: 0,
      secondaryForce: 0,
      rockingMoment: 0,
      title: "Brak danych cylindrów",
      message: "Zbuduj silnik, aby ocenić wyważenie.",
      recommendation: ""
    };
  }

  const N = cylinderConfigs.length;
  const zCoords = cylinderConfigs.map(c => c.z);
  const zMid = (Math.max(...zCoords) + Math.min(...zCoords)) / 2;

  // Całkowanie po 72 krokach obrotu wału (0 do 2PI)
  let maxF1 = 0;
  let maxF2 = 0;
  let maxM1 = 0;

  const steps = 72;
  for (let s = 0; s < steps; s++) {
    const theta = (s / steps) * Math.PI * 2;
    let sumF1X = 0, sumF1Y = 0;
    let sumF2X = 0, sumF2Y = 0;
    let sumM1X = 0, sumM1Y = 0;

    cylinderConfigs.forEach(cfg => {
      // Kąt w układzie odniesienia cylindra
      const alpha = theta - cfg.crankPinAngle + cfg.bank;
      const armZ = cfg.z - zMid;

      // Siła I rzędu (cos alpha)
      const f1 = Math.cos(alpha);
      const f1X = f1 * -Math.sin(cfg.bank);
      const f1Y = f1 * Math.cos(cfg.bank);

      // Siła II rzędu (cos 2*alpha)
      const f2 = Math.cos(2 * alpha) * 0.25; // uwzględniając lambda ~ 0.25
      const f2X = f2 * -Math.sin(cfg.bank);
      const f2Y = f2 * Math.cos(cfg.bank);

      sumF1X += f1X; sumF1Y += f1Y;
      sumF2X += f2X; sumF2Y += f2Y;

      sumM1X += f1Y * armZ;
      sumM1Y += f1X * armZ;
    });

    const totalF1 = Math.sqrt(sumF1X * sumF1X + sumF1Y * sumF1Y);
    const totalF2 = Math.sqrt(sumF2X * sumF2X + sumF2Y * sumF2Y);
    const totalM1 = Math.sqrt(sumM1X * sumM1X + sumM1Y * sumM1Y);

    if (totalF1 > maxF1) maxF1 = totalF1;
    if (totalF2 > maxF2) maxF2 = totalF2;
    if (totalM1 > maxM1) maxM1 = totalM1;
  }

  // Normalizacja do 1 cylindra
  const normF1 = maxF1 / N;
  const normF2 = maxF2 / N;
  const normM1 = maxM1;

  const isF1Zero = normF1 < 0.02;
  const isF2Zero = normF2 < 0.02;
  const isM1Zero = normM1 < 0.04;

  let status = "balanced";
  let title = "Układ Zrównoważony";
  let message = "Siły masowe I i II rzędu oraz momenty zginające są zredukowane.";
  let recommendation = "Silnik cechuje się dobrą kulturą pracy.";

  if (isF1Zero && isF2Zero && isM1Zero) {
    status = "perfect";
    title = "🌟 Perfekcyjny Balans (Złoty Standard)";
    message = "Wszystkie wektory sił I i II rzędu znoszą się wzajemnie.";
    recommendation = "Przykład: R6, V12 lub Boxer 6 – najwyższa kultura pracy w motoryzacji.";
  } else if (isF1Zero && isM1Zero && !isF2Zero) {
    status = "warning-secondary";
    title = "⚡ Drgania Wtórne (Siły II Rzędu)";
    message = `Siły I rzędu zneutralizowane, lecz powstaje wypadkowa siła II rzędu (${(normF2 * 100).toFixed(1)}%).`;
    recommendation = "Cechuje to silniki R4 i V8 Flat-Plane – w autach cywilnych wymaga wałków Lanchester kręcących się z 2x RPM.";
  } else if (isF1Zero && !isM1Zero) {
    status = "warning-moment";
    title = "🔄 Moment Kiwający (Rocking Couple)";
    message = "Wypadkowa sił wynosi zero, lecz powstaje moment obrotowy przechylający silnik wzdłuż osi Z.";
    recommendation = "Dostosuj przeciwległe czopy skrajne (symetria lustrzana) lub dodaj wałek wyrównoważający (np. w R3 / R5).";
  } else if (!isF1Zero) {
    status = "error-primary";
    title = "⚠️ Niezrównoważone Siły I Rzędu";
    message = `Wykryto silną wypadkową siłę poprzeczną/pionową I rzędu (${(normF1 * 100).toFixed(1)}%).`;
    recommendation = "Przesuń czopy na tarczy, aby uzyskać symetrię kątową (np. rozstaw co 360°/N lub przeciwsobne pary).";
  }

  return {
    status,
    title,
    message,
    recommendation,
    metrics: {
      f1Score: normF1,
      f2Score: normF2,
      momentScore: normM1
    }
  };
}

/**
 * Klasa interaktywnej tarczy biegunowej (Radial UI 360°) do manualnego strojenia czopów.
 */
export class RadialCrankUI {
  constructor(canvasElement, onUpdateCallback) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onUpdate = onUpdateCallback || (() => {});
    
    this.cylinderAngles = [0, 180, 180, 0]; // Domyślnie R4
    this.draggedIndex = -1;
    this.isDragging = false;
    this.snapToGrid = false;
    this.rafId = null;

    // Paleta kolorystyczna cylindrów
    this.colors = [
      '#38bdf8', '#f43f5e', '#10b981', '#fbbf24',
      '#a855f7', '#06b6d4', '#f97316', '#ec4899',
      '#84cc16', '#6366f1', '#14b8a6', '#e11d48',
      '#8b5cf6', '#d946ef', '#0ea5e9', '#22c55e'
    ];

    this.initEvents();
    this.render();
  }

  setAngles(angles) {
    this.cylinderAngles = angles.map(a => ((a % 360) + 360) % 360);
    this.render();
  }

  setCylinderCount(count, defaultAngles) {
    if (defaultAngles && defaultAngles.length === count) {
      this.cylinderAngles = [...defaultAngles];
    } else {
      const step = 360 / Math.max(1, count);
      this.cylinderAngles = Array.from({ length: count }, (_, i) => Math.round((i * step) % 360));
    }
    this.render();
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.canvas.width / rect.width),
        y: (clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };

    const handlePointerDown = (e) => {
      const { x, y } = getPos(e);
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const radius = this.canvas.width * 0.38;

      let nearestIdx = -1;
      let minDistance = 24; // promień chwytania węzła

      this.cylinderAngles.forEach((deg, idx) => {
        const rad = (deg - 90) * Math.PI / 180;
        const nx = cx + radius * Math.cos(rad);
        const ny = cy + radius * Math.sin(rad);
        const d = Math.hypot(x - nx, y - ny);
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = idx;
        }
      });

      if (nearestIdx !== -1) {
        this.draggedIndex = nearestIdx;
        this.isDragging = true;
        e.preventDefault();
      }
    };

    const handlePointerMove = (e) => {
      if (!this.isDragging || this.draggedIndex === -1) return;
      const { x, y } = getPos(e);
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;

      // Wyznaczenie kąta względem góry (0° na szczycie = TDC)
      let angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
      angle = ((angle % 360) + 360) % 360;

      if (this.snapToGrid) {
        angle = Math.round(angle / 15) * 15;
      } else {
        angle = Math.round(angle);
      }

      this.cylinderAngles[this.draggedIndex] = angle;

      // Throttling przez requestAnimationFrame dla 60 FPS
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => {
          this.render();
          this.onUpdate([...this.cylinderAngles]);
          this.rafId = null;
        });
      }
    };

    const handlePointerUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.draggedIndex = -1;
        this.render();
        this.onUpdate([...this.cylinderAngles]);
      }
    };

    this.canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  }

  render() {
    const { ctx } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.38;

    ctx.clearRect(0, 0, w, h);

    // Tło tarczy
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.47, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Okręgi pomocnicze
    [0.2, 0.38, 0.46].forEach(rRatio => {
      ctx.strokeStyle = rRatio === 0.38 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = rRatio === 0.38 ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, w * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Linie kątowe (podziałka co 45°)
    for (let deg = 0; deg < 360; deg += 45) {
      const rad = (deg - 90) * Math.PI / 180;
      ctx.strokeStyle = (deg % 90 === 0) ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = (deg % 90 === 0) ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * 1.18 * Math.cos(rad), cy + radius * 1.18 * Math.sin(rad));
      ctx.stroke();

      // Etykiety kątów (0°, 90°, 180°, 270°)
      if (deg % 90 === 0) {
        const lx = cx + radius * 1.22 * Math.cos(rad);
        const ly = cy + radius * 1.22 * Math.sin(rad);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${deg}°`, lx, ly);
      }
    }

    // Środek wału (czop główny)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CRANK', cx, cy);

    // Rysowanie ramion wykorbień i węzłów czopów cylindrów
    this.cylinderAngles.forEach((deg, idx) => {
      const rad = (deg - 90) * Math.PI / 180;
      const color = this.colors[idx % this.colors.length];
      const isSelected = (idx === this.draggedIndex);

      const nx = cx + radius * Math.cos(rad);
      const ny = cy + radius * Math.sin(rad);

      // Ramię wykorbienia (Web)
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Węzeł czopa (Draggable pin)
      ctx.fillStyle = isSelected ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(nx, ny, isSelected ? 12 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Numer cylindra
      ctx.fillStyle = isSelected ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${idx + 1}`, nx, ny);

      // Etykieta kąta obok czopa
      const labelDist = radius + (isSelected ? 22 : 18);
      const lx = cx + labelDist * Math.cos(rad);
      const ly = cy + labelDist * Math.sin(rad);
      ctx.fillStyle = color;
      ctx.font = 'bold 8.5px monospace';
      ctx.fillText(`${deg}°`, lx, ly);
    });
  }
}

