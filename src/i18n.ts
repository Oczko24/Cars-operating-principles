/**
 * Cars-operating-principles - Baza tekstów i wiedzy inżynieryjnej (i18n)
 * Wszystkie teksty, opisy, historia i nazwy części znajdują się w tym pliku.
 */

/**
 * Automatyczna detekcja języka na podstawie preferencji przeglądarki (z priorytetem dla localStorage)
 */
export function detectBrowserLanguage() {
  try {
    const saved = window.localStorage.getItem("lang");
    if (saved === "pl" || saved === "en") {
      return saved;
    }
  } catch (e) {
    // ignore storage access errors
  }

  const browserLangs = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || (navigator as any).userLanguage || "en"];

  for (const lang of browserLangs) {
    if (typeof lang === "string") {
      const code = lang.toLowerCase().trim();
      if (code.startsWith("pl")) {
        return "pl";
      }
      if (code.startsWith("en")) {
        return "en";
      }
    }
  }

  // Domyślny fallback dla pozostałych języków
  return "en";
}

export const i18n = {
  pl: {
    appTitle: "Cars: Operating Principles",
    subtitle: "Edukacyjny Silnik & Samochód 3D",
    
    // UI Badges & Navigation
    sandboxTab: "Garaż & Konfigurator",
    learnTab: "Zasada Działania",
    timelineTab: "Oś Czasu & Historia",
    specTitle: "Kalkulowane Osiągi",
    diagramTitle: "Schemat Proceduralny",
    whyTitle: "Dlaczego tak to działa?",
    historyTitle: "Geneza i historia technologii",
    examplesTitle: "Przykłady modeli i lata stosowania",
    prosTitle: "Zalety",
    consTitle: "Wady",
    rpmControl: "Obroty (RPM)",
    toggleAnimation: "Animacja",
    
    // Metrics
    hpLabel: "Moc szacunkowa",
    torqueLabel: "Moment obrotowy",
    redlineLabel: "Max RPM",
    weightLabel: "Masa zespołu",
    handlingScore: "Balans / Prowadzenie",
    complexityScore: "Złożoność konstrukcji",

    // UI Elements
    ui: {
      brandTitle: "CARS 3D",
      brandSubtitle: "PRO STUDIO",
      fpsBadgeTitle: "Wydajność renderowania",
      langSwitchTitle: "Zmień język (Polski / English)",

      // Główne tryby & Zakładki
      modeConfig: "Konfigurator",
      modeStats: "Statystyki & Osiągi",
      subtabEngine: "Silnik",
      subtabEngineTitle: "Architektura, cylindry i rozrząd",
      subtabAspiration: "Dolot/Wydech",
      subtabAspirationTitle: "Dolot, doładowanie, wydech i montaż",
      subtabCrank: "Wał & Zapłon",
      subtabCrankTitle: "Geometria wału korbowego i zapłon",
      subtabDrivetrain: "Napęd",
      subtabDrivetrainTitle: "Układ napędowy, RPM i skrzynia biegów",
      subtabView: "Widok & Kamera",
      subtabViewTitle: "Narzędzia widoku, przekrój i kamera",

      // Statystyki & Osiągi (Live Engine Specs)
      statsHeader: "Parametry Pracy & Osiągi",
      statsPowerTitle: "Moc szacunkowa",
      statsTorqueTitle: "Moment obrotowy",
      statsPowerPerLiter: "Moc z 1 litra",
      statsPowerToWeight: "Stosunek moc / masa",
      statsWeightTitle: "Masa zespołu",
      statsRedlineTitle: "Max RPM (Redline)",
      statsGeomSection: "Geometria & Kinematyka Tłoka",
      statsDisplacement: "Pojemność całkowita",
      statsUnitDisp: "Pojemność cylindra",
      statsBoreStroke: "Średnica × Skok",
      statsBsRatio: "Wskaźnik Średnica/Skok (B/S)",
      statsMeanPistonSpeed: "Średnia prędkość tłoka",
      statsMaxPistonAccel: "Przyspieszenie tłoka (GMP/DMP)",
      statsBmep: "Średnie ciśnienie użyteczne (BMEP)",
      statsGearsSection: "Prędkości Teoretyczne na Biegach",
      statsColGear: "Bieg",
      statsColRatio: "Przełożenie",
      statsColSpeedRpm: "Prędkość @ RPM",
      statsColSpeedRedline: "Prędkość @ Redline",
      statsBalanceSection: "Kultura Pracy & Wyważenie",
      bsOversquare: "Krótkoskokowy (Nadkwadratowy) • wysokie obroty, niskie tarcie",
      bsSquare: "Kwadratowy • idealny balans elastyczności",
      bsUndersquare: "Długoskokowy (Podkwadratowy) • wysoki moment obrotowy na dole",
      speedSafe: "Bezpieczna (< 15 m/s)",
      speedModerate: "Wysoka (15 - 20 m/s)",
      speedExtreme: "Granica wytrzymałości (> 20 m/s)",

      // 1. Architektura Silnika
      engineArch: "Architektura Silnika",
      cylinderLayout: "Układ cylindrów:",
      layoutInline: "Rzędowy",
      layoutInlineTitle: "Rzędowy (Inline) - najpopularniejszy układ.",
      layoutV: "Widlasty",
      layoutVTitle: "Widlasty (V) - zwarty blok, dwa rzędy cylindrów.",
      layoutVR: "VR",
      layoutVRTitle: "VR - wąski kąt rozwarcia (ok. 15°), wspólna głowica.",
      layoutW: "W",
      layoutWTitle: "W - połączenie dwóch bloków VR (np. W12, W16).",
      layoutBoxer: "Boxer",
      layoutBoxerTitle: "Boxer (Przeciwsobny) - cylindry leżące płasko (180°).",
      cylinderCount: "Liczba cylindrów:",
      bore: "Średnica tłoka (Bore):",
      stroke: "Skok tłoka (Stroke):",
      displacement: "Pojemność skokowa",
      vAngle: "Kąt rozwarcia (V-Angle):",
      v8Crank: "Geometria wału V8:",
      v8CrossplaneBtn: "Crossplane (90°)",
      v8FlatplaneBtn: "Flat-plane (180°)",
      v8CrossplaneNote: "<b>Crossplane (90°):</b> Klasyczny bulgot V8, przeciwciężary niwelują siły bezwładności I i II rzędu.",
      v8FlatplaneNote: "<b>Flat-Plane (180°):</b> Lekki wał wyścigowy o szybkiej reakcji na obroty, generujący wibracje drugiego rzędu.",
      cycle: "Cykl pracy:",
      cycle4Btn: "4-suw (Otto)",
      cycle2Btn: "2-suw",
      valvesPerCyl: "Zawory na cylinder:",
      valves2Btn: "2 zawory",
      valves4Btn: "4 zawory",
      valvetrain: "Układ rozrządu:",
      valvetrainOHCBtn: "OHC (Wałek w głowicy)",
      valvetrainOHVBtn: "OHV (Popychacze)",
      enginePlacement: "Położenie silnika w podwoziu:",
      placementFrontBtn: "Z przodu",
      placementMidBtn: "Centralnie",
      placementRearBtn: "Z tyłu",
      orientation: "Orientacja montażu:",
      orientationLongBtn: "Wzdłużny",
      orientationTransBtn: "Poprzeczny",
      drivetrainLayout: "Rodzaj napędu:",

      // 2. Wał Korbowy & Zapłon
      crankAndIgnition: "Wał Korbowy & Zapłon",
      crankConfigMode: "Tryb konfiguracji wału:",
      presetModeBtn: "Wzorce Inżynieryjne",
      customModeBtn: "Tuning 360°",
      crankEngineeredBadge: "Preset Inżynieryjny",
      crankFallbackBadge: "Algorytm Zapasowy",
      radialTuningLabel: "Tarcza wykorbień (Przeciągnij czopy):",
      resetCrankBtn: "Reset",
      resetCrankTitle: "Przywróć domyślne kąty wzorca",
      snap15Label: "Przyciągaj co 15° (Snap)",

      // 3. Układ Napędowy & Skrzynia
      drivetrainAndGearbox: "Układ Napędowy & Skrzynia",
      engineRpm: "Obroty silnika:",
      clutchEngaged: "Sprzęgło załączone:",
      gearboxPreset: "Skrzynia Biegów (Preset):",
      gearboxCustomBtn: "Własna",
      currentGear: "Aktualny Bieg:",
      customGearboxTitle: "Edycja Przełożeń Biegów:",
      gear1Label: "1. Bieg:",
      gear2Label: "2. Bieg:",
      gear3Label: "3. Bieg:",
      gear4Label: "4. Bieg:",
      gear5Label: "5. Bieg:",
      gear6Label: "6. Bieg:",
      gearRLabel: "Wsteczny (R):",
      finalDrive: "Przełożenie główne (Dyferencjał):",
      clutchType: "Typ Sprzęgła:",
      clutchSingleBtn: "Jednotarczowe",
      clutchDualBtn: "DCT (Dwusprzęgłowe)",
      exhaustPipes: "Układ Wydechowy:",
      exhaustSingleBtn: "Pojedynczy (1 rura)",
      exhaustDualBtn: "Podwójny (2 rury)",
      diffType: "Mechanizm Różnicowy (Tył):",
      diffOpenBtn: "Otwarty",
      diffLsdBtn: "Szpera (LSD)",
      diffLockerBtn: "Blokada 100%",
      wheelSpeed: "Prędkość kół:",
      wheelRpm: "Obroty koła:",
      totalReduction: "Całkowita redukcja:",

      // 4. Fizyka & Wyważenie
      physicsAndBalance: "Fizyka & Wyważenie",
      balanceOkPill: "Balans OK",
      balanceVibPill: "Wibracje",

      // 5. Widok & Kamera
      viewAndCamera: "Widok & Kamera",
      viewStatusStudio: "Studio",
      viewStatusCutaway: "Przekrój",
      toggleWireframes: "Zarys (Cylindry / Głowice)",
      toggleHover: "Podświetlanie obiektów (Hover)",
      toggleDatum: "Pokaż Datum silnika (Centrum)",
      toggleChassis: "Podwozie, koła i zawieszenie",
      cameraFocus: "Skupienie kamery:",
      focusEngineBtn: "Silnik",
      focusDrivetrainBtn: "Napęd",
      focusCarBtn: "Auto",
      cutawayBtn: "Przekrój bloku silnika",
      explodeSlider: "Eksplozja podzespołów:",

      // Bottom Dock & HUD
      liveCamera: "Kamera aktywna",
      timeLabel: "CZAS:",
      crankAngleLabel: "KĄT WAŁU:",
      knowledgeBaseBtn: "Baza Wiedzy",

      // Right Info Drawer
      drawerTitleDefault: "Komponent",
      drawerCloseTitle: "Zamknij",
      drawerHp: "Moc:",
      drawerTorque: "Moment:",
      drawerWeight: "Masa:",
      drawerTagPrinciple: "ZASADA DZIAŁANIA",
      drawerTagWhy: "CEL KONSTRUKCYJNY",
      drawerTagHistory: "GENEZA & HISTORIA",
      drawerTagExamples: "PRZYKŁADY ZASTOSOWAŃ",

      // Dev Drawer / Inspector Pro
      devModeBtnTitle: "Włącz / Wyłącz Inspektor",
      inspectorPro: "Inspector Pro",
      devCloseTitle: "Zamknij panel (Esc)",
      devSummaryLayout: "Układ:",
      devStatusReady: "Gotowy",
      devCheckCollisionsBtn: "Sprawdź Kolizje OBB",
      devCopyReportBtn: "Kopiuj",
      devCopyReportTitle: "Skopiuj raport kolizji do schowka",
      devClearResultsTitle: "Wyczyść wyniki",
      devOverlapPlaceholder: "Kliknij przycisk powyżej, aby przeanalizować scenę 3D pod kątem kolizji i overlapingu modułów.",
      devPartsCatalog: "Spis Części",
      devCopyPartsBtn: "Kopiuj spis",
      devCopyPartsTitle: "Skopiuj spis wszystkich części do schowka",
      devPartsSearchPlaceholder: "Filtruj część (np. tłok, wał, zawór)...",
      devViewTools: "Narzędzia Widoku",
      devShowDatum: "Pokaż centrum silnika (Wektory / Datum)",
      devReloadApp: "Przeładuj aplikację",
      devReloadAppTitle: "Przeładuj całą stronę i zresetuj stan",
      devNoPartsMatch: "Brak części pasujących do filtra",
      loadingText: "WCZYTYWANIE..."
    },

    // Dynamic Presets Descriptions
    gearboxPresets: {
      opel_f17: {
        name: "Saab 9-3 (5b)",
        desc: "Klasyczna 5-biegowa skrzynia (bazowe przełożenia Saab 9-3 1.8i). Dobre stopniowanie miejskie."
      },
      bmw_zf_gs6: {
        name: "BMW ZF (6b)",
        desc: "Sportowa 6-biegowa skrzynia wzdłużna (BMW E46/E90 330i, Z4). Bieg 5 bezpośredni (1.00), bieg 6 to nadbieg."
      },
      tremec_t56: {
        name: "Tremec T56 (6b)",
        desc: "Wytrzymała skrzynia do potężnego momentu obrotowego (Corvette, Viper, Mustang Cobra). Podwójny nadbieg (5 i 6)."
      },
      rally_dogbox: {
        name: "Rajdowa (6b)",
        desc: "Wyczynowa krótka skrzynia ze sprzęgłami kłowymi do motorsportu. Ciasno zestopniowane biegi i wysokie przełożenie główne."
      },
      cvt_multitronic: {
        name: "CVT (Wariator)",
        desc: "⚡ <b>Skrzynia Bezstopniowa CVT:</b> Dwie pary przesuwnych stożków i stalowy pas Van Doorne'a płynnie zmieniają przełożenie od 2.60:1 (ruszanie) do 0.60:1 (nadbieg) bez przerw w dostawie momentu."
      },
      zf_8hp: {
        name: "Automat (6b)",
        desc: "Klasyczna hydrokinetyczna skrzynia automatyczna z przekładniami planetarnymi. (Uproszczony model 3D)."
      },
      custom: {
        name: "Własna",
        desc: "🛠 <b>Własne stopniowanie:</b> Dopasuj przełożenia poszczególnych biegów oraz dyferencjału do charakterystyki silnika."
      }
    },

    // Informacje o skrzyni biegów i dyferencjale w panelu wiedzy
    gearboxDrawer: {
      title: "Skrzynia Biegów (Manualna)",
      principle: "Moc z silnika wchodzi przez wałek sprzęgłowy. Następnie stałe przełożenie (constant mesh) przekazuje napęd na wałek pośredni (countershaft) na dole. Zębatki na wałku głównym kręcą się luźno na łożyskach, dopóki synchronizator nie wepnie jednej z nich na sztywno do wałka głównego.",
      why: "Silnik spalinowy generuje moc w wąskim zakresie obrotów. Skrzynia biegów działa jak dźwignia, pozwalając na jazdę powoli z dużą siłą (bieg 1) lub szybko z małą siłą (biegi wyższe).",
      history: "Nowoczesne skrzynie z zębami skośnymi i synchronizatorami wyparły skrzynie z zazębieniem kłowym z lat 20. XX wieku.",
      examplesTemplate: "Bieg {gear} wrzucony. Zwróć uwagę na położenie czerwonej przesuwki (synchronizatora). Na 4. biegu wałek wejściowy często jest łączony bezpośrednio z wyjściowym (przełożenie 1:1, direct drive)."
    },

    diffs: {
      open: {
        title: "Otwarty Mechanizm Różnicowy (Open Diff)",
        principle: "Satelity (małe zębatki w środku) obracają się swobodnie wokół własnej osi. Jeśli jedno koło traci przyczepność, cała moc wędruje na nie (idzie po najmniejszej linii oporu).",
        why: "Jest tani, bezobsługowy i pozwala na płynne pokonywanie zakrętów (lewe koło kręci się wolniej niż prawe, a satelity kompensują różnicę obrotów).",
        history: "Wynaleziony na przełomie XIX i XX wieku. Standard w 99% zwykłych aut cywilnych.",
        examples: "Toyota Corolla, Honda Civic, bazowe BMW serii 3."
      },
      lsd_mech: {
        title: "Szpera Płytkowa (1.5 Way LSD)",
        principle: "Wewnątrz kosza znajdują się płytki cierne (jak w sprzęgle) oraz specjalne krzywki (ramps). Gdy koła obracają się z różną prędkością, krzywki rozpychają się, ściskając płytki. Powoduje to częściowe zablokowanie mechanizmu i przekazanie momentu na oba koła.",
        why: "Idealny kompromis do sportu. Zapobiega bezsensownemu 'paleniu gumy' jednym kołem w zakręcie. 1.5 Way działa mocniej przy przyspieszaniu, a słabiej przy hamowaniu, co wybacza błędy kierowcy.",
        history: "Opracowane dla motorsportu w latach 60. i 70., by opanować rosnącą moc aut RWD na torze.",
        examples: "BMW M3 (wiele generacji), Nissan Silvia, Toyota Supra."
      },
      locker: {
        title: "Blokada 100% (Locker)",
        principle: "Ręczne lub pneumatyczne sprzęgło kłowe fizycznie łączy lewą i prawą półoś na sztywno z koszem satelitów. Oś kręci się jak rura (solid axle), a satelity przestają pracować.",
        why: "Jedyna opcja w ekstremalny teren. Nawet jeśli jedno koło zawiśnie w powietrzu, drugie i tak będzie kręcić się z taką samą prędkością, pozwalając wyjechać z błota.",
        history: "Stosowane w pojazdach wojskowych, traktorach i ciężkim sprzęcie roboczym od początku motoryzacji.",
        examples: "Mercedes G-Klasa, Jeep Wrangler Rubicon, Toyota Land Cruiser."
      }
    },

    // Crankshaft Presets Descriptions
    crankPresets: {
      "Inline_2": {
        name: "R2 Crossplane 270°",
        description: "Wał o przesunięciu 270° (np. Yamaha CP2 w MT-07, Triumph Scrambler, Honda Africa Twin). Przesunięcie to eliminuje nakładanie się momentu bezwładnościowego mas wirujących, dając płynne oddawanie mocy i dźwięk zbliżony do V90°.",
        technicalNote: "Interwał zapłonów: 270° - 450°. Zapewnia doskonałą trakcję koła tylnego."
      },
      "Inline_3": {
        name: "R3 120° Even-Fire",
        description: "Klasyczny wał 3-cylindrowy z czopami co 120° (np. Triumph Triple, Ford 1.0 EcoBoost). Zapewnia równy zapłon co 240° obrotu wału.",
        technicalNote: "Siły I i II rzędu są zrównoważone, lecz powstaje moment przechylający (rocking couple), wymagający wałka wyrównoważającego."
      },
      "Inline_4": {
        name: "R4 Flat-Plane 180° (1-3-4-2)",
        description: "Najpopularniejszy układ na świecie (np. Honda Civic, VW Golf). Skrajne czopy (1-4) są w fazie 0°, a środkowe (2-3) w fazie 180°. Kolejność zapłonu 1-3-4-2 co 180°.",
        technicalNote: "Siły I rzędu idealnie znoszą się w parach. Siły II rzędu (przyspieszenia tłoków) sumują się przy 2x RPM, co wywołuje charakterystyczne mrowienie."
      },
      "Inline_5": {
        name: "R5 72° Even-Fire (1-2-4-5-3)",
        description: "Legendarny układ z rajdowej grupy B i aut sportowych (Audi Quattro 2.2/2.5 TFSI, Volvo T5). Kąt wykorbień 72° daje unikalny gang i zapłon co 144°.",
        technicalNote: "Kolejność 1-2-4-5-3 zapewnia ciągłe zachodzenie na siebie suwów pracy, dając niezwykłą elastyczność silnika."
      },
      "Inline_6": {
        name: "R6 120° Lustrzany (1-5-3-6-2-4)",
        description: "Arystokracja inżynierii spalinowej (BMW M3, Toyota Supra 2JZ). Wał jest w pełni symetryczny (1-6, 2-5, 3-4 z czopami co 120°). Zapłon co 120°.",
        technicalNote: "Natywna, matematyczna perfekcja: siły i momenty I oraz II rzędu wynoszą DOKŁADNIE ZERO bez żadnych wałków wyrównoważających!"
      },
      "V_8_crossplane": {
        name: "V8 Crossplane 90° (Krzyżowy)",
        description: "Ikona amerykańskiej i niemieckiej motoryzacji (Ford Mustang GT, Chevrolet Corvette, Mercedes-AMG V8). Czopy rozmieszczone są w 4 płaszczyznach co 90°.",
        technicalNote: "Wymaga masywnych przeciwciężarów, ale całkowicie eliminuje wibracje I i II rzędu, generując słynny, nieregularny bulgot w wydechu."
      },
      "V_8_flatplane": {
        name: "V8 Flat-Plane 180° (Płaski)",
        description: "Wyścigowy układ supersamochodów (Ferrari 458 Italia, Ford Mustang Shelby GT350, Corvette C8 Z06). Wał działa jak dwa połączone silniki R4.",
        technicalNote: "Brak ciężkich przeciwciężarów pozwala wkręcać się na 9000 RPM w ułamku sekundy. Kosztem są silne wibracje drugiego rzędu."
      },
      "V_10": {
        name: "V10 72° Even-Fire",
        description: "Dźwięk bolidów F1 lat 90./00. oraz supersamochodów (Lexus LFA, Audi R8, Lamborghini Huracán). Zapłon co 72°.",
        technicalNote: "W silnikach V90° (np. Dodge Viper) stosuje się czopy dzielone (split-pin o przesunięciu 18°), by utrzymać równy interwał 72°."
      },
      "V_12": {
        name: "V12 60° (Dwa połączone L6)",
        description: "Szczyt luksusu i aksamitnej kultury pracy (Ferrari, Aston Martin, Rolls-Royce). Dwa idealnie wyważone rzędy R6 złączone wspólnym wałem. Zapłon co 60°.",
        technicalNote: "Praca jest tak gładka, że na pracującym silniku V12 można postawić monetę na krawędzi bez jej przewrócenia."
      },
      "Boxer_4": {
        name: "Boxer 4 (H4) 180°",
        description: "Klasyk Subaru i Porsche (Impreza WRX STI, Porsche 718 Cayman). Każdy przeciwległy tłok ma własny czop przesunięty o 180°.",
        technicalNote: "Tłoki poruszają się w stronę środka i na zewnątrz jednocześnie, co idealnie neutralizuje siły I i II rzędu. Niski środek ciężkości."
      },
      "Boxer_6": {
        name: "Boxer 6 (H6) 180°",
        description: "Serce Porsche 911 od 1963 roku. Połączenie zalet płaskiego układu przeciwsobnego i 6 cylindrów z zapłonem co 120°.",
        technicalNote: "Perfekcyjny balans masowy w każdej płaszczyźnie, zero sił i momentów resztkowych, fenomenalna reakcja na gaz."
      },
      fallbackTemplate: {
        name: "{layout}-{cylinders} (Even-Fire)",
        desc: "Niestandardowa architektura. Równomierny zapłon co {dGamma}° z czopami dzielonymi (split-pin).",
        tech: "Interwał zapłonu Δγ = {dGamma}°"
      }
    },

    // Raporty wyważenia silnika
    balanceReports: {
      perfect: {
        title: "🌟 Perfekcyjny Balans (Złoty Standard)",
        message: "Wszystkie wektory sił I i II rzędu oraz momenty znoszą się wzajemnie do zera.",
        recommendation: "Przykład: R6, V12 lub Boxer 6 – najwyższa kultura pracy w inżynierii motoryzacyjnej."
      },
      warningSecondary: {
        title: "⚡ Drgania Wtórne (Siły II Rzędu)",
        messageTemplate: "Siły I rzędu zneutralizowane, lecz powstaje wypadkowa siła II rzędu ({percent}%).",
        recommendation: "Cechuje to silniki R4 i V8 Flat-Plane – w autach cywilnych wymaga wałków Lanchester kręcących się z 2x RPM."
      },
      warningMoment: {
        title: "🔄 Moment Kiwający (Rocking Couple)",
        message: "Wypadkowa sił wynosi zero, lecz powstaje moment obrotowy przechylający silnik wzdłuż osi Z.",
        recommendation: "Dostosuj przeciwległe czopy skrajne (symetria lustrzana) lub dodaj wałek wyrównoważający (np. w R3 / R5)."
      },
      errorPrimary: {
        title: "⚠️ Niezrównoważone Siły I Rzędu",
        messageTemplate: "Wykryto silną wypadkową siłę poprzeczną/pionową I rzędu ({percent}%).",
        recommendation: "Przesuń czopy na tarczy, aby uzyskać symetrię kątową (np. rozstaw co 360°/N lub przeciwsobne pary)."
      },
      balanced: {
        title: "Układ Zrównoważony",
        message: "Siły masowe I i II rzędu oraz momenty zginające są zredukowane.",
        recommendation: "Silnik cechuje się dobrą kulturą pracy."
      }
    },

    // Suwy silnika
    strokes: {
      s4: {
        intake: { phase: "1. SSANIE", desc: "Zawór ssący otwarty, zasysanie powietrza" },
        compression: { phase: "2. SPRĘŻANIE", desc: "Tłok idzie w górę, ściskanie mieszanki" },
        power: { phase: "3. PRACA", desc: "Iskra świecy, zapłon gazów, pchanie tłoka w dół" },
        exhaust: { phase: "4. WYDECH", desc: "Zawór wydechowy otwarty, wyrzut spalin" }
      },
      s2: {
        power: { phase: "PRACA / WYDECH", desc: "Rozprężanie i jednoczesne płukanie cylindra" },
        compression: { phase: "SPRĘŻANIE / SSANIE", desc: "Sprężanie w cylindrze i ssanie do karteru" }
      }
    },

    categories: {
      block: "Blok silnika",
      valvetrain: "Układ rozrządu",
      aspiration: "Układ dolotowy",
      drivetrain: "Układ napędowy",
      suspension: "Zawieszenie"
    },

    // Parts Catalog & Deep Explanations
    parts: {
      // BLOCKS
      block_i4: {
        name: "R4 (Rzędowa Czwórka)",
        shortDesc: "4 cylindry w jednym rzędzie. Najpopularniejszy układ na świecie.",
        principle: "Tłoki poruszają się w jednej płaszczyźnie pionowej lub lekko pochylonej. Dwa środkowe tłoki poruszają się synchronicznie naprzeciw dwóm skrajnym, co daje równomierny zapłon co 180° obrotu wału.",
        why: "Idealny kompromis między kosztem produkcji, kompaktowymi wymiarami a wystarczającą mocą dla 90% zastosowań drogowych. Łatwy do zamontowania poprzecznie z napędem na przód.",
        history: "Stosowany od zarania motoryzacji. Ford Model T (1908) spopularyzował ten układ w masowej produkcji, a w latach 70. stał się globalnym standardem aut kompaktowych.",
        examples: "Ford Model T (1908-1927), VW Golf (1974-dziś), Honda Civic (1972-dziś), BMW E30 M3 (S14, 1986).",
        pros: ["Kompaktowy rozmiar i niska masa", "Tania produkcja i prosta obsługa", "Wysoka sprawność termiczna"],
        cons: ["Wibracje wtórne 2. rzędu powyżej 2.0L (wymaga wałków wyrównoważających)", "Ograniczony potencjał pojemności skokowej"]
      },
      block_v6: {
        name: "V6 (Układ Widlasty 6-cylindrowy)",
        shortDesc: "Dwa rzędy po 3 cylindry pod kątem 60° lub 90°.",
        principle: "Cylindry są rozchylone, korzystając ze wspólnego wału korbowego. Rozwidlenie 60° daje naturalnie równomierny zapłon co 120°, redukując wibracje bez konieczności długiego bloku.",
        why: "Pozwala uzyskać dużą pojemność (2.5L - 4.0L) i wysoką kulturę pracy, mieszcząc się w komorze silnika, w której nie zmieściłaby się długa rzędowa szóstka (R6).",
        history: "Pierwszy seryjny V6 pojawił się w Lancii Aurelia w 1950 r. W latach 80. i 90. wyparł silniki R6 w wielu autach klasy wyższej ze względu na wymogi zderzeniowe i napęd FWD/AWD.",
        examples: "Lancia Aurelia (1950), Nissan 350Z (VQ35, 2002), Alfa Romeo Busso (1979-2005), Ford GT (EcoBoost 3.5, 2017).",
        pros: ["Krótszy niż R6 – łatwiejsza zabudowa", "Duży moment obrotowy przy kompaktowej długości", "Wysoka kultura pracy przy kącie 60°"],
        cons: ["Dwie osobne głowice (większy koszt i masa osprzętu)", "Bardziej skomplikowany niż rzędowy"]
      },
      block_v8: {
        name: "V8 (Widlasta Ósemka)",
        shortDesc: "Dwa rzędy po 4 cylindry pod kątem 90°. Ikona mocy i dźwięku.",
        principle: "Układ z dwoma rzędami cylindrów pod kątem 90°. Może posiadać wał typu Crossplane (klasyczny bulgot, świetne wyważenie) lub Flatplane (agresywny dźwięk wyścigowy, szybsza reakcja na gaz).",
        why: "Dostarcza ogromny moment obrotowy od najniższych obrotów i doskonałe wyrównoważenie sił pierwszego i drugiego rzędu przy wale typu Crossplane.",
        history: "Spopularyzowany przez Forda w 1932 r. (Ford Flathead V8), co uczyniło moc V8 dostępną dla mas. Fundament amerykańskich muscle carów i europejskich aut sportowych oraz luksusowych.",
        examples: "Ford 1932 Flathead, Chevrolet Corvette (Small Block 1955-dziś), BMW M5 E39 (S62, 1998), Ferrari 458 Italia (2009).",
        pros: ["Potężny moment obrotowy i moc", "Niezrównana kultura pracy i dźwięk", "Krótszy niż R6"],
        cons: ["Wysoka masa i zużycie paliwa", "Duże gabaryty na szerokość", "Dwa rzędy rozrządu"]
      },
      block_boxer4: {
        name: "B4 (Boxer / Przeciwsobny)",
        shortDesc: "Cylindry ułożone poziomo naprzeciw siebie (kąt 180°).",
        principle: "Tłoki przeciwległe poruszają się równocześnie do siebie i od siebie (jak bokserzy stykający rękawice). Siły bezwładności tłoków znoszą się wzajemnie, eliminując potrzebę wałków wyrównoważających.",
        why: "Niezwykle niski środek ciężkości (drastycznie poprawia prowadzenie auta w zakrętach) oraz naturalne wyważenie bez wibracji.",
        history: "Opatentowany przez Karla Benza w 1896 r. Zastosowany w VW Garbusie (1938), Porsche 356/911 oraz jako znak rozpoznawczy marki Subaru (Symmetrical AWD).",
        examples: "VW Beetle (1938-2003), Porsche 356 (1948), Subaru Impreza WRX (EJ20/EJ25, 1992-dziś), Toyota GT86 / GR86 (FA20/FA24, 2012-dziś).",
        pros: ["Bardzo niski środek ciężkości (świetne prowadzenie)", "Idealne samoczynne wyważenie drgań", "Płaska konstrukcja"],
        cons: ["Trudny dostęp serwisowy (np. wymiana świec przy podłużnicach)", "Dwie głowice i skomplikowany układ smarowania"]
      },

      // VALVETRAIN
      valve_ohv: {
        name: "OHV (Rozrząd popychaczowy / Pushrod)",
        shortDesc: "Wałek rozrządu w bloku, zawory w głowicy sterowane popychaczami.",
        principle: "Pojedynczy wałek wewnątrz bloku silnika popycha laski popychaczy, które przez dźwigienki otwierają zawory umieszczone w głowicy.",
        why: "Niezwykle niska wysokość głowic i kompaktowa budowa silnika przy zachowaniu pancernej trwałości.",
        history: "Dominował w latach 1950-1980. Nadal z powodzeniem stosowany w silnikach GM LS/LT ze względu na bezkonkurencyjny stosunek mocy do gabarytów zewnętrznych.",
        examples: "Chevrolet Small Block V8 (1955-dziś), Dodge Viper V10 (1992-2017), Fiat 126p (1972-2000).",
        pros: ["Kompaktowe, niskie głowice", "Brak długich pasków/łańcuchów rozrządu", "Pancerna prostota i niski koszt"],
        cons: ["Duża bezwładność układu (trudność w osiąganiu wysokich obrotów > 6500 RPM)", "Zazwyczaj tylko 2 zawory na cylinder"]
      },
      valve_dohc: {
        name: "DOHC (Podwójny wałek w głowicy)",
        shortDesc: "2 wałki na głowicę (osobny dla zaworów dolotowych i wylotowych).",
        principle: "Wałki rozrządu umieszczone bezpośrednio nad zaworami eliminują bezwładność popychaczy, pozwalając na precyzyjne sterowanie 4 lub 5 zaworami na cylinder.",
        why: "Umożliwia uzyskanie optymalnego kształtu komory spalania (dachowa), centralnego umieszczenia świecy i bezpiecznej pracy przy 7000-9000 RPM.",
        history: "Początkowo stosowany w wyścigach (Peugeot 1912). W autach seryjnych wprowadzony przez Alfę Romeo w latach 50., a od lat 90. absolutny standard w branży.",
        examples: "Alfa Romeo Twin Cam (1954), BMW M3 E46 (S54, 2000), Toyota 4A-GE (1983).",
        pros: ["Możliwość kręcenia bardzo wysokich obrotów", "Lepszy przepływ mieszanki i sprawność (4 zawory/cylinder)", "Precyzyjne fazy rozrządu"],
        cons: ["Wyższa i szersza głowica", "Większy koszt i skomplikowanie napędu rozrządu"]
      },
      valve_vtec: {
        name: "VTEC / Zmienne fazy & wznios (Variable Valve Lift)",
        shortDesc: "Elektronicznie sterowany zmienny wznios i czas otwarcia zaworów.",
        principle: "Przy niskich obrotach silnik korzysta z łagodnych krzywek wałka (oszczędność paliwa, stabilny dół). Po przekroczeniu określonych RPM ciśnienie oleju blokuje dźwigienki na ostrej, wyścigowej krzywce o wysokim wzniosie.",
        why: "Rozwiązuje odwieczny kompromis: silnik może być elastyczny i ekonomiczny w mieście, a powyżej 5500 RPM zamieniać się w wyścigową jednostkę kręcącą do 9000 RPM.",
        history: "Opracowany przez inżyniera Ikuo Kajitaniego w Hondzie. Zadebiutował w Hondzie Integra DA6 (1989) i legendarnym NSX (1990).",
        examples: "Honda Civic Type R (B16B/K20A, 1997-dziś), Honda S2000 (F20C - 120 KM/litr bez turbo, 1999), BMW M3 S54 (Double VANOS).",
        pros: ["Dwa charaktery silnika w jednym", "Ekstremalnie wysoka moc z 1 litra pojemności bez turbo", "Niskie spalanie przy spokojnej jeździe"],
        cons: ["Wymaga precyzyjnego ciśnienia oleju i częstego serwisu", "Skomplikowana konstrukcja dźwigienek"]
      },

      // ASPIRATION
      asp_na: {
        name: "Wolnossący (Naturally Aspirated)",
        shortDesc: "Powietrze zasysane wyłącznie podciśnieniem wytwarzanym przez tłoki.",
        principle: "Ruch tłoka w dół w suwie ssania wytwarza podciśnienie w cylindrze, które wciąga powietrze atmosferyczne przez otwarty zawór dolotowy.",
        why: "Zapewnia natychmiastową reakcję na pedał gazu bez opóźnienia (turbo lag), liniowy przyrost mocy i autentyczny dźwięk.",
        history: "Jedyny sposób zasilania pierwszych silników spalinowych. Dziś zarezerwowany dla aut purystycznych i sportowych.",
        examples: "Porsche 911 GT3 (1999-dziś), Ferrari 458 Italia (2009), Mazda MX-5 Miata (1989-dziś).",
        pros: ["Błyskawiczna reakcja na gaz (zero lagu)", "Prosta konstrukcja, brak przegrzewających się turbin", "Wspaniałe brzmienie"],
        cons: ["Ograniczona moc i moment (zależne ściśle od pojemności skokowej)", "Spadek mocy na dużych wysokościach n.p.m."]
      },
      asp_turbo: {
        name: "Turbosprężarka (Single Turbo)",
        shortDesc: "Wykorzystuje energię gazów wydechowych do wtłaczania powietrza pod ciśnieniem.",
        principle: "Gazy spalinowe obracają wirnik turbiny, która przez wspólny wałek napędza wirnik sprężarki. Sprężone powietrze trafia do intercoolera i cylindrów, dostarczając więcej tlenu do spalenia.",
        why: "Pozwala uzyskać ogromny przyrost mocy i momentu obrotowego bez konieczności zwiększania masy ani pojemności bloku silnika.",
        history: "Opatentowana przez Alfreda Büchi w 1905 r. Spopularyzowana w rajdach i autach drogowych przez Porsche 911 Turbo (930, 1974) i Saaba 99 Turbo (1977).",
        examples: "Porsche 930 Turbo (1974), Saab 99 Turbo (1977), Mitsubishi Lancer Evolution (4G63T, 1992-2015), Toyota Supra MK4 (2JZ-GTE).",
        pros: ["Olbrzymi przyrost momentu obrotowego", "Wysoka sprawność termodynamiczna (odzyskiwanie energii spalin)", "Możliwość downsizingu"],
        cons: ["Zjawisko turbodziury (opóźniona reakcja)", "Wysoka temperatura pracy i obciążenie cieplne oleju"]
      },
      asp_twinturbo: {
        name: "Podwójne Doładowanie (Twin-Turbo / Biturbo)",
        shortDesc: "Dwie turbosprężarki (równoległe lub sekwencyjne).",
        principle: "Układ równoległy (każde turbo obsługuje jeden rząd cylindrów) lub sekwencyjny (mała turbina wstaje od dołu, duża pompuje na górze obrotów).",
        why: "Drastycznie redukuje opóźnienie (turbo lag) i zapewnia potężny ciąg w całym zakresie obrotomierza.",
        history: "Zastosowany wyczynowo w Porsche 959 (1986), a następnie w japońskich legendach lat 90. (Supra, RX-7 FD, Skyline GT-R).",
        examples: "Porsche 959 (1986), Mazda RX-7 FD (1991), Nissan Skyline GT-R R34 (RB26DETT, 1999), BMW M3 G80 (S58, 2021).",
        pros: ["Płaska krzywa momentu obrotowego", "Zminimalizowany turbo lag", "Ogromny potencjał mocy"],
        cons: ["Bardzo skomplikowane orurowanie i podciśnienia", "Wysoki koszt serwisu i duża ilość ciepła pod maską"]
      },
      asp_supercharger: {
        name: "Kompresor mechaniczny (Supercharger)",
        shortDesc: "Sprężarka napędzana mechanicznie paskiem od wału korbowego.",
        principle: "Sprężarka śrubowa lub Rootsa jest fizycznie połączona z wałem silnika przez pasek. Tłoczy dodatkowe powietrze natychmiast po dodaniu gazu, proporcjonalnie do obrotów wału.",
        why: "Daje natychmiastowy przyrost potężnego momentu obrotowego od biegu jałowego bez żadnego opóźnienia charakterystycznego dla turbin.",
        history: "Używany w silnikach lotniczych i wyścigowych Mercedesach 'Kompressor' w latach 20. XX w. Znak rozpoznawczy amerykańskich V8 (Hellcat) i brytyjskich aut GT (Jaguar/Aston Martin).",
        examples: "Mercedes SSK (1928), Dodge Challenger Hellcat (2015), Jaguar F-Type R (5.0 V8 Supercharged, 2014), Ford GT (2005).",
        pros: ["Natychmiastowa reakcja od samego dołu (zero lagu)", "Charakterystyczny świst kompresora", "Prostsza instalacja wydechowa niż przy turbo"],
        cons: ["Pobiera moc z wału silnika (tzw. strata pasożytnicza)", "Mniejsza sprawność paliwowa niż turbosprężarka"]
      },

      // DRIVETRAIN
      drive_rwd: {
        name: "RWD (Napęd na tylną oś)",
        shortDesc: "Silnik z przodu lub centralnie, napęd przenoszony na koła tylne.",
        principle: "Koła przednie odpowiadają wyłącznie za kierowanie pojazdem, a koła tylne za przekazywanie siły napędowej. Podczas przyspieszania masa auta dynamicznie dociąża oś napędzaną.",
        why: "Oddzielenie funkcji kierowania od napędzania eliminuje tzw. 'torque steer' i daje naturalne, wyważone czucie na kierownicy oraz możliwość kontroli poślizgu.",
        history: "Standardowy układ (System Panhard) dominujący od początków motoryzacji do lat 80. Dziś symbol aut sportowych i premium.",
        examples: "BMW Serii 3 (1975-dziś), Mazda MX-5 (1989-dziś), Ford Mustang (1964-dziś), Porsche 911 (1963-dziś).",
        pros: ["Idealne wyczucie układu kierowniczego", "Świetna trakcja przy mocnym przyspieszaniu", "Doskonały balans mas"],
        cons: ["Wymaga wprawy na mokrej/śliskiej nawierzchni (nadsterowność)", "Tunel wału napędowego zabiera miejsce we wnętrzu"]
      },
      drive_fwd: {
        name: "FWD (Napęd na przednią oś)",
        shortDesc: "Silnik i napęd zintegrowane na przedniej osi.",
        principle: "Koła przednie jednocześnie nadają kierunek jazdy i napędzają pojazd. Cały układ napędowy mieści się w komorze silnika.",
        why: "Niezwykle tani w produkcji, bezpieczny w prowadzeniu (przewidywalna podsterowność w sytuacjach awaryjnych) i oszczędzający przestrzeń w kabinie.",
        history: "Spopularyzowany przez Citroëna Traction Avant (1934), Mini (1959) oraz Volkswagena Golfa (1974), co zredefiniowało auta miejskie.",
        examples: "Citroën Traction Avant (1934), Austin Mini (1959), VW Golf GTI (1976-dziś), Honda Civic Type R (1997-dziś).",
        pros: ["Duża przestrzeń w kabinie i bagażniku (brak wału napędowego)", "Przewidywalne zachowanie na śniegu i deszczu", "Niska masa całego auta"],
        cons: ["Szarpnięcia kierownicą przy przyspieszaniu (Torque Steer)", "Gorsza trakcja przy starcie ze względu na odciążenie przodu"]
      },
      drive_awd: {
        name: "AWD / 4WD (Napęd na cztery koła)",
        shortDesc: "Moc rozdzielana na wszystkie 4 koła mechanicznie lub elektronicznie.",
        principle: "Centralny dyferencjał (lub sprzęgło wielopłytkowe) rozdziela moment obrotowy pomiędzy przednią i tylną oś w zależności od przyczepności każdego koła.",
        why: "Zapewnia maksymalną trakcję w każdych warunkach pogodowych (śnieg, deszcz, szuter) oraz pozwala na atomowy start z miejsca bez buksowania kół.",
        history: "Zrewolucjonizował rajdy WRC i motoryzację drogową za sprawą Audi Quattro w 1980 r. oraz rajdowych ikon Subaru i Mitsubishi.",
        examples: "Audi Quattro (1980), Subaru Impreza STI (1994-dziś), Nissan GT-R (ATTESA E-TS, 1989-dziś), Porsche 911 Turbo AWD.",
        pros: ["Maksymalna przyczepność i przyspieszenie z miejsca", "Pewność prowadzenia w złych warunkach pogodowych", "Efektywne wykorzystanie dużej mocy"],
        cons: ["Większa masa (dodatkowy dyferencjał, wały, półosie)", "Wyższe opory toczenia i zużycie paliwa"]
      },

      // SUSPENSION
      susp_wishbone: {
        name: "Podwójne wahacze poprzeczne (Double Wishbone)",
        shortDesc: "Dwa wahacze w kształcie litery A (górny i dolny) na koło.",
        principle: "Koło zamocowane jest do dwóch niezależnych wahaczy trójkątnych. Dzięki różnej długości wahaczy koło przy ugięciu zawieszenia zachowuje optymalny kąt pochylenia (negatyw) względem asfaltu.",
        why: "Zapewnia maksymalną powierzchnię styku opony z nawierzchnią w ostrym zakręcie, dając niezrównaną precyzję prowadzenia.",
        history: "Stosowane w Formule 1 i autach wyścigowych od lat 30. Honda wprowadziła je do popularnych aut (Civic IV/CRX) w latach 80., szokując konkurencję właściwościami jezdnymi.",
        examples: "Bolidy F1, Honda Civic 4th gen / CRX (1987), Mazda MX-5 (1989), Ferrari 488, BMW M8.",
        pros: ["Perfekcyjna kontrola geometrii koła w zakręcie", "Niezrównane czucie drogi i przyczepność boczna", "Niska wysokość montażowa"],
        cons: ["Złożona konstrukcja i duża liczba tulei/sworzni", "Droższa produkcja i serwis"]
      },
      susp_macpherson: {
        name: "Kolumna MacPhersona (MacPherson Strut)",
        shortDesc: "Pojedynczy wahacz dolny + amortyzator pełniący funkcję nośną.",
        principle: "Górny punkt mocowania amortyzatora jest jednocześnie punktem obrotu zwrotnicy i mocowaniem do kielicha nadwozia, eliminując potrzebę górnego wahacza.",
        why: "Zajmuje minimalną ilość miejsca na szerokość, co umożliwia montaż poprzecznych silników, a przy tym jest bardzo lekkie i tanie w produkcji.",
        history: "Opracowane przez Earle'a S. MacPhersona w koncernie Forda pod koniec lat 40. XX wieku (Ford Consul/Zephyr 1950).",
        examples: "Ford Consul (1950), Porsche 911 (przód), BMW Serii 3 (przód), większość aut segmentu B i C na świecie.",
        pros: ["Kompaktowe rozmiary – idealne do napędu na przód", "Niski koszt i prosta konstrukcja", "Niska masa nieresorowana"],
        cons: ["Zmiana kąta pochylenia koła przy dużym ugięciu (gorsza przyczepność na granicy)", "Przenoszenie drgań bezpośrednio na kielich nadwozia"]
      },
      susp_leaf: {
        name: "Resory piórowe / Sztywny Most (Leaf Springs & Solid Axle)",
        shortDesc: "Pakiet sprężystych pasów stalowych łączących sztywną oś z ramą.",
        principle: "Sztywna belka łączy oba koła, a ugięcie z jednej strony wpływa bezpośrednio na drugą stronę. Pakiet ułożonych warstwowo stalowych piór pełni jednocześnie rolę sprężyny i elementu prowadzącego oś.",
        why: "Ekstremalna nośność, odporność na przeciążenia w terenie i brak konieczności skomplikowanych wahaczy.",
        history: "Jedno z najstarszych zawieszeń w historii ludzkości (używane w powozach konnych). W motoryzacji stosowane w ciężarówkach, pickupach i wczesnych autach sportowych (Corvette C1-C7 miała resory kompozytowe).",
        examples: "Ford F-150 / Ranger, Toyota Hilux, Jeep Cherokee XJ (tył), Chevrolet Corvette (resory poprzeczne 1953-2019), Jelcz/Star.",
        pros: ["Pancerna wytrzymałość i ogromna ładowność", "Brak zmian prześwitu mechanizmu różnicowego pod obciążeniem", "Prostota naprawy młotkiem"],
        cons: ["Twarda, skacząca praca na nierównościach", "Duża masa nieresorowana", "Tendencja do podskakiwania osi przy ostrym przyspieszaniu"]
      }
    }
  },
  en: {
    appTitle: "Cars: Operating Principles",
    subtitle: "3D Educational Engine & Car Sandbox",
    
    // UI Badges & Navigation
    sandboxTab: "Garage & Configurator",
    learnTab: "Operating Principles",
    timelineTab: "Timeline & History",
    specTitle: "Calculated Performance",
    diagramTitle: "Procedural Diagram",
    whyTitle: "Why does it work like this?",
    historyTitle: "Origin and history of the technology",
    examplesTitle: "Example models and years of use",
    prosTitle: "Pros",
    consTitle: "Cons",
    rpmControl: "RPM Control",
    toggleAnimation: "Animation",
    
    // Metrics
    hpLabel: "Estimated Power",
    torqueLabel: "Torque",
    redlineLabel: "Max RPM",
    weightLabel: "Assembly Weight",
    handlingScore: "Balance / Handling",
    complexityScore: "Structural Complexity",

    // UI Elements
    ui: {
      brandTitle: "CARS 3D",
      brandSubtitle: "PRO STUDIO",
      fpsBadgeTitle: "Rendering performance",
      langSwitchTitle: "Switch language (English / Polski)",

      // Main Modes & Tabs
      modeConfig: "Configurator",
      modeStats: "Engine Specs & Stats",
      subtabEngine: "Engine",
      subtabEngineTitle: "Architecture, cylinders and valvetrain",
      subtabAspiration: "Air & Exhaust",
      subtabAspirationTitle: "Intake, boost, exhaust and mounting",
      subtabCrank: "Crank & Ignition",
      subtabCrankTitle: "Crankshaft geometry and firing order",
      subtabDrivetrain: "Drivetrain",
      subtabDrivetrainTitle: "Drivetrain, RPM and gearbox ratios",
      subtabView: "View & Studio",
      subtabViewTitle: "View tools, cutaway and camera controls",

      // Live Engine Specs & Gauges
      statsHeader: "Engine Performance & Live Data",
      statsPowerTitle: "Estimated Power",
      statsTorqueTitle: "Max Torque",
      statsPowerPerLiter: "Specific Power",
      statsPowerToWeight: "Power-to-Weight",
      statsWeightTitle: "Assembly Weight",
      statsRedlineTitle: "Max RPM (Redline)",
      statsGeomSection: "Engine Geometry & Kinematics",
      statsDisplacement: "Displacement",
      statsUnitDisp: "Cylinder Volume",
      statsBoreStroke: "Bore × Stroke",
      statsBsRatio: "Bore-to-Stroke Ratio (B/S)",
      statsMeanPistonSpeed: "Mean Piston Speed",
      statsMaxPistonAccel: "Piston Acceleration (TDC/BDC)",
      statsBmep: "Brake Mean Effective Pressure (BMEP)",
      statsGearsSection: "Theoretical Gear Speeds",
      statsColGear: "Gear",
      statsColRatio: "Ratio",
      statsColSpeedRpm: "Speed @ RPM",
      statsColSpeedRedline: "Speed @ Redline",
      statsBalanceSection: "Vibration & Balance",
      bsOversquare: "Oversquare (Short-stroke) • high RPM, reduced friction",
      bsSquare: "Square • optimal flexibility balance",
      bsUndersquare: "Undersquare (Long-stroke) • strong low-end torque",
      speedSafe: "Safe (< 15 m/s)",
      speedModerate: "High (15 - 20 m/s)",
      speedExtreme: "Material limit (> 20 m/s)",

      // 1. Engine Architecture
      engineArch: "Engine Architecture",
      cylinderLayout: "Cylinder layout:",
      layoutInline: "Inline",
      layoutInlineTitle: "Inline (I/L) - the most popular engine configuration.",
      layoutV: "V-Engine",
      layoutVTitle: "V-Engine - compact block with two angled cylinder banks.",
      layoutVR: "VR",
      layoutVRTitle: "VR - narrow bank angle (~15°) sharing a single cylinder head.",
      layoutW: "W",
      layoutWTitle: "W - combination of two VR blocks (e.g. W12, W16).",
      layoutBoxer: "Boxer",
      layoutBoxerTitle: "Boxer (Flat) - horizontally opposed cylinders (180°).",
      cylinderCount: "Cylinder count:",
      bore: "Bore diameter:",
      stroke: "Piston stroke:",
      displacement: "Displacement",
      vAngle: "V-Angle:",
      v8Crank: "V8 Crankshaft geometry:",
      v8CrossplaneBtn: "Crossplane (90°)",
      v8FlatplaneBtn: "Flat-plane (180°)",
      v8CrossplaneNote: "<b>Crossplane (90°):</b> Classic V8 rumble. Counterweights eliminate 1st and 2nd order inertial forces.",
      v8FlatplaneNote: "<b>Flat-Plane (180°):</b> Lightweight racing crankshaft with rapid rev response, generating secondary vibrations.",
      cycle: "Operating cycle:",
      cycle4Btn: "4-Stroke (Otto)",
      cycle2Btn: "2-Stroke",
      valvesPerCyl: "Valves per cylinder:",
      valves2Btn: "2 valves",
      valves4Btn: "4 valves",
      valvetrain: "Valvetrain:",
      valvetrainOHCBtn: "OHC (Overhead Cam)",
      valvetrainOHVBtn: "OHV (Pushrod)",
      enginePlacement: "Engine placement in chassis:",
      placementFrontBtn: "Front",
      placementMidBtn: "Mid",
      placementRearBtn: "Rear",
      orientation: "Mounting orientation:",
      orientationLongBtn: "Longitudinal",
      orientationTransBtn: "Transverse",
      drivetrainLayout: "Drivetrain layout:",

      // 2. Crankshaft & Ignition
      crankAndIgnition: "Crankshaft & Ignition",
      crankConfigMode: "Crank config mode:",
      presetModeBtn: "Engineering Presets",
      customModeBtn: "Custom 360°",
      crankEngineeredBadge: "Engineering Preset",
      crankFallbackBadge: "Fallback Algorithm",
      radialTuningLabel: "Crank pins dial (Drag pins):",
      resetCrankBtn: "Reset",
      resetCrankTitle: "Reset to default preset angles",
      snap15Label: "Snap to 15°",

      // 3. Drivetrain & Gearbox
      drivetrainAndGearbox: "Drivetrain & Gearbox",
      engineRpm: "Engine RPM:",
      clutchEngaged: "Clutch engaged:",
      gearboxPreset: "Gearbox (Preset):",
      gearboxCustomBtn: "Custom",
      currentGear: "Current Gear:",
      customGearboxTitle: "Custom Gear Ratios:",
      gear1Label: "1st Gear:",
      gear2Label: "2nd Gear:",
      gear3Label: "3rd Gear:",
      gear4Label: "4th Gear:",
      gear5Label: "5th Gear:",
      gear6Label: "6th Gear:",
      gearRLabel: "Reverse (R):",
      finalDrive: "Final Drive (Differential):",
      clutchType: "Clutch Type:",
      clutchSingleBtn: "Single-Plate",
      clutchDualBtn: "DCT (Dual-Clutch)",
      exhaustPipes: "Exhaust System:",
      exhaustSingleBtn: "Single (1 pipe)",
      exhaustDualBtn: "Dual (2 pipes)",
      diffType: "Rear Differential:",
      diffOpenBtn: "Open",
      diffLsdBtn: "LSD (Limited Slip)",
      diffLockerBtn: "100% Locker",
      wheelSpeed: "Wheel Speed:",
      wheelRpm: "Wheel RPM:",
      totalReduction: "Total Reduction:",

      // 4. Physics & Balance
      physicsAndBalance: "Physics & Balance",
      balanceOkPill: "Balance OK",
      balanceVibPill: "Vibrations",

      // 5. View & Camera
      viewAndCamera: "View & Camera",
      viewStatusStudio: "Studio",
      viewStatusCutaway: "Cutaway",
      toggleWireframes: "Wireframe (Cylinders / Heads)",
      toggleHover: "Object Highlight (Hover)",
      toggleDatum: "Show Engine Datum (Center)",
      toggleChassis: "Chassis, wheels & suspension",
      cameraFocus: "Camera Focus:",
      focusEngineBtn: "Engine",
      focusDrivetrainBtn: "Drivetrain",
      focusCarBtn: "Car",
      cutawayBtn: "Engine Block Cutaway",
      explodeSlider: "Exploded View:",

      // Bottom Dock & HUD
      liveCamera: "Camera active",
      timeLabel: "TIME:",
      crankAngleLabel: "CRANK ANGLE:",
      knowledgeBaseBtn: "Knowledge Base",

      // Right Info Drawer
      drawerTitleDefault: "Component",
      drawerCloseTitle: "Close",
      drawerHp: "Power:",
      drawerTorque: "Torque:",
      drawerWeight: "Weight:",
      drawerTagPrinciple: "OPERATING PRINCIPLE",
      drawerTagWhy: "DESIGN PURPOSE",
      drawerTagHistory: "ORIGIN & HISTORY",
      drawerTagExamples: "APPLICATION EXAMPLES",

      // Dev Drawer / Inspector Pro
      devModeBtnTitle: "Toggle Inspector Pro",
      inspectorPro: "Inspector Pro",
      devCloseTitle: "Close panel (Esc)",
      devSummaryLayout: "Layout:",
      devStatusReady: "Ready",
      devCheckCollisionsBtn: "Check OBB Collisions",
      devCopyReportBtn: "Copy",
      devCopyReportTitle: "Copy collision report to clipboard",
      devClearResultsTitle: "Clear results",
      devOverlapPlaceholder: "Click the button above to inspect 3D geometry for module collisions and overlaps.",
      devPartsCatalog: "Parts Catalog",
      devCopyPartsBtn: "Copy list",
      devCopyPartsTitle: "Copy all parts list to clipboard",
      devPartsSearchPlaceholder: "Filter part (e.g. piston, crank, valve)...",
      devViewTools: "View Tools",
      devShowDatum: "Show engine center (Vectors / Datum)",
      devReloadApp: "Reload Application",
      devReloadAppTitle: "Reload the page and reset application state",
      devNoPartsMatch: "No parts matching filter",
      loadingText: "LOADING..."
    },

    // Dynamic Presets Descriptions
    gearboxPresets: {
      opel_f17: {
        name: "Saab 9-3 (5-spd)",
        desc: "Classic 5-speed manual gearbox (Saab 9-3 1.8i baseline). Well-spaced city gearing."
      },
      bmw_zf_gs6: {
        name: "BMW ZF (6-spd)",
        desc: "Sporty 6-speed longitudinal transmission (BMW E46/E90 330i, Z4). 5th gear direct (1.00), 6th overdrive."
      },
      tremec_t56: {
        name: "Tremec T56 (6-spd)",
        desc: "Heavy-duty high-torque transmission (Corvette, Viper, Mustang Cobra). Double overdrive (5th and 6th)."
      },
      rally_dogbox: {
        name: "Rally Dogbox (6-spd)",
        desc: "Competition dog-ring motorsport gearbox. Close-ratio gears with high final drive ratio."
      },
      cvt_multitronic: {
        name: "CVT (Variator)",
        desc: "⚡ <b>Continuously Variable Transmission (CVT):</b> Two pairs of sliding cones and a Van Doorne steel push belt seamlessly vary ratios from 2.60:1 (launch) to 0.60:1 (overdrive) without power interruption."
      },
      zf_8hp: {
        name: "Automatic (6-spd)",
        desc: "Classic torque converter automatic transmission with planetary gearsets. (Simplified 3D model)."
      },
      custom: {
        name: "Custom",
        desc: "🛠 <b>Custom Gearing:</b> Adjust individual gear ratios and final drive."
      }
    },

    // Knowledge Drawer info for Gearbox & Differential
    gearboxDrawer: {
      title: "Manual Transmission (Gearbox)",
      principle: "Engine power enters through the input clutch shaft. A constant-mesh gear pair drives the countershaft below. Gears on the output shaft spin freely on needle bearings until a synchronizer collar locks one firmly to the main shaft.",
      why: "Internal combustion engines produce power in a narrow RPM band. The gearbox functions as a lever, trading speed for torque (1st gear) or torque for speed (higher gears).",
      history: "Modern helical synchromesh gearboxes superseded straight-cut 'crash boxes' from the 1920s.",
      examplesTemplate: "Gear {gear} engaged. Notice the red synchronizer slider position. In 4th gear, the input shaft is often directly coupled to the output shaft (1:1 direct drive ratio)."
    },

    diffs: {
      open: {
        title: "Open Differential",
        principle: "Pinion spider gears inside the carrier rotate freely. If one driven wheel loses grip, all engine torque flows to that wheel (path of least resistance).",
        why: "Cost-effective, maintenance-free, and ensures smooth cornering without tire scrub (outer wheel spins faster than inner wheel).",
        history: "Invented at the turn of the 20th century. Standard on 99% of production passenger cars.",
        examples: "Toyota Corolla, Honda Civic, base BMW 3 Series."
      },
      lsd_mech: {
        title: "Clutch-type LSD (1.5 Way)",
        principle: "Inside the carrier, friction clutch plates and ramp cams bind the axle shafts together when rotational speed differences occur, transferring drive torque to the wheel with grip.",
        why: "Ideal compromise for sports driving. Eliminates single-wheel burnout out of corners. 1.5-way locks strongly under acceleration and mildly under braking for stability.",
        history: "Developed for motorsport in the 1960s and 70s to tame rising horsepower on rear-wheel-drive race cars.",
        examples: "BMW M3 (multiple generations), Nissan Silvia, Toyota Supra."
      },
      locker: {
        title: "100% Locking Differential (Locker)",
        principle: "A manual or pneumatic dog clutch physically locks the left and right axle shafts together into a solid axle, bypassing differential spider gears.",
        why: "The definitive solution for extreme off-road terrain. Even with one wheel suspended in mid-air, the other wheel drives forward at identical wheel speed.",
        history: "Used in military vehicles, tractors, and heavy construction equipment since the dawn of motoring.",
        examples: "Mercedes-Benz G-Class, Jeep Wrangler Rubicon, Toyota Land Cruiser."
      }
    },

    // Crankshaft Presets Descriptions
    crankPresets: {
      "Inline_2": {
        name: "I2 Crossplane 270°",
        description: "270° crank offset (e.g. Yamaha CP2 in MT-07, Triumph Scrambler, Honda Africa Twin). Eliminates inertial torque overlap, delivering smooth power delivery and a V-twin exhaust note.",
        technicalNote: "Firing intervals: 270° - 450°. Provides superb rear-wheel traction."
      },
      "Inline_3": {
        name: "I3 120° Even-Fire",
        description: "Classic 3-cylinder crank with 120° pin spacing (e.g. Triumph Triple, Ford 1.0 EcoBoost). Even firing interval every 240° of crank rotation.",
        technicalNote: "Primary and secondary forces cancel, but an end-to-end rocking couple requires a counter-rotating balance shaft."
      },
      "Inline_4": {
        name: "I4 Flat-Plane 180° (1-3-4-2)",
        description: "The most widely produced engine layout worldwide (Honda Civic, VW Golf). Outer pins (1-4) at 0°, inner pins (2-3) at 180°. Firing order 1-3-4-2 every 180°.",
        technicalNote: "Primary forces balance in pairs. Secondary forces sum at 2x engine RPM, creating high-frequency buzzing vibrations."
      },
      "Inline_5": {
        name: "I5 72° Even-Fire (1-2-4-5-3)",
        description: "Legendary Group B rally and performance icon (Audi Quattro 2.2/2.5 TFSI, Volvo T5). 72° pin offsets create an unmistakable warble and 144° firing interval.",
        technicalNote: "Firing order 1-2-4-5-3 ensures overlapping power strokes, delivering exceptional low-end torque flexibility."
      },
      "Inline_6": {
        name: "I6 120° Mirrored (1-5-3-6-2-4)",
        description: "The gold standard of internal combustion refinement (BMW M3, Toyota Supra 2JZ). Perfectly symmetrical crank throws (1-6, 2-5, 3-4 at 120°). Firing every 120°.",
        technicalNote: "Mathematical perfection: 1st and 2nd order forces and rocking moments equal EXACTLY ZERO with no balance shafts!"
      },
      "V_8_crossplane": {
        name: "V8 Crossplane 90°",
        description: "Icon of American and European performance (Ford Mustang GT, Corvette Small Block, Mercedes-AMG V8). Four crank pin planes spaced at 90° intervals.",
        technicalNote: "Requires heavy counterweights, but completely eliminates 1st and 2nd order vibrations while producing the iconic V8 burble."
      },
      "V_8_flatplane": {
        name: "V8 Flat-Plane 180°",
        description: "High-revving supercar layout (Ferrari 458 Italia, Mustang Shelby GT350, Corvette C8 Z06). Crank operates as two coupled 4-cylinder engines.",
        technicalNote: "Absence of heavy counterweights enables lightning-fast throttle response and 9000 RPM rev limits, at the expense of strong 2nd-order vibrations."
      },
      "V_10": {
        name: "V10 72° Even-Fire",
        description: "Acoustic signature of 90s/00s Formula 1 and exotic supercars (Lexus LFA, Audi R8, Lamborghini Huracán). Firing every 72°.",
        technicalNote: "90° V-angles (e.g. Dodge Viper) use split-pin crank throws with an 18° offset to maintain an even 72° firing interval."
      },
      "V_12": {
        name: "V12 60° (Coupled Straight-Sixes)",
        description: "The pinnacle of automotive luxury and turbine-like smoothness (Ferrari, Aston Martin, Rolls-Royce). Two naturally balanced I6 banks on a single crank. Firing every 60°.",
        technicalNote: "Vibration-free operation allows balancing a coin on edge atop a running V12 engine."
      },
      "Boxer_4": {
        name: "Boxer 4 (H4) 180°",
        description: "Subaru and Porsche hallmark (Impreza WRX STI, Porsche 718 Cayman). Each opposing cylinder has its own crank pin offset by 180°.",
        technicalNote: "Opposing pistons travel inward and outward simultaneously, naturally cancelling 1st and 2nd order forces. Exceptionally low center of gravity."
      },
      "Boxer_6": {
        name: "Boxer 6 (H6) 180°",
        description: "The beating heart of the Porsche 911 since 1963. Combines flat low-profile architecture with 6 cylinders firing every 120°.",
        technicalNote: "Flawless mass balance in all planes, zero residual moments, and immediate throttle responsiveness."
      },
      fallbackTemplate: {
        name: "{layout}-{cylinders} (Even-Fire)",
        desc: "Custom engine geometry. Even firing interval every {dGamma}° with split-pin journals.",
        tech: "Firing interval Δγ = {dGamma}°"
      }
    },

    // Engine balance reports
    balanceReports: {
      perfect: {
        title: "🌟 Perfect Balance (Gold Standard)",
        message: "All primary and secondary mass force vectors and rocking moments cancel out to zero.",
        recommendation: "Examples: I6, V12, or Boxer 6 – unmatched mechanical refinement in automotive engineering."
      },
      warningSecondary: {
        title: "⚡ Secondary Vibrations (2nd-Order Forces)",
        messageTemplate: "Primary forces neutralized, but residual 2nd-order force present ({percent}%).",
        recommendation: "Characteristic of I4 and Flat-Plane V8 engines – production road cars utilize twin Lanchester shafts spinning at 2x RPM."
      },
      warningMoment: {
        title: "🔄 Rocking Couple (End-to-End Moment)",
        message: "Net force vector is zero, but a dynamic pitching moment acts along the engine's Z-axis.",
        recommendation: "Mirror opposing crank pins or incorporate a counter-rotating balance shaft (standard on I3 / I5)."
      },
      errorPrimary: {
        title: "⚠️ Unbalanced 1st-Order Primary Forces",
        messageTemplate: "Strong lateral or vertical 1st-order net force detected ({percent}%).",
        recommendation: "Adjust crank pin angles on the dial to achieve angular symmetry (e.g., 360°/N spacing or opposed pairs)."
      },
      balanced: {
        title: "Balanced Engine Layout",
        message: "1st and 2nd order forces and bending moments are substantially mitigated.",
        recommendation: "Engine exhibits good operational refinement."
      }
    },

    // Engine strokes
    strokes: {
      s4: {
        intake: { phase: "1. INTAKE", desc: "Intake valve open, drawing in fresh air charge" },
        compression: { phase: "2. COMPRESSION", desc: "Piston ascends, compressing air/fuel mixture" },
        power: { phase: "3. POWER", desc: "Spark ignition, combusting gases push piston down" },
        exhaust: { phase: "4. EXHAUST", desc: "Exhaust valve open, burnt exhaust gases expelled" }
      },
      s2: {
        power: { phase: "POWER / EXHAUST", desc: "Gas expansion and simultaneous cylinder scavenging" },
        compression: { phase: "COMPRESSION / INTAKE", desc: "Compression in cylinder and crankcase induction" }
      }
    },

    categories: {
      block: "Engine Block",
      valvetrain: "Valvetrain",
      aspiration: "Intake System",
      drivetrain: "Drivetrain",
      suspension: "Suspension"
    },

    // Parts Catalog & Deep Explanations
    parts: {
      // BLOCKS
      block_i4: {
        name: "I4 (Inline-Four)",
        shortDesc: "4 cylinders in a single row. The most popular engine layout in the world.",
        principle: "Pistons move in a single vertical or slightly inclined plane. The two middle pistons move synchronously opposite to the two outer ones, providing an even firing interval every 180° of crankshaft rotation.",
        why: "The perfect compromise between production cost, compact dimensions, and sufficient power for 90% of road applications. Easy to mount transversely for front-wheel drive layouts.",
        history: "Used since the dawn of motoring. The Ford Model T (1908) popularized this layout in mass production, and in the 1970s it became the global standard for compact cars.",
        examples: "Ford Model T (1908-1927), VW Golf (1974-present), Honda Civic (1972-present), BMW E30 M3 (S14, 1986).",
        pros: ["Compact size and low weight", "Cheap production and simple maintenance", "High thermal efficiency"],
        cons: ["Secondary (2nd-order) vibrations above 2.0L (requires balance shafts)", "Limited displacement potential"]
      },
      block_v6: {
        name: "V6 (V-Engine 6-cylinder)",
        shortDesc: "Two banks of 3 cylinders at a 60° or 90° angle.",
        principle: "Cylinders are splayed, sharing a common crankshaft. A 60° V-angle naturally provides even firing every 120°, reducing vibrations without the need for a long engine block.",
        why: "Allows for large displacement (2.5L - 4.0L) and high refinement while fitting into an engine bay that couldn't accommodate a long straight-six (I6).",
        history: "The first production V6 appeared in the Lancia Aurelia in 1950. In the 80s and 90s, it replaced I6 engines in many luxury cars due to crash safety requirements and FWD/AWD layouts.",
        examples: "Lancia Aurelia (1950), Nissan 350Z (VQ35, 2002), Alfa Romeo Busso (1979-2005), Ford GT (EcoBoost 3.5, 2017).",
        pros: ["Shorter than an I6 – easier packaging", "High torque output with a compact length", "Excellent refinement with a 60° angle"],
        cons: ["Two separate cylinder heads (higher cost and accessory weight)", "More complex design than an inline engine"]
      },
      block_v8: {
        name: "V8 (V-Engine 8-cylinder)",
        shortDesc: "Two banks of 4 cylinders at a 90° angle. An icon of power and sound.",
        principle: "A layout with two cylinder banks at a 90° angle. It can feature a crossplane crankshaft (classic burble, excellent balance) or a flatplane crankshaft (aggressive racing sound, faster throttle response).",
        why: "Delivers massive torque from low RPM and excellent primary and secondary balancing with a crossplane crankshaft.",
        history: "Popularized by Ford in 1932 (Ford Flathead V8), making V8 power accessible to the masses. The foundation of American muscle cars and European sports and luxury vehicles.",
        examples: "Ford 1932 Flathead, Chevrolet Corvette (Small Block 1955-present), BMW M5 E39 (S62, 1998), Ferrari 458 Italia (2009).",
        pros: ["Massive torque and power output", "Unmatched engine refinement and sound", "Shorter overall length than an I6"],
        cons: ["High weight and fuel consumption", "Large physical width", "Requires two valvetrain assemblies"]
      },
      block_boxer4: {
        name: "B4 (Boxer / Flat-Four)",
        shortDesc: "Cylinders arranged horizontally opposite each other (180° angle).",
        principle: "Opposing pistons move in and out simultaneously (like boxers touching gloves). Inertial forces cancel each other out, eliminating the need for balance shafts.",
        why: "Provides an extremely low center of gravity (drastically improving cornering capability) and perfect natural balance without vibrations.",
        history: "Patented by Karl Benz in 1896. Used in the VW Beetle (1938), Porsche 356/911, and acts as the hallmark of the Subaru brand (Symmetrical AWD).",
        examples: "VW Beetle (1938-2003), Porsche 356 (1948), Subaru Impreza WRX (EJ20/EJ25, 1992-present), Toyota GT86 / GR86 (FA20/FA24, 2012-present).",
        pros: ["Very low center of gravity (superb handling)", "Perfect natural vibration balancing", "Flat, low-profile design"],
        cons: ["Difficult service access (e.g., changing spark plugs near frame rails)", "Two cylinder heads and a complex lubrication system"]
      },

      // VALVETRAIN
      valve_ohv: {
        name: "OHV (Overhead Valve / Pushrod)",
        shortDesc: "Camshaft inside the block, valves in the head operated by pushrods.",
        principle: "A single camshaft inside the engine block actuates pushrods, which in turn move rocker arms to open the valves located in the cylinder head.",
        why: "Allows for extremely low cylinder head height and a compact overall engine package while maintaining bulletproof durability.",
        history: "Dominated the industry from 1950-1980. Still successfully used in modern GM LS/LT engines due to an unbeatable power-to-physical-size ratio.",
        examples: "Chevrolet Small Block V8 (1955-present), Dodge Viper V10 (1992-2017), Fiat 126p (1972-2000).",
        pros: ["Compact, low-profile cylinder heads", "No long timing belts or chains", "Bulletproof simplicity and low cost"],
        cons: ["High valvetrain inertia (difficulty reaching high RPM > 6500)", "Typically limited to 2 valves per cylinder"]
      },
      valve_dohc: {
        name: "DOHC (Double Overhead Camshaft)",
        shortDesc: "2 camshafts per cylinder head (separate cams for intake and exhaust valves).",
        principle: "Camshafts placed directly over the valves eliminate pushrod inertia, allowing for precise control of 4 or 5 valves per cylinder.",
        why: "Enables an optimal combustion chamber shape (pent-roof), central spark plug placement, and safe, reliable operation at 7000-9000 RPM.",
        history: "Initially used in racing (Peugeot 1912). Introduced to production cars by Alfa Romeo in the 1950s, and has been the absolute industry standard since the 90s.",
        examples: "Alfa Romeo Twin Cam (1954), BMW M3 E46 (S54, 2000), Toyota 4A-GE (1983).",
        pros: ["Ability to rev to very high engine speeds", "Better airflow and volumetric efficiency (4 valves/cylinder)", "Highly precise valve timing"],
        cons: ["Taller and wider cylinder heads", "Higher manufacturing cost and more complex timing drive"]
      },
      valve_vtec: {
        name: "VTEC / Variable Valve Lift",
        shortDesc: "Electronically controlled variable valve lift and duration.",
        principle: "At low RPM, the engine uses mild cam profiles (better fuel economy, stable idle). Above a certain RPM threshold, oil pressure locks the rocker arms onto an aggressive, high-lift racing cam profile.",
        why: "Solves the ultimate engineering compromise: the engine can be flexible and economical in the city, and above 5500 RPM transform into a racing unit revving up to 9000 RPM.",
        history: "Developed by Honda engineer Ikuo Kajitani. Debuted in the Honda Integra DA6 (1989) and the legendary NSX (1990).",
        examples: "Honda Civic Type R (B16B/K20A, 1997-present), Honda S2000 (F20C - 120 HP/liter naturally aspirated, 1999), BMW M3 S54 (Double VANOS).",
        pros: ["Two entirely different engine characteristics in one package", "Extremely high specific output (HP/Liter) without forced induction", "Low fuel consumption during relaxed driving"],
        cons: ["Requires precise oil pressure and frequent maintenance", "Highly complex rocker arm assembly"]
      },

      // ASPIRATION
      asp_na: {
        name: "Naturally Aspirated (NA)",
        shortDesc: "Air is drawn in solely by the vacuum created by the descending pistons.",
        principle: "The downward movement of the piston during the intake stroke creates a vacuum inside the cylinder, which draws in atmospheric air through the open intake valve.",
        why: "Provides instant throttle response without any delay (turbo lag), a highly linear power delivery curve, and an authentic exhaust note.",
        history: "The only aspiration method for early internal combustion engines. Today, mostly reserved for purist driver's cars and high-end sports cars.",
        examples: "Porsche 911 GT3 (1999-present), Ferrari 458 Italia (2009), Mazda MX-5 Miata (1989-present).",
        pros: ["Instantaneous throttle response (zero lag)", "Simpler design, no overheating turbine components", "Fantastic mechanical and exhaust sound"],
        cons: ["Limited power and torque (strictly dependent on engine displacement)", "Noticeable power loss at high altitudes due to thinner air"]
      },
      asp_turbo: {
        name: "Turbocharger (Single Turbo)",
        shortDesc: "Uses exhaust gas kinetic energy to force air into the engine under pressure.",
        principle: "Exhaust gases spin a turbine wheel, which drives a compressor wheel via a shared shaft. The compressed air passes through an intercooler and into the cylinders, providing much more oxygen for combustion.",
        why: "Allows for a massive increase in power and torque without needing to physically increase the engine block's mass or displacement.",
        history: "Patented by Alfred Büchi in 1905. Popularized in rallying and road cars by the Porsche 911 Turbo (930, 1974) and Saab 99 Turbo (1977).",
        examples: "Porsche 930 Turbo (1974), Saab 99 Turbo (1977), Mitsubishi Lancer Evolution (4G63T, 1992-2015), Toyota Supra MK4 (2JZ-GTE).",
        pros: ["Massive boost in mid-range torque", "High thermodynamic efficiency (recovering wasted exhaust energy)", "Enables engine downsizing for better emissions"],
        cons: ["Turbo lag (delayed throttle response as exhaust pressure builds)", "High operating temperatures and severe thermal load on engine oil"]
      },
      asp_twinturbo: {
        name: "Twin-Turbo / Biturbo",
        shortDesc: "Two turbochargers working together (parallel or sequential layout).",
        principle: "Parallel layout (each turbo feeds one specific cylinder bank) or sequential layout (a small turbo spools at low RPM for quick response, while a large one takes over at high RPM for peak power).",
        why: "Drastically reduces turbo lag and provides relentless, powerful acceleration across the entire rev range.",
        history: "Used competitively in the Porsche 959 (1986), and later became the defining feature of 90s Japanese legends like the Supra, RX-7 FD, and Skyline GT-R.",
        examples: "Porsche 959 (1986), Mazda RX-7 FD (1991), Nissan Skyline GT-R R34 (RB26DETT, 1999), BMW M3 G80 (S58, 2021).",
        pros: ["Wide and flat torque curve", "Minimized turbo lag compared to a large single turbo", "Huge power tuning potential"],
        cons: ["Highly complex vacuum and intercooler piping", "High maintenance costs and excessive heat build-up under the hood"]
      },
      asp_supercharger: {
        name: "Supercharger",
        shortDesc: "A mechanically driven air compressor powered by a belt from the engine's crankshaft.",
        principle: "A twin-screw or Roots-type compressor is physically linked to the engine's crankshaft via a drive belt. It forces compressed air into the engine instantly upon throttle application, directly proportional to engine RPM.",
        why: "Delivers an instantaneous wave of massive torque from idle speed with absolutely none of the lag characteristic of exhaust-driven turbochargers.",
        history: "Used in aircraft engines and racing Mercedes 'Kompressor' cars in the 1920s. Now a hallmark of modern American muscle cars (Hellcat) and British GTs (Jaguar/Aston Martin).",
        examples: "Mercedes SSK (1928), Dodge Challenger Hellcat (2015), Jaguar F-Type R (5.0 V8 Supercharged, 2014), Ford GT (2005).",
        pros: ["Instant throttle response from the very bottom (zero lag)", "Iconic mechanical supercharger whine", "Simpler exhaust plumbing than a turbo setup"],
        cons: ["Draws mechanical power directly from the crankshaft (parasitic drag/loss)", "Lower overall fuel efficiency compared to a turbocharger"]
      },

      // DRIVETRAIN
      drive_rwd: {
        name: "RWD (Rear-Wheel Drive)",
        shortDesc: "Engine mounted at the front or middle, power sent exclusively to the rear wheels.",
        principle: "The front wheels handle steering exclusively, while the rear wheels handle propulsion. During acceleration, dynamic weight transfer pushes down on the rear axle, increasing grip.",
        why: "Separating the steering and propulsion duties eliminates torque steer and provides a natural, perfectly balanced steering feel alongside the ability to control slip angles (drifting).",
        history: "The standard layout (Panhard System) dominating from the dawn of motoring to the 1980s. Today, it remains the defining symbol of true sports cars and premium luxury vehicles.",
        examples: "BMW 3 Series (1975-present), Mazda MX-5 (1989-present), Ford Mustang (1964-present), Porsche 911 (1963-present).",
        pros: ["Pure and uncorrupted steering feel", "Excellent traction during hard acceleration due to weight transfer", "Superior dynamic weight balance"],
        cons: ["Requires more driver skill on wet or slippery surfaces (prone to oversteer)", "The driveshaft tunnel consumes interior cabin space"]
      },
      drive_fwd: {
        name: "FWD (Front-Wheel Drive)",
        shortDesc: "Engine and drivetrain integrated over the front axle.",
        principle: "The front wheels must simultaneously steer the vehicle and propel it forward. The entire drivetrain (engine, transmission, differential) is packaged compactly within the engine bay.",
        why: "Extremely cost-effective to manufacture, safe and predictable for average drivers (tends to understeer safely in emergencies), and frees up maximum space for the passenger cabin.",
        history: "Popularized by the Citroën Traction Avant (1934), the classic Mini (1959), and the Volkswagen Golf (1974), which completely redefined the modern compact city car.",
        examples: "Citroën Traction Avant (1934), Austin Mini (1959), VW Golf GTI (1976-present), Honda Civic Type R (1997-present).",
        pros: ["Maximizes interior cabin and trunk space (no driveshaft tunnel)", "Safe and predictable handling in snow and heavy rain", "Lower overall vehicle weight"],
        cons: ["Tugs at the steering wheel during heavy acceleration (Torque Steer)", "Worse traction off the line due to front-end weight transfer (lifting)"]
      },
      drive_awd: {
        name: "AWD / 4WD (All-Wheel Drive)",
        shortDesc: "Power distributed to all 4 wheels mechanically or electronically.",
        principle: "A center differential (or multi-plate clutch system) dynamically splits engine torque between the front and rear axles depending on the available grip of each individual tire.",
        why: "Ensures maximum possible traction in all weather conditions (snow, rain, gravel) and allows for explosive standing starts without wheelspin.",
        history: "Revolutionized WRC rallying and high-performance road cars thanks to the Audi Quattro in 1980, followed by rally homologation icons from Subaru and Mitsubishi.",
        examples: "Audi Quattro (1980), Subaru Impreza STI (1994-present), Nissan GT-R (ATTESA E-TS, 1989-present), Porsche 911 Turbo AWD.",
        pros: ["Maximum grip and explosive acceleration off the line", "Unmatched driving confidence in poor weather conditions", "Effective utilization of extremely high horsepower"],
        cons: ["Increased weight (extra differential, driveshaft, half-shafts)", "Higher drivetrain parasitic loss and worse fuel economy"]
      },

      // SUSPENSION
      susp_wishbone: {
        name: "Double Wishbone Suspension",
        shortDesc: "Two A-shaped control arms (upper and lower) per wheel.",
        principle: "The wheel hub is attached to two independent triangular arms. Because the upper arm is typically shorter than the lower arm, the wheel gains negative camber as the suspension compresses, keeping the tire flat against the road.",
        why: "Provides the maximum possible tire contact patch during heavy cornering, delivering unmatched steering precision and lateral grip.",
        history: "Used in Formula 1 and purpose-built race cars since the 1930s. Honda controversially brought it to affordable economy cars (Civic IV/CRX) in the 80s, shocking the competition with superior handling dynamics.",
        examples: "Formula 1 cars, Honda Civic 4th gen / CRX (1987), Mazda MX-5 (1989), Ferrari 488, BMW M8.",
        pros: ["Perfect dynamic camber control during cornering", "Unrivaled road feel and lateral grip", "Low overall mounting height (allows for a lower hood line)"],
        cons: ["Complex design utilizing many bushings and ball joints", "More expensive to engineer, manufacture, and align"]
      },
      susp_macpherson: {
        name: "MacPherson Strut",
        shortDesc: "A single lower control arm combined with a shock absorber that acts as a structural pivot point.",
        principle: "The top mounting point of the shock absorber also serves as the steering pivot and mounts directly to the chassis strut tower, completely eliminating the need for an upper control arm.",
        why: "Takes up minimal lateral space in the wheel well, perfectly accommodating transverse FWD engine layouts, while being very lightweight and cheap to mass-produce.",
        history: "Developed by automotive engineer Earle S. MacPherson at Ford in the late 1940s (debuting on the Ford Consul/Zephyr in 1950).",
        examples: "Ford Consul (1950), Porsche 911 (front axle), BMW 3 Series (front axle), and nearly every modern B and C-segment car globally.",
        pros: ["Highly compact dimensions – perfect for FWD packaging", "Low manufacturing cost and simplistic design", "Low unsprung weight"],
        cons: ["Camber angle changes unfavorably during heavy suspension compression (less grip at the absolute limit)", "Transmits road impacts and vibrations directly into the chassis strut towers"]
      },
      susp_leaf: {
        name: "Leaf Springs & Solid Axle",
        shortDesc: "A bundle of spring steel leaves connecting a rigid live axle to the chassis frame.",
        principle: "A rigid beam connects both wheels, meaning a bump on one side directly affects the opposite wheel. The stacked, flexible steel leaves act simultaneously as the spring and the locating element for the axle.",
        why: "Provides extreme load-bearing capacity, resistance to severe off-road abuse, and eliminates the need for fragile, complex control arms.",
        history: "One of the oldest suspension designs in human history (dating back to horse-drawn carriages). In cars, widely used in trucks, pickups, and early sports cars (the Corvette C1-C7 famously used transverse composite leaf springs).",
        examples: "Ford F-150 / Ranger, Toyota Hilux, Jeep Cherokee XJ (rear), Chevrolet Corvette (transverse leaf 1953-2019).",
        pros: ["Bulletproof durability and massive payload capacity", "Maintains constant differential ground clearance under heavy loads", "Simplistic design that is easy to repair"],
        cons: ["Harsh, bouncy ride quality on uneven surfaces", "Massive unsprung weight degrades handling", "Prone to 'axle hop' or wheel hop during hard acceleration"]
      }
    }
  }
};