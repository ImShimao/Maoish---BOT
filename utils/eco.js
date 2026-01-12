const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'money.json');

function loadDb() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}));
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        return {}; 
    }
}

function saveDb(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
    // --- NOUVELLE FONCTION (Indispensable pour le Leaderboard) ---
    getAll: () => {
        return loadDb();
    },
    // -------------------------------------------------------------

    // Récupérer (avec migration auto pour corriger les NaN)
    get: (userId) => {
        const db = loadDb();
        let data = db[userId];

        // 🚑 REPARATION AUTO : Si c'est un vieux chiffre, on convertit
        if (typeof data === 'number') {
            data = { cash: data, bank: 0 };
            db[userId] = data;
            saveDb(db);
        }

        // Si le joueur n'existe pas
        if (!data) return { cash: 0, bank: 0 };
        return data;
    },

    // Ajouter Cash
    addCash: (userId, amount) => {
        const db = loadDb();
        if (typeof db[userId] === 'number') db[userId] = { cash: db[userId], bank: 0 };
        if (!db[userId]) db[userId] = { cash: 0, bank: 0 };
        
        db[userId].cash += parseInt(amount);
        saveDb(db);
        return db[userId].cash;
    },

    // Ajouter Banque
    addBank: (userId, amount) => {
        const db = loadDb();
        if (typeof db[userId] === 'number') db[userId] = { cash: db[userId], bank: 0 };
        if (!db[userId]) db[userId] = { cash: 0, bank: 0 };

        db[userId].bank += parseInt(amount);
        saveDb(db);
        return db[userId].bank;
    },

    // Dépôt
    deposit: (userId, amount) => {
        const db = loadDb();
        // Initialisation sécurisée
        if (typeof db[userId] === 'number') db[userId] = { cash: db[userId], bank: 0 };
        if (!db[userId]) db[userId] = { cash: 0, bank: 0 };
        
        amount = parseInt(amount);
        if (db[userId].cash < amount) return false;

        db[userId].cash -= amount;
        db[userId].bank += amount;
        saveDb(db);
        return true;
    },

    // Retrait
    withdraw: (userId, amount) => {
        const db = loadDb();
        // Initialisation sécurisée
        if (typeof db[userId] === 'number') db[userId] = { cash: db[userId], bank: 0 };
        if (!db[userId]) db[userId] = { cash: 0, bank: 0 };

        amount = parseInt(amount);
        if (db[userId].bank < amount) return false;

        db[userId].bank -= amount;
        db[userId].cash += amount;
        saveDb(db);
        return true;
    }
};