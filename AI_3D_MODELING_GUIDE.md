# 🛠️ AI 3D PROCEDURAL MODELING GUIDE
>
> **Cars-operating-principles: Kompendium Inżynierii i Modelowania Proceduralnego 3D dla Modeli AI**

Dokument ten jest technicznym standardem i instrukcją dla agentów AI tworzących lub rozwijających mechaniczne modele 3D w projekcie.

---

## 📐 1. Filozofia Modelowania Proceduralnego

W tym projekcie **nie importujemy plików .gltf, .obj ani .fbx**.
Wszystkie podzespoły (tłoki, wały, skrzynie biegów, dyferencjały, zawieszenie, osprzęt) są tworzone **w 100% czystym kodem Three.js** za pomocą prymitywów geometrycznych, transformacji macierzowych i matematyki wektorowej.

### Główne Zalety Podejścia Proceduralnego

1. **Dynamiczne skalowanie fizyczne**: Zmiana średnicy cylindra (bore) lub skoku (stroke) automatycznie przelicza wymiary bloku, korbowodów, komory spalania i kolektorów.
2. **Pełna kontrola nad kinematyką**: Każda część (np. synchronizator, stożek CVT, popychacz zaworu) posiada parametryczną pozycję zależną od kąta wału korbowego lub wybranego przełożenia.
3. **Maksymalna wydajność**: Minimalna waga zasobów, brak pobierania ciężkich plików siatek, zoptymalizowany WebGL.

---

## 🧱 2. Anatomia Narzędzi Geometrycznych Three.js

Każdy element samochodu składa się z dopasowanych figur podstawowych:

| Element Mechaniczny | Podstawowa Geometria Three.js | Wskazówki Orientacji i Konstrukcji |
| :--- | :--- | :--- |
| **Wały, osie, półosie** | `CylinderGeometry(r, r, len, 16)` | Domyślnie oś Y. Dla osi wzdłużnej pojazdu ($Z$): `rotation.x = Math.PI / 2`. Dla poprzecznej ($X$): `rotation.z = Math.PI / 2`. |
| **Koła zębate, tarcze, koła zamachowe** | `CylinderGeometry(r, r, thickness, 32)` | Zęby można modelować jako obwodowe kostki `BoxGeometry` w pętli lub pierścień ząbkowany. |
| **Koła pasowe V / Stożki CVT** | `CylinderGeometry(rLarge, rSmall, width, 32)` | Ścięty stożek. Dwa stożki zwrócone ku sobie mniejszymi podstawami tworzą rowek pasowy o zmiennej szerokości! |
| **Paski napędowe i łańcuchy** | `TubeGeometry(curve)` lub zestaw ogniw | Krzywa `CatmullRomCurve3` łącząca punkty styczne dwóch kół pasowych o promieniach $R_1, R_2$ rozstawionych o dystans $D$. |
| **Sprężyny (zaworowe, zawieszenia)** | `Line` lub `TubeGeometry` helisy | Generowane spiralą: $x = r\cos(t), y = h(t/t_{max}), z = r\sin(t)$. Ugięcie animowane przez `scale.y`. |
| **Korbowody, wahacze** | `BoxGeometry` + 2× `CylinderGeometry` | Dwa oczka (sworzeń i czop wału) połączone belką dwuteową (H-beam) lub profilem prostokątnym. |
| **Obudowy i korpusy** | `EdgesGeometry(BoxGeometry)` lub `CylinderGeometry(..., openEnded)` | Zarys geometryczny w trybie wireframe lub półprzezroczysty z `matFlexPipe` / `crankcaseLineMat`. |

---

## 🎯 3. Wzorzec Konstrukcyjny (Builder Pattern)

Każdy nowy moduł 3D **musi** spełniać 5 zasad architektury:

1. **Hierarchia `THREE.Group`**:
   - Główna grupa modułu (np. `cvtGroup`) mocowana w `transGroup` lub `engineMountGroup`.
   - Podgrupy dla elementów obracających się niezależnie (`primaryPulleyGroup`, `secondaryPulleyGroup`).
2. **Środek obrotu (Pivot)**:
   - Własny punkt `(0, 0, 0)` danej grupy musi znajdować się **dokładnie w osi obrotu** elementu. Nigdy nie przesuwaj geometrii wewnątrz grupy o wektor, jeśli ma się ona obracać wokół własnego środka.
