import * as THREE from 'three';
import { i18n } from '../i18n.js';

export class Telemetry {
  constructor(scene) {
    this.scene = scene;
  }


getCylindersState() {
    const lang = this.scene.lang || 'pl';
    const t = i18n[lang] || i18n.pl;
    const strokes = t.strokes;

    return this.scene.movingCylinders.map(p => {
      let phase = "";
      let phaseClass = "";
      let desc = "";
      
      if (this.scene.config.stroke === 2) {
        const strokeAngle = (this.scene.crankAngle + p.phaseOffset) % (Math.PI * 2);
        if (strokeAngle < Math.PI) {
          phase = strokes.s2.power.phase;
          phaseClass = "stroke-power";
          desc = strokes.s2.power.desc;
        } else {
          phase = strokes.s2.compression.phase;
          phaseClass = "stroke-compression";
          desc = strokes.s2.compression.desc;
        }
      } else {
        const strokeAngle = (this.scene.crankAngle + p.phaseOffset) % (Math.PI * 4);
        phase = strokes.s4.intake.phase;
        phaseClass = "stroke-intake";
        desc = strokes.s4.intake.desc;
        if (strokeAngle >= Math.PI && strokeAngle < Math.PI * 2) {
          phase = strokes.s4.compression.phase;
          phaseClass = "stroke-compression";
          desc = strokes.s4.compression.desc;
        } else if (strokeAngle >= Math.PI * 2 && strokeAngle < Math.PI * 3) {
          phase = strokes.s4.power.phase;
          phaseClass = "stroke-power";
          desc = strokes.s4.power.desc;
        } else if (strokeAngle >= Math.PI * 3) {
          phase = strokes.s4.exhaust.phase;
          phaseClass = "stroke-exhaust";
          desc = strokes.s4.exhaust.desc;
        }
      }
      return { id: p.id, phase, phaseClass, desc };
    });
  }

getPartsCatalog() {
    if (!this.scene.carGroup) return { totalCount: 0, uniqueCount: 0, categories: [] };
    
    // Lista zdefiniowanych kategorii mechanicznych
    const categoryDefs = [
      {
        id: "crank",
        name: "Układ Korbowo-Tłokowy",
        icon: "🗜️",
        match: (n) => n.includes("korbowód") || n.includes("korbowod") || n.includes("trzon") || n.includes("stopa") || n.includes("główka") || n.includes("panewka") || n.includes("tulejka") || n.includes("półka") || n.includes("środnik") || n.includes("śruba korbowodowa") || n.includes("pokrywa stopy") || n.includes("tłok") || n.includes("tlok") || n.includes("pierścień") || n.includes("pierscien") || n.includes("sworzeń") || n.includes("sworzen") || n.includes("seger") || n.includes("wał korbowy") || n.includes("wal korbowy") || n.includes("czop") || n.includes("wykorbienie") || n.includes("przeciwwaga") || n.includes("przeciwciężar") || n.includes("snout") || n.includes("koło zębate wału") || n.includes("koło pasowe wału") || n.includes("kołnierz koła zamachowego")
      },
      {
        id: "valvetrain",
        name: "Głowica i Układ Rozrządu",
        icon: "⚙️",
        match: (n) => n.includes("wałek rozrządu") || n.includes("walek rozrzadu") || n.includes("krzywka") || n.includes("koło wałka") || n.includes("pasek rozrządu") || n.includes("pasek rozrzadu") || n.includes("napinacz") || n.includes("zawór") || n.includes("zawor") || n.includes("grzybek") || n.includes("trzonek") || n.includes("sprężyna") || n.includes("talerzyk") || n.includes("szklanka") || n.includes("popychacz") || n.includes("dźwigienka") || n.includes("laska") || n.includes("świeca") || n.includes("swieca") || n.includes("izolator")
      },
      {
        id: "intake",
        name: "Układ Dolotowy i Wtrysk",
        icon: "🌪️",
        match: (n) => n.includes("plenum") || n.includes("przepustnica") || n.includes("klapa") || n.includes("oś klapy") || n.includes("kolektor dolotowy") || n.includes("runner") || n.includes("filtr") || n.includes("wtryskiwacz") || n.includes("listwa wtryskowa") || n.includes("strumień wtrysku")
      },
      {
        id: "exhaust",
        name: "Układ Wydechowy",
        icon: "🔥",
        match: (n) => n.includes("kolektor wydechowy") || n.includes("kolektor zbiorczy") || n.includes("y-pipe") || n.includes("flex pipe") || n.includes("złącze elastyczne") || n.includes("katalizator") || n.includes("tłumik") || n.includes("tlumik") || n.includes("końcówka wydechu") || n.includes("rura układu wydechowego")
      },
      {
        id: "cooling_aux",
        name: "Chłodzenie i Osprzęt Paskowy",
        icon: "❄️",
        match: (n) => n.includes("chłodnic") || n.includes("wąż chłodnicy") || n.includes("wentylator") || n.includes("termostat") || n.includes("pompa wody") || n.includes("alternator") || n.includes("pasek klinowy") || n.includes("koło pasowe") || n.includes("rolka")
      },
      {
        id: "drivetrain",
        name: "Układ Przeniesienia Napędu",
        icon: "🏎️",
        match: (n) => n.includes("sprzęgło") || n.includes("sprzeglo") || n.includes("tarcza") || n.includes("docisk") || n.includes("koło zamachowe") || n.includes("skrzynia") || n.includes("wałek wejściowy") || n.includes("wałek wyjściowy") || n.includes("koło biegu") || n.includes("zębatka bieg") || n.includes("synchronizator") || n.includes("przesuwka") || n.includes("wał napędowy") || n.includes("prop shaft") || n.includes("dyferencjał") || n.includes("dyferencjal") || n.includes("satelit") || n.includes("krzyżak") || n.includes("krzyzak") || n.includes("kosz") || n.includes("koło talerzowe") || n.includes("wałek atakujący") || n.includes("koło koronowe") || n.includes("półoś") || n.includes("polos") || n.includes("lsd") || n.includes("blokada")
      },
      {
        id: "chassis",
        name: "Podwozie, Zawieszenie i Koła",
        icon: "🛞",
        match: (n) => n.includes("koło") || n.includes("felga") || n.includes("opona") || n.includes("tarcza hamulcowa") || n.includes("zacisk") || n.includes("wahacz") || n.includes("amortyzator") || n.includes("zwrotnica") || n.includes("łącznik") || n.includes("stabilizator") || n.includes("rama") || n.includes("belka")
      }
    ];

    const partCounts = {};
    let totalMeshCount = 0;

    this.scene.carGroup.traverse((child) => {
      if (child.isMesh && child.visible && child.userData && child.userData.name) {
        const name = child.userData.name;
        if (
          name.includes("(Zarys)") ||
          name.includes("Zarysy") ||
          name.includes("Datum") ||
          name.includes("Punkt środka") ||
          name.includes("Centrum") ||
          name.includes("Centroid") ||
          name.includes("Oś Cyl") ||
          name.includes("Gazy ssące") ||
          name.includes("Spaliny") ||
          name.includes("Strumień") ||
          name.includes("Płomień") ||
          name.includes("Iskra") ||
          child.userData.isDatumLabel
        ) {
          return;
        }

        totalMeshCount++;
        partCounts[name] = (partCounts[name] || 0) + 1;
      }
    });

    // Grupowanie części do kategorii
    const categorized = categoryDefs.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      items: [],
      count: 0
    }));

    const otherCategory = {
      id: "other",
      name: "Pozostałe Elementy",
      icon: "📦",
      items: [],
      count: 0
    };

    Object.entries(partCounts).forEach(([name, count]) => {
      const lower = name.toLowerCase();
      let matched = false;
      for (const cat of categorized) {
        const def = categoryDefs.find(d => d.id === cat.id);
        if (def && def.match(lower)) {
          cat.items.push({ name, count });
          cat.count += count;
          matched = true;
          break;
        }
      }
      if (!matched) {
        otherCategory.items.push({ name, count });
        otherCategory.count += count;
      }
    });

    // Sortuj części alfabetycznie w każdej kategorii
    categorized.forEach(cat => {
      cat.items.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    });
    otherCategory.items.sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    const finalCategories = categorized.filter(c => c.count > 0);
    if (otherCategory.count > 0) finalCategories.push(otherCategory);

    return {
      totalCount: totalMeshCount,
      uniqueCount: Object.keys(partCounts).length,
      categories: finalCategories
    };
  }

