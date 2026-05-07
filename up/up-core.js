// onstage-core.js

const _part1 = 'https://docs.google.com/spreadsheets/d/e/';
const _part2 = '2PACX-1vRIcDPtDeiXmAfo-IiqbiL-aHz7CP-E2-tSGkm_10cIhlWwegG7UfH56jG8F1No6AgV1nfMwaOJ1uVA';
const _part3 = '/pub?gid=0&single=true&output=csv';

const SHEET_URL = _part1 + _part2 + _part3;

let globalSchedule = [];

// Fonction de parsing robuste
function parseCSVData(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
        let values = [];
        let currentVal = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(currentVal.trim()); currentVal = ''; }
            else currentVal += char;
        }
        values.push(currentVal.trim());
        return headers.reduce((obj, header, i) => {
            let val = (values[i] || '').replace(/^"|"$/g, '').replace(/""/g, '"');
            obj[header] = val;
            return obj;
        }, {});
    });
}

// La fonction que ton init appelle (vérifie bien le nom ici)
function updateStickyBar() {
    // Vérification si les données sont chargées
    if (!globalSchedule || globalSchedule.length === 0) return;

    const bar = document.getElementById('next-chore-bar');
    const timeEl = document.getElementById('next-time');
    const titleEl = document.getElementById('next-title');
    const countdownEl = document.getElementById('next-countdown');

    if (!bar) return;

    const now = new Date();
    // On définit les jours en français pour correspondre à la colonne "jour" de la Sheet
    const daysFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const currentDayFr = daysFr[now.getDay()];
    //const currentDayFr = 'samedi'; // Forcer le jour à jeudi pour les tests (à retirer en prod)

    // Calcul de l'heure de référence (Heure actuelle - 2 minutes)
    // On garde le numéro affiché jusqu'à 2 minutes APRÈS son heure de passage prévue
    const referenceTime = new Date(now.getTime() - 60000);
    const refTimeStr = referenceTime.getHours().toString().padStart(2, '0') + ":" + 
                       referenceTime.getMinutes().toString().padStart(2, '0');

    // Filtrer pour trouver les numéros d'aujourd'hui qui ne sont pas encore terminés
    const upcoming = globalSchedule.filter(item => {
        const passageTime = (item.passage || "").trim();
        const itemDay = (item.jour || "").trim();
        
        if (!passageTime || !itemDay) return false;

        const isToday = itemDay.toLowerCase() === currentDayFr.toLowerCase();
        const isNotFinished = passageTime > refTimeStr;
        
        return isToday && isNotFinished;
    }).sort((a, b) => a.passage.localeCompare(b.passage));

    if (upcoming.length > 0) {
        const next = upcoming[0];
        const nextPassage = next.passage.trim();
        
        // Préparation du numéro (ex: #102 - )
        const nextNum = next.numero ? `#${next.numero} - ` : "";
        
        // 1. Mise à jour de l'heure de passage
        if(timeEl) timeEl.innerText = nextPassage;
        
        // 2. Mise à jour du titre avec le numéro en couleur plus claire
        if(titleEl) {
            titleEl.innerHTML = `<span style="color: #fff; font-weight: 500;">${nextNum}</span>${next.titre}`;
        }
        
        // 3. Calcul et affichage du décompte
        if(countdownEl) {
            const timeParts = nextPassage.split(':');
            if (timeParts.length === 2) {
                const h = parseInt(timeParts[0], 10);
                const m = parseInt(timeParts[1], 10);
                
                const targetDate = new Date();
                targetDate.setHours(h, m, 0, 0);
                
                const diffMs = targetDate - now;
                const diffMin = Math.round(diffMs / 60000);

                if (diffMin <= 0) {
                    // Si le numéro est commencé (fenêtre de 2 min)
                    countdownEl.innerText = "En cours";
                    countdownEl.style.backgroundColor = "rgba(220, 38, 38, 0.9)"; // Rouge
                } else {
                    // Si le numéro est dans le futur
                    countdownEl.innerText = "Dans " + diffMin + " min";
                    countdownEl.style.backgroundColor = "rgba(0, 0, 0, 0.2)"; // Style original
                }
            } else {
                countdownEl.innerText = "-- min";
            }
        }
        
        // Afficher la barre (retire la classe hidden de Tailwind)
        bar.classList.remove('hidden');
    } else {
        // Cacher la barre s'il n'y a plus de numéros à venir aujourd'hui
        bar.classList.add('hidden');
    }
}

// Initialisation au chargement
async function initOnStageCore() {
    try {
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        globalSchedule = parseCSVData(csvText);
        
        // Si la page possède une fonction renderCards (page horaire), on l'exécute
        if (typeof renderCards === 'function') {
            renderCards(globalSchedule);
        }

        updateStickyBar();
        // Rafraîchissement chaque minute
        setInterval(updateStickyBar, 30000);
    } catch (e) {
        console.error("Erreur Core:", e);
    }
}

document.addEventListener('DOMContentLoaded', initOnStageCore);