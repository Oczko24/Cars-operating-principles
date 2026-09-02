# 📋 Roadmap & Backlog (Todo.md)
*Statyczne stanowisko edukacyjno-anatomiczne (Virtual Cutaway Workbench). Brak modelu jazdy.*

[x] Done | [/] In Progress | [ ] Planned

### 0. INTERAKTYWNE DRZEWO CZĘŚCI I INSPEKCJA (PARTS EXPLORER)
* [ ] **Hierarchiczne Drzewo Komponentów w UI (Treeview)**:
  * Pełna taksonomia: Pojazd → Układ → Podzespół → Część (np. Silnik → Głowica → Zawór).
  * [ ] **Dwukierunkowa interakcja (3D ↔ UI)**:
    * Kliknięcie w drzewku: płynny najazd kamery (Focus), podświetlenie obrysem/pulsowaniem (Glow/Outline Mesh).
    * Kliknięcie w model 3D: automatyczne rozwinięcie gałęzi i zaznaczenie elementu w drzewku.
  * [ ] **Karta Edukacyjna w panelu bocznym**:
    * Wyświetlanie zasady działania, celu konstrukcyjnego, genezy i typowych awarii z `i18n.js`.
    * Opcja izolacji widoku (Solo / Isolate Part) oraz ukrywania sąsiadujących podzespołów.

### I. JEDNOSTKI NAPĘDOWE I OSPRZĘT
* **Benzyna (ICE) & Inżynieria Bloku**:
  * [x] Bloki: L2-L6, L11, V2-V12, VR15°, Boxer, W.
  * [x] Solver wału 360°, presety, split-pin, wyważenie I/II rzędu.
  * [ ] Tuleje cylindrowe: mokre (Wet Sleeves omywane płynem) vs suche (Dry Sleeves).
  * [ ] Wałki wyrównoważające (Balance Shafts) dla sił II rzędu (L4).
  * [ ] Tłumik drgań skrętnych wału (Harmonic Balancer elastomerowy/wiskotyczny).
* **Układy Rozrządu (Valvetrain)**:
  * [x] DOHC z fizycznym ugięciem sprężyn.
  * [/] OHV (popychacze, dźwigienki): [ ] likwidacja kolizji V/Boxer, [ ] skok szklanek.
  * [ ] SOHC (dźwigienki z 1 wałka).
  * [ ] Zmienne fazy (VVT/VANOS) i wewnętrzny EGR (przekrycie zaworów / valve overlap).
  * [ ] Rozrząd desmodromiczny (krzywka otwierająca i zamykająca, bezsprężynowy Ducati).
  * [ ] Rozrząd bezwałkowy Freevalve / Camless (elektropneumatyczne aktuatory).
  * [ ] Pneumatyczne sprężyny zaworowe (technologia F1, eliminacja pływania zaworów).
* **Doładowanie i Osprzęt Powietrzny**:
  * [ ] Turbosprężarka Twin-Scroll (podzielona muszla i kanały spalin).
  * [ ] Układy Bi-Turbo / Twin-Turbo (równoległe oraz sekwencyjne).
  * [ ] Zawory Wastegate (wewnętrzny oraz zewnętrzny ze zrzutem Screamer Pipe).
  * [ ] Zawór upustowy ciśnienia BOV (atmosferyczny) / DV (recyrkulacyjny).
  * [ ] Kompresor mechaniczny Roots / Twin-Screw (widoczne śruby zębate napędzane paskiem).
  * [ ] Kompresor odśrodkowy (Centrifugal Supercharger).
  * [ ] Intercooler w pasie przednim oraz wodny Chargecooler (Water-to-Air).
* **Układy Paliwowe, Smarowanie i Chłodzenie**:
  * [ ] Bezpośredni wtrysk paliwa GDI (pompa wysokiego ciśnienia na wałku rozrządu).
  * [ ] Podwójny wtrysk paliwa Port + Direct (np. Toyota D-4S).
  * [ ] Zbiornik buforowy paliwa (Surge Tank zapobiegający odpływowi w zakrętach).
  * [ ] Sucha miska olejowa (Dry Sump: wielosekcyjna pompa ssąco-tłocząca, zewnętrzny zbiornik).
  * [ ] Natrysk oleju na denko tłoka (Oil Squirters).
  * [ ] Zewnętrzna chłodnica oleju (Oil Cooler) z termostatem.
  * [ ] Separator oleju ze skrzyni korbowej (Oil Catch Can / odma cyklonowa).