3. **Materiały ze Słownika Sceny**:
   - Używaj gotowych materiałów: `this.scene.matSteel`, `this.scene.matDarkSteel`, `this.scene.matBronze`, `this.scene.matGold`, `this.scene.matBelt`, `this.scene.matChrome`.
4. **Identyfikator `userData.name`**:
   - Każdy widoczny mesh **musi** mieć ustawione `mesh.userData.name = "Nazwa Części"` (dla Raycastera, Inspektora i Bazy Wiedzy).
5. **Rejestracja w pętli animacji (`scene3d.animate`)**:
   - Zapisz referencję w `this.scene.twojaNazwaGroup`, aby w pliku `scene3d.ts` móc obracać lub przesuwać element proporcjonalnie do obrotów silnika i przełożenia.

---

## ⚙️ 4. Przykład Referencyjny: Skrzynia Bezstopniowa (CVT)

Oto wzorcowy schemat jak poprawnie zaimplementować skrzynię CVT:

### A. Kinematyka Fizyczna

- Skrzynia posiada dwa wałki:
  - **Wałek czynny (Primary / Input)** napędzany z silnika: $\omega_{in}$.
  - **Wałek bierny (Secondary / Output)** napędzający dyferencjał: $\omega_{out}$.
- Dwa regulowane koła pasowe, każde złożone z pary stożków o kącie pochylenia $\alpha \approx 11^\circ$.
- Zmiana przełożenia $i = \frac{R_{sec}}{R_{prim}}$:
  - **Bieg krótki (Ruszenie / Low gear)**: Stożki czynne rozsunięte ($R_{prim} = 0.04\text{m}$), stożki bierne ściśnięte ($R_{sec} = 0.10\text{m}$) $\implies i \approx 2.5:1$.
  - **Nadbieg (Trasa / Overdrive)**: Stożki czynne ściśnięte ($R_{prim} = 0.10\text{m}$), stożki bierne rozsunięte ($R_{sec} = 0.04\text{m}$) $\implies i \approx 0.55:1$.
- Zachowanie długości pasa:
  $$L \approx 2D + \pi(R_{prim} + R_{sec}) + \frac{(R_{sec} - R_{prim})^2}{D} = \text{const}$$

### B. Kod Proceduralny Trójwymiarowy

```typescript
// 1. Zespół wałka pierwotnego (Primary)
const primaryGroup = new THREE.Group();
primaryGroup.position.set(0, 0, 0.10);

// Stały stożek lewy
const conePrimaryFixed = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.035, 0.045, 32),
  this.scene.matSteel
);
conePrimaryFixed.rotation.x = Math.PI / 2;
conePrimaryFixed.position.z = -0.03;
primaryGroup.add(conePrimaryFixed);

// Ruchomy stożek prawy (sterowany hydraulicznie)
const conePrimaryMovable = new THREE.Mesh(
  new THREE.CylinderGeometry(0.035, 0.12, 0.045, 32),
  this.scene.matSteel
);
conePrimaryMovable.rotation.x = Math.PI / 2;
conePrimaryMovable.position.z = 0.03;
primaryGroup.add(conePrimaryMovable);

// 2. Zespół wałka wtórnego (Secondary)
const secondaryGroup = new THREE.Group();
secondaryGroup.position.set(0, -0.16, -0.15); // Odsunięty w dół i do tyłu

// 3. Stalowy pas pchany Van Doorne'a (łączący oba promienie)
const belt = createCvtBelt(rPrim, rSec, centerDist);
```

---

## 🔍 5. Narzędzie Samodzielnej Weryfikacji AI (`npm run inspect:3d`)

Zanim zgłosisz użytkownikowi, że zadanie jest ukończone, **uruchom automatyczną inspekcję**:

```bash
# Sprawdzenie skrzyni biegów i zrzut ekranu
npm run inspect:3d -- --focus=gearbox --output=temp/inspect_gearbox.png

# Sprawdzenie całego układu napędowego
npm run inspect:3d -- --focus=drivetrain --output=temp/inspect_drive.png
```

Narzędzie:

1. Uruchamia bezgłową przeglądarkę z WebGL.
2. Sprawdza czy nie ma błędów w konsoli JavaScript.
3. Wywołuje algorytm detekcji kolizji OBB (`telemetry.checkOverlap()`).
4. Zapisuje zrzut ekranu w `temp/`, który możesz obejrzeć narzędziem `view_file` i na własne oczy ocenić estetykę, spasowanie i poprawność modelu!
