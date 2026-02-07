/**
 * Wiesen-Evaluations-Tool
 * Logik für BFF Q2 und Aufwertungspotenzial
 * Sprache: Deutsch (CH)
 */

let state = {
    plants: [],
    measures: [],
    selectedQ2: new Set(),
    selectedPot: new Set(),
    potScore: 0
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const loadingEl = document.getElementById('loading-indicator');
    
    try {
        // Asynchrones Laden der Datensätze
        const [plantsResponse, measuresResponse] = await Promise.all([
            fetch('plants.json'),
            fetch('measures.json')
        ]);

        if (!plantsResponse.ok) throw new Error(`Fehler Pflanzen-DB: ${plantsResponse.status}`);
        if (!measuresResponse.ok) throw new Error(`Fehler Massnahmen-DB: ${measuresResponse.status}`);

        state.plants = await plantsResponse.json();
        state.measures = await measuresResponse.json();

        // Initialisierung erfolgreich
        loadingEl.style.display = 'none';
        renderQ2Plants();
        switchStage('stage-q2');
        setupEventListeners();

    } catch (error) {
        console.error("Systemfehler:", error);
        loadingEl.innerHTML = `
            <div style="color: #c62828; background: #ffebee; padding: 20px; border-radius: 8px;">
                <strong>Fehler beim Laden der Daten.</strong><br>
                Bitte prüfen Sie, ob die Dateien <code>plants.json</code> und <code>measures.json</code> vorhanden sind 
                und die Anwendung über einen Webserver läuft (CORS Policy).
            </div>`;
    }
}

function setupEventListeners() {
    // Stage 1: Q2
    document.getElementById('btn-eval-q2').addEventListener('click', evaluateQ2);
    
    // Stage 2: Potenzial Flora
    document.getElementById('btn-eval-pot-plants').addEventListener('click', () => {
        switchStage('stage-management');
    });

    // Stage 3: Management Potenzial
    document.getElementById('btn-calc-potential').addEventListener('click', calculateManagementPotential);

    // Stage 4: Ansaat
    document.getElementById('btn-eval-seeding').addEventListener('click', evaluateSeeding);
}

/* --- Navigation & UI --- */

function switchStage(stageId) {
    // Alle Sections verbergen
    document.querySelectorAll('main > section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active-stage');
    });
    
    // Ziel-Section anzeigen
    const target = document.getElementById(stageId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active-stage');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function createPlantCard(plant, selectionSetKey) {
    const el = document.createElement('div');
    el.className = 'plant-card';
    
    // Bildlogik mit Fallback
    const hasImage = plant.image && plant.image.trim() !== "";
    const imageHtml = hasImage 
        ? `<img src="${plant.image}" loading="lazy" alt="${plant.name}" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-icon\\'>✿</span>'">`
        : `<span class="placeholder-icon">✿</span>`;

    el.innerHTML = `
        <div class="plant-image-wrapper">${imageHtml}</div>
        <div class="plant-content">
            <span class="plant-name">${plant.name}</span>
            <span class="plant-bot">${plant.botanical_name}</span>
        </div>
    `;

    // Click Handler für Selektion
    el.addEventListener('click', () => {
        if (state[selectionSetKey].has(plant.id)) {
            state[selectionSetKey].delete(plant.id);
            el.classList.remove('selected');
        } else {
            state[selectionSetKey].add(plant.id);
            el.classList.add('selected');
        }
    });

    return el;
}

function renderQ2Plants() {
    const container = document.getElementById('q2-plant-list');
    container.innerHTML = '';
    state.plants.filter(p => p.is_q2).forEach(plant => {
        container.appendChild(createPlantCard(plant, 'selectedQ2'));
    });
}

function renderPotPlants() {
    const container = document.getElementById('pot-plant-list');
    container.innerHTML = '';
    state.plants.filter(p => !p.is_q2).forEach(plant => {
        container.appendChild(createPlantCard(plant, 'selectedPot'));
    });
}

/* --- Evaluierungs-Logik --- */

// SCHRITT 1
function evaluateQ2() {
    const count = state.selectedQ2.size;
    
    if (count > 8) {
        showResult('q2_very_good', count);
    } else if (count >= 6) {
        showResult('q2_good', count);
    } else {
        // Nicht Q2 -> Weiter zu Schritt 2
        renderPotPlants();
        switchStage('stage-potential-plants');
    }
}

// SCHRITT 3
function calculateManagementPotential() {
    // Punktesystem basierend auf Agridea-Merkblatt + User Journey
    
    // 1. Punkte durch Pflanzen (aus Schritt 2)
    const plantScore = state.selectedPot.size; 

    // 2. Standortfaktoren (jeweils 2 Punkte)
    let envScore = 0;
    if (document.getElementById('factor-neighbors').checked) envScore += 2;
    if (document.getElementById('factor-structure').checked) envScore += 2;

    // 3. Massnahmen (jeweils 1 Punkt als Commitment)
    const measureIds = ['meas-hay', 'meas-cut-time', 'meas-late-use', 'meas-autumn-grazing', 'meas-early'];
    let mgmtScore = 0;
    measureIds.forEach(id => {
        if (document.getElementById(id).checked) mgmtScore += 1;
    });

    const totalScore = plantScore + envScore + mgmtScore;
    state.potScore = totalScore;

    // Schwellenwert: 8 Punkte für erfolgreiche Aufwertung durch Bewirtschaftung
    if (totalScore >= 8) {
        showResult('mgmt_potential', totalScore);
    } else {
        switchStage('stage-seeding');
    }
}

