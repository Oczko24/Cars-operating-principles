/**
 * Cars-operating-principles - Baza tekstów i wiedzy inżynieryjnej (i18n)
 * Wszystkie teksty, opisy, historia i nazwy części znajdują się w tym pliku.
 */

export const i18n = {
  pl: {
    appTitle: "Cars: Operating Principles",
    subtitle: "Interaktywny sandbox & przewodnik po inżynierii samochodowej",
    
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

    // Categories
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
  }
};

