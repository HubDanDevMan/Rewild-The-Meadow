# Source Code Listing


I want to build a static website where a User (farmer) can get an
evaluation of a meadow (potential evaluation for Q2 BFF subsidy).

## File structure

Here’s an overview of the file structure:

``` bash
src
├── app.js
├── index.html
├── measures.json
├── plants.json
└── style.css
```

## File content

This is the content of each file:

### `src/app.js`

``` js
// Globale State-Definition
let state = {
    plants: [],       // Wird aus JSON befüllt
    measures: [],     // Optional: falls Sie measures.json auch laden
    selectedQ2: new Set(),
    selectedPot: new Set(),
    potScore: 0
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        // Parallelisiertes Laden der Ressourcen für bessere Performance
        // Hier gehen wir davon aus, dass index.html im Root liegt und die JSONs in ./src/
        const [plantsResponse, measuresResponse] = await Promise.all([
            fetch('plants.json'),
            fetch('measures.json')
        ]);

        // HTTP-Fehlerprüfung (Fetch wirft keinen Fehler bei 404, daher manuelle Prüfung nötig)
        if (!plantsResponse.ok) throw new Error(`HTTP error plants.json: ${plantsResponse.status}`);
        if (!measuresResponse.ok) throw new Error(`HTTP error measures.json: ${measuresResponse.status}`);

        // Parsing der JSON-Daten
        state.plants = await plantsResponse.json();
        state.measures = await measuresResponse.json();

        console.log("Daten erfolgreich geladen:", state.plants.length, "Pflanzen.");

        // Initiales Rendering
        renderQ2Plants();
        setupEventListeners();

    } catch (error) {
        console.error("Kritischer Fehler beim Laden der Applikationsdaten:", error);
        
        // Fallback für den User im UI anzeigen
        document.getElementById('app').innerHTML = `
            <div style="color: #d32f2f; padding: 20px; text-align: center;">
                <h3>Daten konnten nicht geladen werden.</h3>
                <p>Bitte stellen Sie sicher, dass die Dateien <code>plants.json</code> existieren und die Applikation über einen Webserver gestartet wurde.</p>
                <small>Technische Details: ${error.message}</small>
            </div>
        `;
    }
}

function setupEventListeners() {
    document.getElementById('btn-eval-q2').addEventListener('click', evaluateQ2);
    document.getElementById('btn-eval-pot-plants').addEventListener('click', () => switchStage('stage-management'));
    document.getElementById('btn-mgmt-yes').addEventListener('click', () => showResult('management'));
    document.getElementById('btn-mgmt-no').addEventListener('click', () => switchStage('stage-seeding'));
    document.getElementById('btn-eval-seeding').addEventListener('click', evaluateSeeding);
}

/* --- Render Logic --- */

function renderQ2Plants() {
    const container = document.getElementById('q2-plant-list');
    const q2Plants = state.plants.filter(p => p.is_q2);
    
    q2Plants.forEach(plant => {
        container.appendChild(createPlantCard(plant, 'selectedQ2'));
    });
}

function renderPotPlants() {
    const container = document.getElementById('pot-plant-list');
    const potPlants = state.plants.filter(p => !p.is_q2);
    
    potPlants.forEach(plant => {
        container.appendChild(createPlantCard(plant, 'selectedPot'));
    });
}

function createPlantCard(plant, setKey) {
    const el = document.createElement('div');
    el.className = 'plant-card';
    
    // Position relative für den Selektions-Haken
    el.style.position = 'relative'; 

    // Prüfung: Existiert ein Bild-Link?
    const hasImage = plant.image && plant.image.trim() !== "";
    
    // HTML-Konstruktion
    // Wir nutzen einen Error-Handler (onerror), falls der externe Link tot ist.
    const imageHtml = hasImage 
        ? `<img src="${plant.image}" alt="${plant.name}" loading="lazy" onerror="this.style.display='none'; this.parentNode.innerHTML='<span class=\\'placeholder-icon\\'>✿</span>'">`
        : `<span class="placeholder-icon">✿</span>`; // Fallback-Symbol (Blume)

    el.innerHTML = `
        <div class="plant-image-wrapper">
            ${imageHtml}
        </div>
        <div class="plant-content">
            <div class="plant-name">${plant.name}</div>
            <div class="plant-bot">${plant.botanical_name}</div>
        </div>
    `;
    
    // Event Listener für Klick (Toggle-Logik bleibt gleich)
    el.addEventListener('click', () => {
        if (state[setKey].has(plant.id)) {
            state[setKey].delete(plant.id);
            el.classList.remove('selected');
        } else {
            state[setKey].add(plant.id);
            el.classList.add('selected');
        }
    });

    return el;
}

function switchStage(stageId) {
    document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('main > section').forEach(el => el.classList.remove('active-stage'));
    
    const target = document.getElementById(stageId);
    target.classList.remove('hidden');
    target.classList.add('active-stage');
}

/* --- Evaluation Logic --- */

function evaluateQ2() {
    const count = state.selectedQ2.size;

    if (count > 8) {
        showResult('very_good');
    } else if (count >= 6) {
        showResult('good');
    } else {
        // Nicht Q2 -> Wechsel in den Potenzial-Modus
        renderPotPlants();
        switchStage('stage-potential-plants');
    }
}

function evaluateSeeding() {
    // Ausschlusskriterien prüfen
    const exclusions = [
        document.getElementById('ex-shade').checked,
        document.getElementById('ex-wet').checked,
        document.getElementById('ex-yield').checked,
        document.getElementById('ex-weeds').checked
    ];

    const hasExclusion = exclusions.some(e => e === true);

    if (hasExclusion) {
        showResult('no_potential');
    } else {
        showResult('seeding_potential');
    }
}

/* --- Result Handling --- */

function showResult(type) {
    switchStage('stage-result');
    const title = document.getElementById('result-title');
    const body = document.getElementById('result-body');
    
    // Berechnung der Potenzial-Punkte (nur relevant wenn wir im Potenzial-Pfad sind)
    const potPoints = state.selectedPot.size; 

    let content = "";

    switch (type) {
        case 'very_good':
            title.textContent = "Ergebnis: Deutlich Q2 (Sehr gut)";
            content = `<p>Der Bestand weist eine hohe Qualität auf (> 8 Zeigerpflanzen).</p>
                       <div class="result-box"><strong>Empfehlung:</strong> Minimale Massnahmen fortführen, um das Niveau zu halten.</div>`;
            break;
        case 'good':
            title.textContent = "Ergebnis: Knapp Q2 (Gut)";
            content = `<p>Der Bestand erfüllt die Kriterien knapp (6-7 Zeigerpflanzen).</p>
                       <div class="result-box"><strong>Empfehlung:</strong> Bestehende Massnahmen optimieren, um die Qualität zu sichern.</div>`;
            break;
        case 'management':
            title.textContent = "Potenzialanalyse: Bewirtschaftungspotenzial vorhanden";
            content = `<p>Q2 Kriterien nicht erfüllt. <br>Erreichte Zusatzpunkte durch Nicht-Q2-Arten: <strong>${potPoints}</strong></p>
                       <div class="result-box">
                           <strong>Empfohlene Strategie:</strong> Bestandeslenkung durch Gräserunterdrückung und Blumenförderung.
                           <ul>
                               <li>Schnittzeitpunkt anpassen</li>
                               <li>Bodenheubereitung (Verzicht auf Silage)</li>
                               <li>Späte letzte Nutzung (Bestand tief in den Winter gehen lassen)</li>
                               <li>Herbstweide zur Bestandesreduktion</li>
                               <li>Frühschnitt oder Frühbeweidung</li>
                           </ul>
                       </div>`;
            break;
        case 'seeding_potential':
            title.textContent = "Potenzialanalyse: Ansaatpotenzial vorhanden";
            content = `<p>Q2 Kriterien nicht erfüllt und kein direktes Bewirtschaftungspotenzial.<br>Erreichte Zusatzpunkte durch Nicht-Q2-Arten: <strong>${potPoints}</strong></p>
                       <div class="result-box">
                           <strong>Analyse:</strong> Standortfaktoren (Exposition, Feuchte, Ertrag) sprechen nicht gegen eine Ansaat. 
                           Da keine Problemunkräuter (Blacken/Disteln) vorhanden sind, ist eine Neuansaat eine valide Option.
                       </div>`;
            break;
        case 'no_potential':
            title.textContent = "Potenzialanalyse: Kein Potenzial";
            content = `<p>Q2 Kriterien nicht erfüllt.<br>Erreichte Zusatzpunkte durch Nicht-Q2-Arten: <strong>${potPoints}</strong></p>
                       <div class="result-box" style="border-left-color: #d32f2f;">
                           <strong>Ergebnis:</strong> Weder durch Bewirtschaftung noch durch Ansaat ist ein Erreichen von Q2 realistisch. 
                           Ausschlusskriterien (wie Schatten, Nässe, zu hoher Ertrag oder Unkrautdruck) verhindern eine erfolgreiche Aufwertung.
                       </div>`;
            break;
    }

    body.innerHTML = content;
}
```