// SCHRITT 4
function evaluateSeeding() {
    const exclusions = [
        document.getElementById('ex-shade').checked,
        document.getElementById('ex-wet').checked,
        document.getElementById('ex-yield').checked,
        document.getElementById('ex-weeds').checked
    ];

    // Wenn IRGENDEIN Ausschlusskriterium wahr ist -> Kein Potenzial
    const hasExclusion = exclusions.some(val => val === true);

    if (hasExclusion) {
        showResult('no_potential');
    } else {
        showResult('seeding_potential', state.potScore);
    }
}

/* --- Ergebnis-Darstellung --- */

function showResult(type, score = 0) {
    switchStage('stage-result');
    const titleEl = document.getElementById('result-title');
    const bodyEl = document.getElementById('result-body');
    
    let html = '';

    switch (type) {
        case 'q2_very_good':
            titleEl.innerText = "Qualitätsstufe II: Sehr gut erfüllt";
            titleEl.style.color = "var(--primary)";
            html = `
                <p>Mit <strong>${score} Zeigerpflanzen</strong> weist Ihre Fläche eine hohe biologische Qualität auf.</p>
                <div class="alert-box info">
                    <strong>Empfehlung:</strong> Führen Sie die bisherige Bewirtschaftung fort. 
                    Minimale Anpassungen genügen, um dieses hohe Niveau zu sichern.
                </div>`;
            break;

        case 'q2_good':
            titleEl.innerText = "Qualitätsstufe II: Erfüllt";
            titleEl.style.color = "var(--primary-light)";
            html = `
                <p>Mit <strong>${score} Zeigerpflanzen</strong> erreichen Sie knapp die Qualitätsstufe II.</p>
                <div class="alert-box info">
                    <strong>Empfehlung:</strong> Um die Qualität langfristig zu sichern, sollten Sie bestehende Massnahmen optimieren 
                    (z.B. späterer Schnittzeitpunkt oder reduzierter Düngereinsatz).
                </div>`;
            break;

        case 'mgmt_potential':
            titleEl.innerText = "Bewirtschaftungspotenzial vorhanden";
            titleEl.style.color = "#f57f17"; // Dunkles Gelb/Orange
            html = `
                <p>Die Q2-Kriterien sind aktuell nicht erfüllt, aber das Potenzial ist gut.</p>
                <p>Score: <strong>${score} Punkte</strong> (Pflanzen + Standort + Massnahmen)</p>
                
                <div class="alert-box info">
                    <strong>Strategie: Bestandeslenkung</strong><br>
                    Da Standortfaktoren und Ihre Bereitschaft zu Massnahmen positiv bewertet wurden, 
                    ist eine Aufwertung ohne Neuansaat realistisch. Fokus: Gräserunterdrückung und Förderung der bestehenden Kräuter.
                </div>
                <ul>
                    <li>Konsequente Umsetzung der gewählten Massnahmen.</li>
                    <li>Geduld: Entwicklung kann 3-5 Jahre dauern.</li>
                </ul>`;
            break;

        case 'seeding_potential':
            titleEl.innerText = "Ansaatpotenzial vorhanden";
            titleEl.style.color = "#f57f17";
            html = `
                <p>Die aktuelle Flora und Bewirtschaftung reichen für eine direkte Aufwertung nicht aus (Score: ${score}).</p>
                <div class="alert-box info">
                    <strong>Strategie: Neuansaat</strong><br>
                    Da keine Ausschlusskriterien (wie Schatten, Nässe oder Problemunkräuter) vorliegen, 
                    ist eine Neuansaat mit einer standortgerechten Mischung die erfolgversprechendste Option.
                </div>
                <p>Bitte beachten Sie die lokalen Vorgaben zur Saatbettbereitung.</p>`;
            break;

        case 'no_potential':
            titleEl.innerText = "Kein Aufwertungspotenzial";
            titleEl.style.color = "#c62828"; // Rot
            html = `
                <p>Leider ist diese Fläche für das Erreichen der Q2-Qualität ungeeignet.</p>
                <div class="alert-box warning">
                    <strong>Begründung:</strong>
                    Es liegen Ausschlusskriterien vor (z.B. ungünstige Exposition, Feuchte, zu hoher Ertrag oder Unkrautdruck).
                    Weder eine Anpassung der Bewirtschaftung noch eine Ansaat versprechen hier Erfolg.
                </div>`;
            break;
    }

    bodyEl.innerHTML = html;
}