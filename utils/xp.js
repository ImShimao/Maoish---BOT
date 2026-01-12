const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'xp.json');

function loadDb() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}));
        return {};
    }
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return {}; }
}

function saveDb(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
    // Ajouter de l'XP
    addXp: (userId, amount) => {
        const db = loadDb();
        if (!db[userId]) db[userId] = { xp: 0, level: 1 };
        
        db[userId].xp += amount;
        
        // Calcul de niveau : 100 * level (ex: 100xp pour niv 2, 300xp cumulés pour niv 3...)
        // Formule simple : Niveau = Racine Carrée(XP / 100) + 1 (approximatif)
        // Ou plus simple : Palier fixe. Disons : Niveau suivant = Niveau actuel * 200xp
        const nextLevelXp = db[userId].level * 200;
        
        let levelUp = false;
        if (db[userId].xp >= nextLevelXp) {
            db[userId].level++;
            db[userId].xp = 0; // Reset XP barre (ou on garde cumulé, c'est un choix. Ici on reset pour faire des barres)
            levelUp = true;
        }

        saveDb(db);
        return { ...db[userId], levelUp };
    },

    get: (userId) => {
        const db = loadDb();
        return db[userId] || { xp: 0, level: 1 };
    }
};