* **Diesel, Gaz i Alternatywne**:
  * [ ] Diesel: blok 18:1, denko tłoka z miseczką, świece żarowe, szyna Common Rail, wtrysk piezo, pompa CR, turbo VGT, DPF i SCR z AdBlue.
  * [ ] LPG / CNG: zbiornik toroidalny/butle 200 bar, wielozawór, reduktor wpięty w wodę, wtryskiwacze gazu.
  * [ ] Hybrydy: MHEV 48V (BISG), HEV e-CVT (planetarka PSD + MG1/MG2), PHEV z gniazdem.
  * [ ] Elektryki (BEV): silnik Hairpin PMSM, reduktor 1-biegowy, bateria podłogowa, BMS, falownik SiC.

### II. UKŁAD WYDECHOWY I AKUSTYKA
* [x] Kolektory wydechowe, rura pojedyncza/podwójna.
* [ ] Kolektory równoodległościowe (Equal-length / spaghetti headers).
* [ ] Termoizolacja wydechu (bandaże bazaltowe / osłony z Inconelu).
* [ ] Złącza: X-Pipe, H-Pipe, przelot Straight-Pipe / Cat-delete.
* [ ] Zewnętrzny układ EGR (zawór elektryczny, chłodniczka, magistrala do dolotu).
* [ ] Aktywne przepustnice wydechu (Active Exhaust Valves) do regulacji głośności.
* [ ] Filtr GPF/OPF dla silników benzynowych.
* [ ] Sondy Lambda (regulacyjna przed katalizatorem, diagnostyczna za, szerokopasmowa AFR).
* [ ] Tłumik z boczną komorą rezonatora Helmholtza (redukcja dronienia).

### III. PRZENIESIENIE NAPĘDU (DRIVETRAIN)
* [x] Sprzęgło 1-tarczowe i 2-tarczowe (DCT).
* [x] Skrzynia manualna 5/6 biegów z kołami i wałkami.
* [ ] Sprzęgło wielotarczowe wyczynowe (Twin/Triple-disc spiekowe lub węglowe).
* [ ] Sekwencyjna skrzynia kłowa (Dog-box) z prostymi zębami (Straight-cut) bez synchronizacji.
* [ ] Skrzynia bezstopniowa CVT (stalowy pas pchany i przesuwne stożki).
* [ ] Skrzynia hydrokinetyczna: konwerter (pompa, turbina, stator, lock-up) + planetarka (Ravigneaux/Lepelletier).
* [ ] Wał napędowy z włókna węglowego (Carbon Fiber Propshaft).
* [ ] Łożysko podporowe wału z tłumikiem drgań (Center Support Bearing).
* [ ] Przeguby homokinetyczne Rzeppa (CV Joints) vs krzyżakowe Cardana (analiza nierównobieżności).
* [x] Dyferencjały: otwarty, LSD 1.5-way, blokada kłowa 100%.
* [ ] Aktywny mechanizm z wektorowaniem momentu (Torque Vectoring Differential).
* [ ] Szpula (Spool 100% – sztywny montaż koła talerzowego bez satelitów).
* [ ] Zwolnice portalowe (Portal Axles) z przekładnią w piastach (zwiększenie prześwitu).
* [/] Układy: [x] RWD, [/] FWD Transaxle, [/] AWD/4x4 z reduktorem, [ ] RWD Transaxle z rurą reakcyjną (Torque Tube C5/944).

### IV. PODWOZIE, ZAWIESZENIE I KINEMATYKA (STATYKA)
* [x] Rama przestrzenna, double wishbone przód, multi-link tył, coilovers, hamulce wentylowane.
* [ ] Geometria skrętu Ackermanna (wewnętrzne koło skręca mocniej) + praca maglownicy i drążków.
* [ ] Kolumna kierownicza z przegubami połączona z kierownicą w kabinie.
* [ ] Suwak ugięcia zawieszenia (prezentacja zmiany kątów Camber/Toe na podnośniku).
* [ ] Przedni i tylny stabilizator poprzeczny (Anti-roll bars) z łącznikami.

### V. ANATOMIA, NADWOZIE I WNĘTRZE
* [ ] Poszycie: Spaceframe vs Monocoque, panele blach (maska, drzwi, błotniki, dach, zderzaki).
* [ ] Przełącznik trybów: Solid (lakier), Ghost/X-Ray (przezroczysty), Wireframe, Cutaway (przekrój).
* [ ] Anatomiczne przepływy: obieg oleju, obieg płynu chłodzącego, wektory przepływu momentu.
* [ ] Wnętrze: fotele, pedały gazu/hamulca/sprzęgła, zegary telemetrii.

### VI. KOD, WYDAJNOŚĆ I DEV TOOLS
* [ ] Dekompozycja `EngineBuilder.js` na `src/scene/engine/` (`Block`, `Crank`, `Valvetrain`, `Manifolds`, `Accessories`).
* [ ] Bundler Vite (HMR) i migracja na TypeScript.
* [ ] `THREE.InstancedMesh` dla elementów powtarzalnych (śruby, zawory, sprężyny, ogniwa).
* [ ] Inspector Pro: wbudowana konsola logów, `TransformControls` (gizmo 3D).
