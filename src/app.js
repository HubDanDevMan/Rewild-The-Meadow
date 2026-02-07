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
    resultType: '' // Speichert das finale Ergebnis für den Export
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

    // Resultat: GPT
    document.getElementById('btn-open-gpt').addEventListener('click', openGptAssistant);
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

    // Text formatieren (Markdown-ähnliche Listen zu HTML)
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

    // Trigger für die Animation (kurze Verzögerung nötig für DOM-Reflow)
    setTimeout(() => {
        const needle = document.getElementById('gauge-needle-el');
        if (needle) {
            needle.style.transform = `translateX(-50%) rotate(${config.angle}deg)`;
        }
    }, 50);
}

/**
 * Wandelt den Text aus dem JSON in HTML um.
 * Erwartet: 
 * - Zeilenumbrüche für Absätze
 * - Zeilen, die mit "- " beginnen für Listenpunkte
 * - URLs (http...) werden verlinkt
 */
function formatDescription(rawText) {
    if (!rawText) return '';

    const lines = rawText.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
        let trimmed = line.trim();
        
        // Einfache URL-Erkennung und Umwandlung in Link
        trimmed = trimmed.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">Link öffnen</a>'
        );

        if (trimmed.startsWith('-')) {
            // Listen-Start oder Fortsetzung
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            // Entferne das "-" am Anfang
            html += `<li>${trimmed.substring(1).trim()}</li>`;
        } else {
            // Falls wir in einer Liste waren, diese beenden
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            // Leere Zeilen ignorieren oder als Abstandhalter nutzen
            if (trimmed.length > 0) {
                html += `<p>${trimmed}</p>`;
            }
        }
    });

    // Falls am Ende noch eine Liste offen ist
    if (inList) {
        html += '</ul>';
    }

    return html;
}

/* --- Export & GPT Integration --- */

function openGptAssistant() {
    // 1. Daten zusammenstellen
    const q2PlantNames = state.plants
        .filter(p => state.selectedQ2.has(p.id))
        .map(p => p.name).join(', ');
        
    const potPlantNames = state.plants
        .filter(p => state.selectedPot.has(p.id))
        .map(p => p.name).join(', ');

    // Hilfsfunktion: Checkbox Status
    const isChecked = (id) => {
        const el = document.getElementById(id);
        return el && el.checked ? "JA" : "NEIN";
    };

    const promptText = `
HALLO BIODIVERSITÄTSBERATER.
Ich habe soeben eine Wiesen-Evaluation durchgeführt. Hier sind meine gesammelten Daten. Bitte analysiere diese und gib mir konkrete Empfehlungen für das weitere Vorgehen.

--- ERGEBNISZUSAMMENFASSUNG ---
Ergebnis-Typ: ${state.resultType}
Kalkulierter Score (Potenzial): ${state.potScore}

1. VORHANDENE FLORA
- Q2-Zeigerpflanzen: ${q2PlantNames || "(Keine ausgewählt)"}
- Potenzial-Arten: ${potPlantNames || "(Keine ausgewählt)"}

2. STANDORTFAKTOREN
- Sameneintrag aus Umgebung möglich: ${isChecked('factor-neighbors')}
- Günstige Struktur (mager): ${isChecked('factor-structure')}

3. MÖGLICHE MASSNAHMEN (Betriebliche Bereitschaft)
- Bodenheubereitung: ${isChecked('meas-hay')}
- Angepasster Schnittzeitpunkt: ${isChecked('meas-cut-time')}
- Späte letzte Nutzung: ${isChecked('meas-late-use')}
- Herbstweide: ${isChecked('meas-autumn-grazing')}
- Frühschnitt/Frühbeweidung: ${isChecked('meas-early')}

4. AUSSCHLUSSKRITERIEN (relevant für Ansaat)
- Schattige Lage: ${isChecked('ex-shade')}
- Feuchter Standort: ${isChecked('ex-wet')}
- Zu hoher Ertrag: ${isChecked('ex-yield')}
- Problemunkräuter vorhanden: ${isChecked('ex-weeds')}

Bitte erstelle basierend darauf einen kurzen Massnahmenplan.
`;

    // 2. In Zwischenablage kopieren
    navigator.clipboard.writeText(promptText)
        .then(() => {
            alert("✅ Daten kopiert!\n\nDas Chat-Fenster wird jetzt geöffnet. Füge die Daten dort einfach mit 'Ctrl+V' (oder Rechtsklick -> Einfügen) ein.");
            // 3. Link öffnen
            window.open('https://chatgpt.com/g/g-69865543f52c81919e8a84a09ae88e93-biodiversitatsberater-labiola', '_blank');
        })
        .catch(err => {
            console.error('Clipboard failed', err);
            alert("⚠️ Kopieren fehlgeschlagen.\nBitte die Daten manuell übertragen oder Browser-Berechtigungen prüfen.");
            window.open('https://chatgpt.com/g/g-69865543f52c81919e8a84a09ae88e93-biodiversitatsberater-labiola', '_blank');
        });
}
