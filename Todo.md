# 📋 Project Roadmap & Technical Backlog (Todo.md)

> **Główny cel**: Ewolucja od proceduralnego symulatora silnika i podwozia do kompletnego, interaktywnego modelu całego samochodu z uwzględnieniem fizyki, kinematyki i zasad działania podzespołów.

---

## 🚦 Legenda statusu

- [x] **Ukończone (Done)** — wdrożone, przetestowane i zintegrowane w aplikacji.
- [/] **W trakcie (In Progress)** — bazowa wersja działa, wymaga rozszerzenia, kalibracji lub eliminacji kolizji.
- [ ] **Zaplanowane (Planned)** — zadania do wykonania w ramach kolejnych etapów.

---

## 🏗️ 0. Architektura Kodu, Narzędzia i Wydajność (Tech Debt & Infrastructure)

Zadania kluczowe, aby projekt udźwignął skalę modelowania **całego samochodu** bez spadków płynności i chaosu w kodzie:

- [ ] **Dekompozycja monolitycznych plików proceduralnych**:
  - [ ] Rozbicie `src/scene/EngineBuilder.js` (>2000 linii, 92 KB) na mniejsze, dedykowane moduły w folderze `src/scene/engine/`:
    - `BlockBuilder.js` (kadłub silnika, cylindry, tuleje cylindrowe, miska olejowa)
    - `CrankAssemblyBuilder.js` (wał korbowy, czopy, przeciwwagi, korbowody, tłoki)
    - `ValvetrainBuilder.js` (głowica, wałki rozrządu, zawory, sprężyny, popychacze OHV)
    - `ManifoldsBuilder.js` (kolektory ssące, przepustnica, kolektory wydechowe, turbiny)
    - `AccessoriesBuilder.js` (pasek klinowy, alternator, koła pasowe, pompa wody)
  - [ ] Podział `DrivetrainBuilder.js` na moduł skrzyń biegów i moduł dyferencjałów/wałów.
- [ ] **Wprowadzenie nowoczesnego bundlera (Vite)**:
  - [ ] Konfiguracja lekkiego bundlera Vite pod natywny Hot Module Replacement (HMR) podczas devu.
  - [ ] Optymalizacja produkcyjna (tree-shaking, minifikacja kodu, eliminacja request waterfall na Vercel).
- [ ] **Stopniowa migracja na TypeScript (TS)**:
  - [ ] Zdefiniowanie ścisłych interfejsów dla konfiguracji (`EngineConfig`, `VehicleDimensions`, `GearboxPreset`).
  - [ ] Typowanie geometrii i wektorów (eliminacja błędów runtime typu `undefined` podczas animacji 60 FPS).
- [ ] **Optymalizacja WebGL (Draw Calls & InstancedMesh)**:
  - [ ] Zastąpienie pojedynczych obiektów `Mesh` przez `THREE.InstancedMesh` dla elementów powtarzalnych (śruby kół, sprężyny zaworowe, zawory, świece zapłonowe).
  - [ ] Utrzymanie liczby Draw Calls poniżej 200–300 nawet przy kompletnym pojeździe.
- [ ] **Rozszerzenie Inspector Pro i Centrum Logów**:
  - [ ] Wbudowana konsola logów bezpośrednio w szufladzie Inspector Pro (przechwytywanie ostrzeżeń, błędów i metryk FPS).
  - [ ] Interaktywny gizmo transformacji (`THREE.TransformControls`) do szybkiego testowania i pozycjonowania nowych części bezpośrednio w przeglądarce.

---

## 🏎️ 1. Układ Wydechowy i Dolotowy (Exhaust & Intake)

- [x] Podstawowy kolektor wydechowy i pojedyncza rura wzdłuż podwozia.
- [/] **Konfiguracje układu wydechowego**:
  - [x] Pojedynczy wydech (Single pipe).
  - [x] Podwójny wydech (Dual exhaust pipes) dla silników widlastych i rzędowych.
  - [ ] **Kolektory i łączniki wydechowe**:
    - [ ] X-Pipe (krzyżak wyrównujący ciśnienie spalin i pulsacje w V8/V6).
    - [ ] H-Pipe (poprzeczny łącznik nadający charakterystyczne basowe brzmienie).
    - [ ] Straight Pipes / Cat-delete (sportowy układ przelotowy bez katalizatorów).
    - [ ] Katalizatory (wkład ceramiczny o strukturze plastra miodu w przezroczystej obudowie).
    - [ ] Tłumiki środkowe (rezonatory) i tłumiki końcowe (komorowe i przelotowe).
