const fs = require('fs');
const path = require('path');
const itemsDb = require('./items.js');

const filePath = path.join(__dirname, '..', 'money.json');

function loadDb() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}));
        return {};
    }
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) { return {}; }
}

function saveDb(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureUser(db, userId) {
    if (!db[userId]) db[userId] = {};
    if (typeof db[userId].cash !== 'number') db[userId].cash = 0;
    if (typeof db[userId].bank !== 'number') db[userId].bank = 0;
    if (!db[userId].inventory) db[userId].inventory = {};
    if (!db[userId].partner) db[userId].partner = null; // Mariage
    if (!db[userId].jailEnd) db[userId].jailEnd = 0;    // Prison (Timestamp)
    return db[userId];
}

module.exports = {
    getAll: () => loadDb(),
    get: (userId) => { const db = loadDb(); return ensureUser(db, userId); },

    // --- ARGENT ---
    addCash: (userId, amount) => {
        const db = loadDb();
        ensureUser(db, userId).cash += parseInt(amount);
        saveDb(db);
    },
    addBank: (userId, amount) => {
        const db = loadDb();
        ensureUser(db, userId).bank += parseInt(amount);
        saveDb(db);
    },

    // --- INVENTAIRE ---
    addItem: (userId, itemId, quantity = 1) => {
        const db = loadDb();
        const user = ensureUser(db, userId);
        if (!user.inventory[itemId]) user.inventory[itemId] = 0;
        user.inventory[itemId] += quantity;
        saveDb(db);
    },
    removeItem: (userId, itemId, quantity = 1) => {
        const db = loadDb();
        const user = ensureUser(db, userId);
        if (!user.inventory[itemId] || user.inventory[itemId] < quantity) return false;
        user.inventory[itemId] -= quantity;
        if (user.inventory[itemId] <= 0) delete user.inventory[itemId];
        saveDb(db);
        return true;
    },
    hasItem: (userId, itemId) => {
        const db = loadDb();
        return (ensureUser(db, userId).inventory[itemId] > 0);
    },

    // --- CALCUL DE RICHESSE (NET WORTH) ---
    getNetWorth: (userId) => {
        const db = loadDb();
        const user = ensureUser(db, userId);
        let inventoryValue = 0;
        
        for (const [itemId, qty] of Object.entries(user.inventory)) {
            const item = itemsDb.find(i => i.id === itemId);
            if (item) inventoryValue += (item.sellPrice || 0) * qty;
        }
        return user.cash + user.bank + inventoryValue;
    },

    // --- MARIAGE ---
    setPartner: (user1, user2) => {
        const db = loadDb();
        ensureUser(db, user1).partner = user2;
        ensureUser(db, user2).partner = user1;
        saveDb(db);
    },
    divorce: (user1) => {
        const db = loadDb();
        const p1 = ensureUser(db, user1);
        if (p1.partner) {
            const p2 = ensureUser(db, p1.partner);
            p2.partner = null;
            p1.partner = null;
            saveDb(db);
        }
    },

    // --- PRISON ---
    setJail: (userId, durationMs) => {
        const db = loadDb();
        ensureUser(db, userId).jailEnd = Date.now() + durationMs;
        saveDb(db);
    },
    isJailed: (userId) => {
        const db = loadDb();
        const user = ensureUser(db, userId);
        return user.jailEnd > Date.now();
    },

    // --- BATCH (Optimisation) ---
    batchAdd: (userIds, amount, type = 'cash') => {
        const db = loadDb();
        userIds.forEach(id => {
            const user = ensureUser(db, id);
            user[type] += parseInt(amount);
        });
        saveDb(db);
    },
    batchSet: (userIds, amount, type = 'cash') => {
        const db = loadDb();
        userIds.forEach(id => {
            const user = ensureUser(db, id);
            user[type] = parseInt(amount);
        });
        saveDb(db);
    }
};