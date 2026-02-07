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
    potScore: 0,
    resultType: '',
    history: [] // Stack für die Navigation
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
        // Initialer Startpunkt, kein History-Eintrag nötig
        switchStage('stage-q2', false); 
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
    /* --- Forward Navigation --- */
    
    // Stage 1: Q2
    document.getElementById('btn-eval-q2').addEventListener('click', evaluateQ2);
    
    // Stage 2: Potenzial Flora
    document.getElementById('btn-eval-pot-plants').addEventListener('click', () => {
        switchStage('stage-management');
        scrollToTop();
    });

    // Stage 3: Management Potenzial
    document.getElementById('btn-calc-potential').addEventListener('click', calculateManagementPotential);

    // Stage 4: Ansaat
    document.getElementById('btn-eval-seeding').addEventListener('click', evaluateSeeding);

    /* --- Backward Navigation --- */
    
    // Generischer Handler für alle Zurück-Buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', goBack);
    });

    /* --- External --- */
    document.getElementById('btn-open-gpt').addEventListener('click', openGptAssistant);
}

/* --- Navigation & UI --- */

/**
 * Wechselt die sichtbare Section.
 * @param {string} stageId - ID der Ziel-Section
 * @param {boolean} saveHistory - Ob der aktuelle Zustand in den Verlauf soll (Standard: true)
 */
function switchStage(stageId, saveHistory = true) {
    const activeEl = document.querySelector('.active-stage');
    
    // Falls wir navigieren, speichern wir, woher wir kommen
    if (saveHistory && activeEl && activeEl.id !== stageId) {
        state.history.push(activeEl.id);
    }

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

function scrollToTop() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

/**
 * Navigiert einen Schritt zurück im Verlauf.
 */
function goBack() {
    if (state.history.length === 0) return;
    
    // Letzten Eintrag holen
    const previousStageId = state.history.pop();
    
    // Navigation ohne erneuten History-Eintrag ausführen
    switchStage(previousStageId, false);
}

function createPlantCard(plant, selectionSetKey) {
    const el = document.createElement('div');
    el.className = 'plant-card';
    
    // Bildlogik mit Fallback
    const hasImage = plant.image && plant.image.trim() !== "";
    const imageHtml = hasImage 
        ? `<img src="${plant.image}" loading="lazy" alt="${plant.name}" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-icon\\'>✿</span>'">`
        : `<span class="placeholder-icon">✿</span>`;

    // Prüfung, ob bereits selektiert (beim Zurücknavigieren wichtig)
    if (state[selectionSetKey].has(plant.id)) {
        el.classList.add('selected');
    }

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
        scrollToTop();
    }
}

// SCHRITT 3
function calculateManagementPotential() {
    // Punktesystem basierend auf Agridea-Merkblatt
    
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

    // Schwellenwert: 12 Punkte für erfolgreiche Aufwertung durch Bewirtschaftung
    if (totalScore >= 12) {
        showResult('mgmt_potential', totalScore);
    } else {
        switchStage('stage-seeding');
        scrollToTop();
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
    state.resultType = type; // Speichern für GPT Export
    switchStage('stage-result');
    
    const titleEl = document.getElementById('result-title');
    const bodyEl = document.getElementById('result-body');
    
    // 1. Visuelle Konfiguration (Gauge & Farbe)
    const visualConfig = {
        'no_potential':    { angle: -72, color: "#d32f2f" }, // Rot
        'seeding_potential': { angle: -36, color: "#f57c00" }, // Orange
        'mgmt_potential':  { angle: 0,   color: "#fbc02d" }, // Gelb
        'q2_good':         { angle: 36,  color: "#7cb342" }, // Hellgrün
        'q2_very_good':    { angle: 72,  color: "#388e3c" }  // Dunkelgrün
    };

    // Fallback, falls Typ unbekannt
    const config = visualConfig[type] || { angle: -90, color: "#333" };

    // 2. Inhalte aus JSON laden
    const measureData = state.measures.find(m => m.tags.includes(type));
    
    // Titel setzen
    titleEl.innerText = measureData ? measureData.name : "Unbekanntes Ergebnis";
    titleEl.style.color = config.color;

    // Text formatieren
    let descriptionHtml = '';
    if (measureData) {
        descriptionHtml = formatDescription(measureData.description);
    } else {
        descriptionHtml = '<div class="alert-box warning">Keine Massnahmen in der Datenbank gefunden.</div>';
    }

    // 3. Score-Info zusammenbauen (falls relevant)
    let scoreInfo = '';
    if (score > 0) {
        scoreInfo = `<p style="font-weight: bold; margin-bottom: 1rem;">Erreichter Score / Anzahl Arten: ${score}</p>`;
    }

    // 4. HTML Zusammensetzen
    bodyEl.innerHTML = `
        <div class="gauge-container">
            <div class="gauge-body"></div>
            <div class="gauge-needle" id="gauge-needle-el"></div>
            <div class="gauge-hub"></div>
        </div>
        ${scoreInfo}
        <div class="generated-measures">
            ${descriptionHtml}
        </div>
    `;

    // Trigger für die Animation
    setTimeout(() => {
        const needle = document.getElementById('gauge-needle-el');
        if (needle) {
            needle.style.transform = `translateX(-50%) rotate(${config.angle}deg)`;
        }
    }, 50);
}

/**
 * Wandelt den Text aus dem JSON in HTML um.
 */
function formatDescription(rawText) {
    if (!rawText) return '';

    const lines = rawText.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
        let trimmed = line.trim();
        
        // URL-Erkennung
        trimmed = trimmed.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">Link öffnen</a>'
        );

        if (trimmed.startsWith('-')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${trimmed.substring(1).trim()}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            if (trimmed.length > 0) {
                html += `<p>${trimmed}</p>`;
            }
        }
    });

    if (inList) {
        html += '</ul>';
    }

    return html;
}

/* --- Export & GPT Integration --- */

function openGptAssistant() {
    window.open('https://chatgpt.com/g/g-69865543f52c81919e8a84a09ae88e93-biodiversitatsberater-labiola', '_blank');
}