- [ ] **Układ Dolotowy i Doładowanie**:
  - [x] Rury dolotowe N/A (wolnossące) i rury do turbosprężarki.
  - [ ] Przepustnica (Throttle body) z obracającą się klapką reagującą na pedał gazu w kokpicie.
  - [ ] Intercooler (chłodnica powietrza doładowującego) montowany w pasie przednim chłodnicy.
  - [ ] Obudowa filtra powietrza (Airbox) vs sportowy filtr stożkowy.

---

## 🔧 2. Mechanika Silnika i Rozrząd (Engine & Valvetrain)

- [x] Dynamiczny generator bloków: Rzędowe (L2–L6, L11), V (dowolny kąt), VR (15° w jednej głowicy), Boxer, W.
- [x] Trójwarstwowy solver wału korbowego (RadialCrankUI 360°, presety inżynieryjne, split-pin).
- [x] Całkowanie sił bezwładności i momentów wyważenia (siły I i II rzędu).
- [x] Rozrząd DOHC (Double Overhead Cam) z fizycznym uginaniem sprężyn zaworowych.
- [/] **Rozrząd OHV (Overhead Valve / Popychaczowy)**:
  - [x] Bazowa implementacja wałka rozrządu w bloku silnika.
  - [ ] Kalibracja geometrii dźwigienek zaworowych dla silników Boxer oraz szerokich V8 (likwidacja przenikania brył).
  - [ ] Szklanki popychaczy (lifters) i animowane laski popychaczy (pushrods) przekazujące ruch na dźwigienki.
- [ ] **Rozrząd SOHC (Single Overhead Cam)**:
  - [ ] Pojedynczy wałek w głowicy sterujący zaworami ssącymi i wydechowymi za pośrednictwem dźwigienek.
- [ ] **Zmienne Fazy Rozrządu (VVT / VTEC / Vanos)**:
  - [ ] Koło fazatora przestawiające kąt wałka rozrządu względem koła pasowego w funkcji RPM.

---

## ⚙️ 3. Skrzynie Biegów i Układ Napędowy (Drivetrain & Transmissions)

- [x] Sprzęgło jednotarczowe suche i sprzęgło dwutarczowe (DCT).
- [x] Manualna skrzynia biegów z kołami zębatymi (wałek sprzęgłowy, pośredni i główny).
- [x] Dyferencjały: Otwarty, LSD (szpera płytkowa 1.5-way) oraz Blokada 100% (locker kłowy).
- [/] **Układy napędowe (FWD, RWD, AWD, 4x4)**:
  - [x] Klasyczne RWD (silnik z przodu, skrzynia wzdłużna, wał napędowy, tylny dyferencjał).
  - [/] FWD Transaxle (poprzeczny zespół silnik-skrzynia, zintegrowany dyferencjał, półosie równej/nierównej długości).
  - [/] AWD / 4x4 (skrzynia rozdzielcza / PTU, przedni wał napędowy, przedni i tylny dyferencjał).
  - [ ] RWD Transaxle (silnik z przodu, skrzynia biegów zblokowana z tylnym dyferencjałem połączona sztywną rurą reakcyjną `Torque Tube` — układ Corvette C5/C6, Porsche 944, Alfa Romeo).
- [ ] **Automatyczna Skrzynia Biegów (Hydromechaniczna)**:
  - [ ] Przekładnia hydrokinetyczna (Torque Converter):
    - Obudowa pompy wirującej z wałem silnika.
    - Turbina połączona z wałkiem skrzyni.
    - Kierownica (stator) ze sprzęgłem jednokierunkowym (freewheel sprag clutch).
  - [ ] Przekładnia planetarna (Planetary Gearset):
    - Koło słoneczne (Sun Gear).
    - Koła obiegowe (Planet Gears) osadzone na jarzmie (Carrier).
    - Koło pierścieniowe z uzębieniem wewnętrznym (Ring Gear).
    - Hamulce taśmowe i sprzęgła wielopłytkowe blokujące poszczególne elementy.
  - [ ] CVT

---

## 📐 4. Pozycjonowanie Silnika (Engine Placement & Mounting)

- [/] **Lokalizacja zespołu napędowego w podwoziu**:
  - [x] Silnik z przodu (`front` — nad/przed przednią osią).
  - [ ] Silnik centralny (`mid` — za fotelami, przed tylną osią: Ferrari, Porsche Cayman).
  - [ ] Silnik z tyłu (`rear` — za tylną osią: Porsche 911, Garbus).