### `src/index.html`

``` html
<!DOCTYPE html>
<html lang="de-CH">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wiesen-Evaluations-Tool</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <header>
        <h1>Wiesen-Evaluation BFF Q2</h1>
    </header>

    <main id="app">
        <section id="stage-q2" class="active-stage">
            <h2>Schritt 1: Q2 Zeigerpflanzen</h2>
            <p>Bitte wählen Sie alle vorhandenen Pflanzen aus.</p>
            <div id="q2-plant-list" class="plant-grid"></div>
            <button id="btn-eval-q2" class="primary-btn">Auswerten</button>
        </section>

        <section id="stage-potential-plants" class="hidden">
            <h2>Schritt 2: Potenzial-Erfassung</h2>
            <p>Q2 wurde nicht direkt erreicht. Bitte erfassen Sie weitere Arten für die Punktzahl.</p>
            <div id="pot-plant-list" class="plant-grid"></div>
            <button id="btn-eval-pot-plants" class="primary-btn">Weiter zur Analyse</button>
        </section>

        <section id="stage-management" class="hidden">
            <h2>Schritt 3: Analyse des Bewirtschaftungspotenzials</h2>
            <p>Bitte beantworten Sie die folgenden Fragen zur Fläche und Ihrer Betriebsführung, um das Aufwertungspotenzial zu berechnen.</p>
            
            <div class="assessment-card">
                <h3>A. Standort & Umgebung (basierend auf Agridea Merkblatt)</h3>
                <div class="checklist">
                    <label>
                        <input type="checkbox" id="factor-neighbors" value="2">
                        <strong>Samen-Eintrag:</strong> Angrenzend befinden sich bereits artenreiche Wiesen, Weiden oder Säume (Distanz < 20m).
                    </label>
                    <label>
                        <input type="checkbox" id="factor-structure" value="2">
                        <strong>Bestandesstruktur:</strong> Die Wiese hat in den letzten zwei Jahren zum üblichen Schnittzeitpunkt <em>nicht</em> gelagert (stehender Bestand).
                    </label>
                </div>

                <h3>B. Bewirtschaftungs-Massnahmen</h3>
                <p>Welche der folgenden lenkenden Massnahmen können Sie betrieblich realistisch umsetzen?</p>
                <div class="checklist">
                    <label>
                        <input type="checkbox" id="meas-hay" value="1">
                        <strong>Bodenheubereitung:</strong> Verzicht auf Silage, damit Samen ausfallen können.
                    </label>
                    <label>
                        <input type="checkbox" id="meas-cut-time" value="1">
                        <strong>Angepasster Schnittzeitpunkt:</strong> Schnitt zur Vollblüte der Gräser (bzw. gemäss ÖQV-Vorgaben).
                    </label>
                    <label>
                        <input type="checkbox" id="meas-late-use" value="1">
                        <strong>Späte letzte Nutzung:</strong> Bestand geht "tief" (kurz) in den Winter.
                    </label>
                    <label>
                        <input type="checkbox" id="meas-autumn-grazing" value="1">
                        <strong>Herbstweide:</strong> Nutzung durch Weidetiere im Herbst zur Bestandeslenkung.
                    </label>
                    <label>
                        <input type="checkbox" id="meas-early" value="1">
                        <strong>Frühschnitt oder Frühbeweidung:</strong> Zur Unterdrückung der Gräserkonkurrenz im zeitigen Frühjahr.
                    </label>
                </div>
            </div>

            <button id="btn-calc-potential" class="primary-btn">Potenzial berechnen</button>
        </section>

        <section id="stage-seeding" class="hidden">
            <h2>Schritt 4: Ansaatpotenzial</h2>
            <p>Bitte haken Sie alle zutreffenden Ausschlusskriterien an:</p>
            <div class="checklist">
                <label><input type="checkbox" id="ex-shade"> Schattige Lage (Exposition)</label>
                <label><input type="checkbox" id="ex-wet"> Feuchter Standort</label>
                <label><input type="checkbox" id="ex-yield"> Ertrag > 80 dt TS/Jahr</label>
                <label><input type="checkbox" id="ex-weeds"> Vorkommen von Blacken oder Ackerkratzdisteln</label>
            </div>
            <button id="btn-eval-seeding" class="primary-btn">Ansaat prüfen</button>
        </section>

        <section id="stage-result" class="hidden">
            <h2 id="result-title"></h2>
            <div id="result-body"></div>
            <button onclick="location.reload()" class="text-btn">Neu starten</button>
        </section>
    </main>

    <script src="app.js"></script>
</body>
</html>
```