checkOverlap() {
    if (!this.scene.carGroup) return { totalChecked: 0, collisions: [], rawList: [] };
    
    // Zaktualizuj macierze transformacji świata
    this.scene.scene.updateMatrixWorld(true);
    
    // Test twierdzenia o osiach rozdzielających (SAT) dla dwóch OBB (Oriented Bounding Box) w 3D
    const testOBBIntersection = (a, b) => {
      const v = new THREE.Vector3().subVectors(b.center, a.center);
      
      const R = [
        [a.axes[0].dot(b.axes[0]), a.axes[0].dot(b.axes[1]), a.axes[0].dot(b.axes[2])],
        [a.axes[1].dot(b.axes[0]), a.axes[1].dot(b.axes[1]), a.axes[1].dot(b.axes[2])],
        [a.axes[2].dot(b.axes[0]), a.axes[2].dot(b.axes[1]), a.axes[2].dot(b.axes[2])]
      ];
      
      const eps = 1e-5;
      const absR = [
        [Math.abs(R[0][0]) + eps, Math.abs(R[0][1]) + eps, Math.abs(R[0][2]) + eps],
        [Math.abs(R[1][0]) + eps, Math.abs(R[1][1]) + eps, Math.abs(R[1][2]) + eps],
        [Math.abs(R[2][0]) + eps, Math.abs(R[2][1]) + eps, Math.abs(R[2][2]) + eps]
      ];
      
      // 1. Sprawdź 3 osie lokalne OBB A
      for (let i = 0; i < 3; i++) {
        const ra = (i === 0) ? a.extents.x : (i === 1) ? a.extents.y : a.extents.z;
        const rb = b.extents.x * absR[i][0] + b.extents.y * absR[i][1] + b.extents.z * absR[i][2];
        if (Math.abs(v.dot(a.axes[i])) > ra + rb) return false;
      }
      
      // 2. Sprawdź 3 osie lokalne OBB B
      for (let i = 0; i < 3; i++) {
        const ra = a.extents.x * absR[0][i] + a.extents.y * absR[1][i] + a.extents.z * absR[2][i];
        const rb = (i === 0) ? b.extents.x : (i === 1) ? b.extents.y : b.extents.z;
        if (Math.abs(v.dot(b.axes[i])) > ra + rb) return false;
      }
      
      // 3. Sprawdź 9 osi iloczynów wektorowych (a.axes[i] x b.axes[j])
      const tA = new THREE.Vector3(v.dot(a.axes[0]), v.dot(a.axes[1]), v.dot(a.axes[2]));
      
      // a0 x b0
      if (Math.abs(tA.z * R[1][0] - tA.y * R[2][0]) > a.extents.y * absR[2][0] + a.extents.z * absR[1][0] + b.extents.y * absR[0][2] + b.extents.z * absR[0][1]) return false;
      // a0 x b1
      if (Math.abs(tA.z * R[1][1] - tA.y * R[2][1]) > a.extents.y * absR[2][1] + a.extents.z * absR[1][1] + b.extents.x * absR[0][2] + b.extents.z * absR[0][0]) return false;
      // a0 x b2
      if (Math.abs(tA.z * R[1][2] - tA.y * R[2][2]) > a.extents.y * absR[2][2] + a.extents.z * absR[1][2] + b.extents.x * absR[0][1] + b.extents.y * absR[0][0]) return false;
      
      // a1 x b0
      if (Math.abs(tA.x * R[2][0] - tA.z * R[0][0]) > a.extents.x * absR[2][0] + a.extents.z * absR[0][0] + b.extents.y * absR[1][2] + b.extents.z * absR[1][1]) return false;
      // a1 x b1
      if (Math.abs(tA.x * R[2][1] - tA.z * R[0][1]) > a.extents.x * absR[2][1] + a.extents.z * absR[0][1] + b.extents.x * absR[1][2] + b.extents.z * absR[1][0]) return false;
      // a1 x b2
      if (Math.abs(tA.x * R[2][2] - tA.z * R[0][2]) > a.extents.x * absR[2][2] + a.extents.z * absR[0][2] + b.extents.x * absR[1][1] + b.extents.y * absR[1][0]) return false;
      
      // a2 x b0
      if (Math.abs(tA.y * R[0][0] - tA.x * R[1][0]) > a.extents.x * absR[1][0] + a.extents.y * absR[0][0] + b.extents.y * absR[2][2] + b.extents.z * absR[2][1]) return false;
      // a2 x b1
      if (Math.abs(tA.y * R[0][1] - tA.x * R[1][1]) > a.extents.x * absR[1][1] + a.extents.y * absR[0][1] + b.extents.x * absR[2][2] + b.extents.z * absR[2][0]) return false;
      // a2 x b2
      if (Math.abs(tA.y * R[0][2] - tA.x * R[1][2]) > a.extents.x * absR[1][2] + a.extents.y * absR[0][2] + b.extents.x * absR[2][1] + b.extents.y * absR[2][0]) return false;

      return true;
    };

    const meshes = [];
    this.scene.carGroup.traverse((child) => {
      if (child.isMesh && child.visible && child.userData && child.userData.name) {
        const name = child.userData.name;
        
        // Pomijaj zarysy, pomocnicze płaszczyzny, linie i punkty referencyjne
        if (
          name.includes("(Zarys)") ||
          name.includes("Zarysy") ||
          name.includes("Datum") ||
          name.includes("Punkt środka") ||
          name.includes("Centrum") ||
          name.includes("Centroid") ||
          name.includes("Oś Cyl") ||
          child.userData.isDatumLabel
        ) {
          return;
        }
        
        // Pomijaj efekty przepływu, płomienie, iskry i gazy
        if (
          name.includes("Gazy ssące") ||
          name.includes("Spaliny") ||
          name.includes("Strumień") ||
          name.includes("Płomień") ||
          name.includes("Iskra")
        ) {
          return;
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            if (child.material.every(m => m.opacity !== undefined && m.opacity < 0.15)) return;
          } else if (child.material.opacity !== undefined && child.material.opacity < 0.15) {
            return;
          }
        }

        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        if (!bbox) return;

        // Lokalny środek i półwymiary (extents)
        const localCenter = new THREE.Vector3().addVectors(bbox.min, bbox.max).multiplyScalar(0.5);
        const localExtents = new THREE.Vector3().subVectors(bbox.max, bbox.min).multiplyScalar(0.5);
        
        // Tolerancja montażowa: margines 6mm (usuwa fałszywe dotknięcia płaszczyzn i złączek)
        const margin = 0.006;
        localExtents.x = Math.max(0.001, localExtents.x - Math.min(margin, localExtents.x * 0.25));
        localExtents.y = Math.max(0.001, localExtents.y - Math.min(margin, localExtents.y * 0.25));
        localExtents.z = Math.max(0.001, localExtents.z - Math.min(margin, localExtents.z * 0.25));

        // Środek w przestrzeni świata
        const worldCenter = localCenter.clone().applyMatrix4(child.matrixWorld);

        // Wyciągnij znormalizowane osie obrotu i skalowanie z macierzy świata
        const e = child.matrixWorld.elements;
        const col0 = new THREE.Vector3(e[0], e[1], e[2]);
        const col1 = new THREE.Vector3(e[4], e[5], e[6]);
        const col2 = new THREE.Vector3(e[8], e[9], e[10]);

        const scaleX = col0.length() || 1;
        const scaleY = col1.length() || 1;
        const scaleZ = col2.length() || 1;

        const u0 = col0.clone().normalize();
        const u1 = col1.clone().normalize();
        const u2 = col2.clone().normalize();

        const extents = new THREE.Vector3(
          localExtents.x * scaleX,
          localExtents.y * scaleY,
          localExtents.z * scaleZ
        );

        // Sfera ograniczająca do szybkiej fazy wstępnej (broad-phase)
        const radius = extents.length();
        const broadSphere = new THREE.Sphere(worldCenter, radius);

        // Identyfikator cylindra (jeśli element należy do danego cylindra)
        let cylId = null;
        let p = child.parent;
        while (p) {
          if (p.userData && p.userData.cylId !== undefined) {
            cylId = p.userData.cylId;
            break;
          }
          p = p.parent;
        }

        meshes.push({
          name: name,
          cylId: cylId,
          mesh: child,
          obb: {
            center: worldCenter,
            extents: extents,
            axes: [u0, u1, u2]
          },
          broadSphere: broadSphere
        });
      }
    });

    // Sprawdzenie, czy dwa elementy tworzą zamierzony, zintegrowany mechanizm montażowy
    const isConnectedPair = (a, b) => {
      const nA = a.name.toLowerCase();
      const nB = b.name.toLowerCase();

      // 1. Te same części
      if (nA === nB && a.cylId === b.cylId) return true;

      // 2. Części tego samego zespołu cylindra (tłok, pierścienie, sworzeń, zawory, świeca w jednym cylindrze)
      if (a.cylId !== null && b.cylId !== null && a.cylId === b.cylId) return true;

      // 2b. SPRAWDZENIE MIĘDZYCYLINDROWE:
      // Tłoki, korbowody, sworznie, pierścienie i tuleje różnych cylindrów (a.cylId !== b.cylId)
      // NIGDY nie są ignorowane - ich kolizja w 3D to błąd konstrukcyjny!
      const isCylPartA = nA.includes("tłok") || nA.includes("tlok") || nA.includes("korbowód") || nA.includes("korbowod") || nA.includes("sworzeń") || nA.includes("sworzen") || nA.includes("pierścień") || nA.includes("pierscien") || nA.includes("tuleja") || nA.includes("półka") || nA.includes("polka") || nA.includes("trzon") || nA.includes("stopa") || nA.includes("panewka");
      const isCylPartB = nB.includes("tłok") || nB.includes("tlok") || nB.includes("korbowód") || nB.includes("korbowod") || nB.includes("sworzeń") || nB.includes("sworzen") || nB.includes("pierścień") || nB.includes("pierscien") || nB.includes("tuleja") || nB.includes("półka") || nB.includes("polka") || nB.includes("trzon") || nB.includes("stopa") || nB.includes("panewka");
      if (a.cylId !== null && b.cylId !== null && a.cylId !== b.cylId && isCylPartA && isCylPartB) {
        return false;
      }

      // 2c. IGNOROWANIE ZAKRZYWIONYCH RUR (Fałszywe kolizje przez ogromny OBB dla TubeGeometry)
      const isCurvedTubeA = nA.includes("wąż chłodnicy") || nA.includes("waz chlodnicy") || nA.includes("kolektor wydechowy") || nA.includes("rura");
      const isCurvedTubeB = nB.includes("wąż chłodnicy") || nB.includes("waz chlodnicy") || nB.includes("kolektor wydechowy") || nB.includes("rura");
      const isInternalEngineA = isCylPartA || nA.includes("zawór") || nA.includes("zawor") || nA.includes("świeca") || nA.includes("swieca") || nA.includes("wtryskiwacz") || nA.includes("izolator");
      const isInternalEngineB = isCylPartB || nB.includes("zawór") || nB.includes("zawor") || nB.includes("świeca") || nB.includes("swieca") || nB.includes("wtryskiwacz") || nB.includes("izolator");
      if ((isCurvedTubeA && isInternalEngineB) || (isCurvedTubeB && isInternalEngineA)) {
        return true;
      }
      
      // Dodatkowo ignoruj rury między sobą, bo OBB na to nie pozwala (np. 4 rury kolektora wchodzą na siebie z powodu luźnych bounding boxów)
      if (isCurvedTubeA && isCurvedTubeB) {
        return true;
      }

      // 3. Rama nośna podwozia i belki (Chassis frame, subframes, crossmembers, side sills)
      const chTerms = ["rama", "podłużnic", "podluznic", "belka", "kołysk", "kolysk", "subframe", "próg", "prog", "pas przedni", "pas tylny", "zderzak"];
      const isChassisA = chTerms.some(t => nA.includes(t));
      const isChassisB = chTerms.some(t => nB.includes(t));

      // 4. Zawieszenie i układ kierowniczy (Suspension & Steering)
      const suspTerms = ["wahacz", "amortyzator", "sprężyn", "sprezyn", "zwrotnic", "łącznik", "lacznik", "stabilizator", "drążek", "drazek", "kierownic", "maglownic"];
      const isSuspA = suspTerms.some(t => nA.includes(t));
      const isSuspB = suspTerms.some(t => nB.includes(t));

      // 5. Koła, felgi, opony i hamulce (Wheels, Rims, Tires, Brakes)
      const whTerms = ["koło", "kolo", "felga", "opona", "piasta", "rant", "śruba mocująca", "sruba mocujaca", "tarcza hamulcowa", "dzwon tarczy", "zacisk", "zwrotnica"];
      const isWheelA = whTerms.some(t => nA.includes(t));
      const isWheelB = whTerms.some(t => nB.includes(t));

      // 6. Układ korbowo-tłokowy (Crankshaft, conrods, pistons, bearings, flywheel)
      const isCrankA = nA.includes("wał korbowy") || nA.includes("wal korbowy") || nA.includes("czop") || nA.includes("wykorbienie") || nA.includes("przeciwwaga") || nA.includes("przeciwciężar") || nA.includes("ramię") || nA.includes("snout") || nA.includes("koło zębate wału") || nA.includes("koło pasowe wału") || nA.includes("koło zamachowe") || nA.includes("kołnierz");
      const isCrankB = nB.includes("wał korbowy") || nB.includes("wal korbowy") || nB.includes("czop") || nB.includes("wykorbienie") || nB.includes("przeciwwaga") || nB.includes("przeciwciężar") || nB.includes("ramię") || nB.includes("snout") || nB.includes("koło zębate wału") || nB.includes("koło pasowe wału") || nB.includes("koło zamachowe") || nB.includes("kołnierz");
      
      const isRodPistonA = nA.includes("korbowód") || nA.includes("korbowod") || nA.includes("trzon") || nA.includes("stopa") || nA.includes("główka") || nA.includes("panewka") || nA.includes("tulejka") || nA.includes("półka") || nA.includes("środnik") || nA.includes("śruba") || nA.includes("pokrywa stopy") || nA.includes("tłok") || nA.includes("tlok") || nA.includes("sworzeń") || nA.includes("sworzen") || nA.includes("pierścień") || nA.includes("pierscien") || nA.includes("seger");
      const isRodPistonB = nB.includes("korbowód") || nB.includes("korbowod") || nB.includes("trzon") || nB.includes("stopa") || nB.includes("główka") || nB.includes("panewka") || nB.includes("tulejka") || nB.includes("półka") || nB.includes("środnik") || nB.includes("śruba") || nB.includes("pokrywa stopy") || nB.includes("tłok") || nB.includes("tlok") || nB.includes("sworzeń") || nB.includes("sworzen") || nB.includes("pierścień") || nB.includes("pierscien") || nB.includes("seger");

      // 7. Rozrząd (Camshaft, valves, springs, retainers, timing belt)
      const tmTerms = ["wałek rozrządu", "walek rozrzadu", "krzywka", "koło wałka", "kolo walka", "pasek rozrządu", "pasek rozrzadu", "napinacz", "zawór", "zawor", "grzybek", "trzonek", "sprężyna zaworowa", "sprezyna zaworowa", "szklanka", "popychacz", "dźwigienka", "dzwigienka", "talerzyk", "snout"];
      const isTimingA = tmTerms.some(t => nA.includes(t));
      const isTimingB = tmTerms.some(t => nB.includes(t));

      // 8. Układ chłodzenia (Radiator, core, tanks, hoses, water pump, fan)
      const coTerms = ["chłodnic", "chlodnic", "lamela", "zbiornik", "wąż chłodnicy", "waz chlodnicy", "wentylator", "termostat", "pompa wody"];
      const isCoolingA = coTerms.some(t => nA.includes(t));
      const isCoolingB = coTerms.some(t => nB.includes(t));

      // 9. Układ wydechowy (Headers, downpipe, cat, muffler, tailpipe)
      const exTerms = ["wydech", "kolektor wydechowy", "kolektor zbiorczy", "y-pipe", "x-pipe", "downpipe", "flex pipe", "złącze elastyczne", "katalizator", "tłumik", "tlumik", "końcówka", "koncowka", "rura"];
      const isExhaustA = exTerms.some(t => nA.includes(t));
      const isExhaustB = exTerms.some(t => nB.includes(t));

      // 10. Układ dolotowy (Plenum, throttle, runners, injectors, air filter)
      const inTerms = ["plenum", "przepustnica", "klapa", "oś klapy", "kolektor dolotowy", "runner", "filtr", "wtryskiwacz", "listwa wtryskowa"];
      const isIntakeA = inTerms.some(t => nA.includes(t));
      const isIntakeB = inTerms.some(t => nB.includes(t));

      // 11. Układ napędowy (Gearbox, transaxle, clutch, differential, halfshafts, CV boots, prop shaft, PTU)
      const drTerms = ["skrzynia", "transaxle", "sprzęgło", "sprzeglo", "tarcza sprzęgła", "tarcza sprzegla", "docisk", "koło zamachowe", "kolo zamachowe", "dyferencjał", "dyferencjal", "wałek atakujący", "walek atakujacy", "koło talerzowe", "kolo talerzowe", "satelit", "krzyżak", "krzyzak", "kosz", "koło koronowe", "kolo koronowe", "półoś", "polos", "przegub", "boot", "driveshaft", "wał napędowy", "wal napedowy", "prop shaft", "ptu", "przekładnia kątowa", "bieg", "wałek wejściowy", "wałek wyjściowy", "synchronizator", "przesuwka"];
      const isDrivetrainA = drTerms.some(t => nA.includes(t));
      const isDrivetrainB = drTerms.some(t => nB.includes(t));

      // 12. Osprzęt paskowy (Alternator, serpentine belt, water pump pulley)
      const beltTerms = ["pasek", "koło pasowe", "napinacz", "rolka", "alternator", "pompa"];
      const isBeltA = beltTerms.some(t => nA.includes(t));
      const isBeltB = beltTerms.some(t => nB.includes(t));

      // Relacje konstrukcyjne (Subassembly Assembly Integrations)
      if (isChassisA && (isChassisB || isSuspB || isWheelB || isDrivetrainB || isCoolingB || isExhaustB)) return true;
      if (isChassisB && (isChassisA || isSuspA || isWheelA || isDrivetrainA || isCoolingA || isExhaustA)) return true;

      if (isSuspA && (isSuspB || isWheelB || isDrivetrainB)) return true;
      if (isSuspB && (isSuspA || isWheelA || isDrivetrainA)) return true;

      if (isWheelA && isWheelB) return true;
      if (isDrivetrainA && isDrivetrainB) return true;
      if (isCoolingA && (isCoolingB || isTimingB || isCrankB || isBeltB)) return true;
      if (isCoolingB && (isCoolingA || isTimingA || isCrankA || isBeltA)) return true;

      if (isCrankA && (isCrankB || isRodPistonB || isBeltB || isDrivetrainB)) return true;
      if (isCrankB && (isCrankA || isRodPistonA || isBeltA || isDrivetrainA)) return true;

      if (isRodPistonA && isRodPistonB) return true;
      if (isTimingA && (isTimingB || isCrankB || isRodPistonB || isIntakeB || isExhaustB)) return true;
      if (isTimingB && (isTimingA || isCrankA || isRodPistonA || isIntakeA || isExhaustA)) return true;

      if (isExhaustA && (isExhaustB || isDrivetrainB || isCrankB)) return true;
      if (isExhaustB && (isExhaustA || isDrivetrainA || isCrankA)) return true;

      if (isIntakeA && (isIntakeB || isCrankB)) return true;
      if (isIntakeB && (isIntakeA || isCrankA)) return true;

      if (isBeltA && (isBeltB || isCrankB || isCoolingB)) return true;
      if (isBeltB && (isBeltA || isCrankA || isCoolingA)) return true;

      return false;
    };

    const overlaps = [];
    for (let i = 0; i < meshes.length; i++) {
      for (let j = i + 1; j < meshes.length; j++) {
        const itemA = meshes[i];
        const itemB = meshes[j];

        if (isConnectedPair(itemA, itemB)) continue;

        // Faza 1: Szybki test sfer ograniczających (broad-phase)
        const distSq = itemA.obb.center.distanceToSquared(itemB.obb.center);
        const radSum = itemA.broadSphere.radius + itemB.broadSphere.radius;
        if (distSq > radSum * radSum) continue;

        // Faza 2: Precyzyjny test SAT dla OBB z tolerancją montażową
        if (testOBBIntersection(itemA.obb, itemB.obb)) {
          overlaps.push(`- <b>${itemA.name}</b> koliduje z <b>${itemB.name}</b>`);
        }
      }
    }

    const uniqueOverlaps = [...new Set(overlaps)];
    const deg = Math.round(((this.scene.crankAngle * 180 / Math.PI) % 720 + 720) % 720);
    return {
      totalChecked: meshes.length,
      collisions: uniqueOverlaps,
      rawList: uniqueOverlaps.map(str => str.replace(/<[^>]*>/g, '')),
      crankAngleDeg: deg
    };
  }

}
