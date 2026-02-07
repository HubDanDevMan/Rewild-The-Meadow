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
                <p>Bitte stellen Sie sicher, dass die Dateien <code>src/plants.json</code> existieren und die Applikation über einen Webserver gestartet wurde.</p>
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