- [ ] Dynamiczna adaptacja ramy nośnej, poduszek silnika oraz długości wałów napędowych przy zmianie pozycji montażu.

---

## 🛞 5. Podwozie, Zawieszenie i Układ Kierowniczy (Chassis & Steering)

- [x] Stalowa rama podwozia z podłużnicami, progami, kołyską silnika i kołyską dyferencjału.
- [x] Przednie podwójne wahacze poprzeczne (Double Wishbone A-arms).
- [x] Tylne zawieszenie wielowahaczowe (Multi-link).
- [x] Kolumny gwintowane (Coilovers) z proceduralnymi sprężynami śrubowymi i amortyzatorami.
- [x] Koła: wentylowane tarcze hamulcowe, dzwony tarcz, 6-tłoczkowe zaciski, piasty, felgi aluminiowe, opony radialne.
- [ ] **Geometria Układu Kierowniczego (Ackermann Steering)**:
  - [ ] Interaktywny suwak kąta skrętu kół w panelu sterowania.
  - [ ] Geometria Ackermanna: koło wewnętrzne skręca pod większym kątem niż zewnętrzne (przecięcie osi w środku łuku).
  - [ ] Animacja przesuwu listwy maglownicy i drążków kierowniczych (Tie Rods).
- [ ] **Stabilizatory Poprzeczne (Anti-roll bars / Sway bars)**:
  - [ ] Przedni i tylny drążek skrętny łączący lewy i prawy wahacz w celu redukcji przechyłów nadwozia.

---

## 🚗 6. Pełna Karoseria, Aerodynamika i Wnętrze (Full Car Body & Interior)

*Strategia architektoniczna: podejście hybrydowe (mechanika generowana matematycznie + modułowe panele nadwozia/wnętrza).*

- [ ] **Modułowa Karoseria Samochodu**:
  - [ ] Wybór typu nadwozia: Coupe, Sedan, Supercar.
  - [ ] Struktura nośna: Rama rurowa (Spaceframe) vs Karoseria samonośna (Monocoque).
  - [ ] Zewnętrzne panele poszycia: maska silnika, błotniki przednie/tylne, dach, drzwi, klapa bagażnika, zderzaki.
  - [ ] **Tryby wizualizacji nadwozia**:
    - **Solid**: w pełni lakierowane poszycie z lakierem samochodowym (Car Paint Metallic / Clearcoat).
    - **Ghost / X-Ray**: półprzezroczysta karoseria ze szkła akrylowego odsłaniająca całą mechanikę.
    - **Wireframe**: kontury i linie podziału blach.
    - **Cutaway**: przekrój wzdłużny ukazujący połowę wnętrza i podzespołów.
- [ ] **Aerodynamika**:
  - [ ] Przedni splitter, wloty powietrza, tylny dyfuzor i aktywne skrzydło/spojler.
  - [ ] Wizualizacja strug opływu powietrza (Streamlines) za pomocą animowanych cząsteczek w Three.js.
- [ ] **Kokpit i Wnętrze**:
  - [ ] Fotele kubełkowe, tunel środkowy z lewarkiem skrzyni biegów.
  - [ ] Kolumna kierownicy połączona z maglownicą (kierownica obraca się synchronicznie ze skrętem kół).
  - [ ] Zestaw pedałów (gaz, hamulec, sprzęgło) wciskających się w zależności od stanu napędu.
  - [ ] Wirtualne zegary na desce rozdzielczej (obrotomierz i prędkościomierz odzwierciedlające telemetrię).

---

## 🔊 7. Dźwięk, Fizyka i Telemetria (Audio & Dynamics)

- [x] Obliczanie prędkości kół (km/h), obrotów kół (RPM) i redukcji napędu (`Telemetry.js`).
- [ ] **Proceduralny Generator Dźwięku Silnika (Web Audio API)**:
  - [ ] Dźwięk syntezowany w czasie rzeczywistym z częstotliwości zapłonów ($f = \frac{\text{RPM} \cdot N}{120}$).
  - [ ] Zmiana barwy dźwięku w zależności od układu (charakterystyczny ryk V8 crossplane vs flatplane, gang R5, świst turbiny).
- [ ] **Symulacja Dynamiki Pojazdu**:
  - [ ] Ugięcie zawieszenia pod wpływem przeciążeń (przysiad tyłu przy przyspieszaniu, nurkowanie przodu przy hamowaniu).
  - [ ] Wykres mocy i momentu obrotowego w funkcji obrotów (Dyno Chart w Inspector Pro).