### `src/measures.json`

``` json
[
    {
        "id": "1",
        "name": "bla",
        "description": "blabla",
        "tags": [ "time" ],
        "image": "https://..."
    }
]
```

### `src/plants.json`

``` json
[
    {
        "id": "CMPSS",
        "name": "Glockenblumen",
        "botanical_name": "Campanula sp.",
        "image": "https://www.intratuin.de/media/wysiwyg/Campanula_persicifolia_Coerulea_.jpg",
        "is_q2": true
    },
    {
        "id": "KNASS",
        "name": "Witwenblumen und Skabiosen",
        "botanical_name": "Knautia sp., Scabiosa sp.",
        "image": "",
        "is_q2": false
    },
    {
        "id": "CENSS",
        "name": "Flockenblumen",
        "botanical_name": "Centaurea sp.",
        "image": "",
        "is_q2": true
    },
    {
        "id": "ENIAN",
        "name": "Enziane",
        "botanical_name": "Gentiana sp. (ohne Gelber Enzian)",
        "image": "",
        "is_q2": true
    }
]
```

### `src/style.css`

``` css
:root {
    --primary: #2c5e2e;
    --accent: #4a8f4d;
    --bg: #f4f7f4;
    --text: #333;
    --white: #ffffff;
    --radius: 8px;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg);
    color: var(--text);
    margin: 0;
    padding: 20px;
    line-height: 1.6;
}

header {
    max-width: 800px;
    margin: 0 auto 40px auto;
    text-align: center;
}

main {
    max-width: 800px;
    margin: 0 auto;
}

.hidden { display: none; }
.active-stage { display: block; animation: fadeIn 0.5s ease; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Plant Grid Layout */
.plant-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.plant-card {
    background: var(--white);
    border: 1px solid #ddd;
    border-radius: var(--radius);
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    display: flex;
    flex-direction: column;
    text-align: left; /* Besser für Lesbarkeit bei Titel/Untertitel */
    overflow: hidden; /* Damit Bilder die Ecken nicht überragen */
}

/* Neuer Wrapper für das Bild */
.plant-image-wrapper {
    width: 100%;
    height: 160px; /* Fixe Höhe definiert die Einheitlichkeit des Grids */
    background-color: #f5f5f5; /* Hellgrauer Hintergrund für Platzhalter */
    border-radius: 4px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
}

.plant-image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover; /* Schneidet Bild zu, verzerrt nicht */
    display: block;
    transition: transform 0.3s ease;
}

/* Hover-Effekt: Leichter Zoom des Bildes */
.plant-card:hover .plant-image-wrapper img {
    transform: scale(1.05);
}

/* Fallback-Icon, wenn kein Bild vorhanden ist */
.placeholder-icon {
    font-size: 2rem;
    color: #ccc;
    font-weight: bold;
}

/* Selektions-Status */
.plant-card.selected {
    border-color: var(--primary);
    background-color: #f1f8e9;
    box-shadow: 0 4px 12px rgba(44, 94, 46, 0.2);
}

/* Kleiner Haken, wenn selektiert */
.plant-card.selected::after {
    content: "✔";
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--primary);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    text-align: center;
    line-height: 24px;
    font-size: 14px;
}

.plant-name { font-weight: 600; margin-bottom: 4px; }
.plant-bot { font-style: italic; font-size: 0.85em; color: #666; }

/* Buttons & Inputs */
.primary-btn, .secondary-btn {
    padding: 12px 24px;
    border-radius: var(--radius);
    border: none;
    font-size: 1rem;
    cursor: pointer;
    display: block;
    width: 100%;
    margin-bottom: 12px;
}

.primary-btn { background-color: var(--primary); color: white; }
.primary-btn:hover { background-color: var(--accent); }

.secondary-btn { background-color: var(--white); border: 2px solid var(--primary); color: var(--primary); }
.secondary-btn:hover { background-color: #f0f0f0; }

.checklist label {
    display: block;
    padding: 12px;
    background: var(--white);
    margin-bottom: 8px;
    border-radius: var(--radius);
    cursor: pointer;
}

.result-box {
    background: var(--white);
    padding: 24px;
    border-radius: var(--radius);
    border-left: 5px solid var(--primary);
}
```

## Task

Ich muss basierend auf der folgenden User Journey eine statische
Webapplikation entwickeln:

    Der User wird gefragt, welche Zeigerpflanzen auf seiner Wiese vorkommen. Dafür werden nur die Objekte aus `plants.json` angezeigt, die `"is_q2" = true` haben.

    - Wenn mehr als 8 Zeigerpflanzen, ist es *deutlich* Q2.
      --> User Journey endet mit einem "sehr gut", es werden minimale Massnahmen vorgeschlagen, um bei diesem Niveau zu bleiben.

    - Wenn es 6 oder 7 Zeigerpflanzen, ist es knapp Q2.
      --> User Journey endet mit einem "gut", es werden  Massnahmen vorgeschlagen, um bei diesem Niveau zu bleiben.

    - Wenn es nicht Q2 ist, dann muss bestimmt werden, welche Potenzial-Punktzahl die Wiese erhält.

    Die Punktzahl wird erst gerechnet, wenn nötig; also im letzten Fall. Für die Punktzahl-Berechnung werden:

    1. Nochmals weitere Pflanzen abgefragt, und zwar diejenigen, die `"is_q2" = false` haben. Jede Pflanze gibt einen Punkt.

    2. Zusätzlich werden die Fragen gestellt:

      a. Kann durch gezielte Bewirtschaftung Q2 erreicht werden (hat Bewirtschaftungspotenzial). Das beinhaltet, bestehenden Bestand in die richtige Richtung zu lenken. Mit Massnahmen wir Schnittzeitpunkt, Bodenheubereitung (d.h. nicht silieren), letzte Nutzungs so spät wie möglich sodass Bestand "tief" in den Winter geht, Herbstweide (senkt Bestand im Herbst zusätzlich), Frühschnitt *oder* Frühbeweidung. --> Bei allen Massnahmen geht es um Grassunterdrückung und Blumenförderung.
      
      b. Oder es gibt kein Bewirtschaftungspotenzial. Dann muss geprüft werden, ob ein Ansaatpotenzial besteht. Das Ansaatpotenzial wird geprüft, indem

      - Exposition (Hangausrichtung) --> Wenn schattig, kein Potenzial
      - Feuchtigkeitshaushalt --> Wenn feucht, kein Potenzial
      - Ertragsniveau des Bestandes --> Wenn mehr als 80 dt TS pro Jahr, kein Potenzial.

      Ausserdem wichtig, wenn es Blacken oder Ackerkratzdisteln hat (weil wenn ich da ansäe, keimen grosse Mengen schlafender Blackensamen) dann besteht *sicher* kein Ansaatpotenzial, wegen zu grosser Gefahr.

Beachte: Das Layout soll einfach verständlich sein, modern aussehen,
sauber aussehen.
