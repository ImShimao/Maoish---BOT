const User = require('../models/User');
const itemsDb = require('./items.js'); // Assure-toi que items.js existe toujours
const config = require('../config.js');

// Récupérer ou Créer un utilisateur
async function getUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    return user;
}

module.exports = {
    getUser: getUser, // Exporté pour l'utiliser dans les commandes (cooldowns, etc)

    // --- ARGENT ---
    getBalance: async (userId) => {
        const user = await getUser(userId);
        return { cash: user.cash, bank: user.bank };
    },

    addMoney: async (userId, amount, type = 'cash') => {
        const user = await getUser(userId);
        if (type === 'bank') user.bank += parseInt(amount);
        else user.cash += parseInt(amount);
        await user.save();
        return user[type];
    },

    // --- INVENTAIRE ---
    getInventory: async (userId) => {
        const user = await getUser(userId);
        return user.inventory || new Map();
    },

    hasItem: async (userId, itemId) => {
        const user = await getUser(userId);
        return (user.inventory.get(itemId) > 0);
    },

    addItem: async (userId, itemId, quantity = 1) => {
        const user = await getUser(userId);
        const current = user.inventory.get(itemId) || 0;
        user.inventory.set(itemId, current + quantity);
        await user.save();
    },

    removeItem: async (userId, itemId, quantity = 1) => {
        const user = await getUser(userId);
        const current = user.inventory.get(itemId) || 0;
        if (current < quantity) return false;
        
        const newVal = current - quantity;
        if (newVal <= 0) user.inventory.delete(itemId);
        else user.inventory.set(itemId, newVal);
        
        await user.save();
        return true;
    },

    // --- ACTIONS METIER (Shop/Sell) ---
    buyItem: async (userId, itemId) => {
        const item = itemsDb.find(i => i.id === itemId);
        if (!item) return { success: false, reason: "Item inconnu" };

        const user = await getUser(userId);

        if (user.cash < item.price) return { success: false, reason: `Pas assez d'argent (${user.cash}€)` };
        if (item.unique && user.inventory.get(itemId) > 0) return { success: false, reason: "Objet déjà possédé (Unique)" };

        user.cash -= item.price;
        const current = user.inventory.get(itemId) || 0;
        user.inventory.set(itemId, current + 1);
        
        await user.save();
        return { success: true, name: item.name, price: item.price };
    },

    sellItem: async (userId, itemId, quantity = 1) => {
        const item = itemsDb.find(i => i.id === itemId);
        // On vérifie le prix dans config ou itemsDb (selon ta structure, ici itemsDb est mieux pour les noms)
        // Mais pour les prix de vente, on utilise la config ou l'item directement.
        // Assurons-nous que items.js a bien sellPrice, sinon fallback sur config.
        const price = item.sellPrice || config.SELL_PRICES[itemId.toUpperCase()] || 0;

        if (!item || !item.sellable) return { success: false, reason: "Cet objet ne se vend pas." };

        const user = await getUser(userId);
        const owned = user.inventory.get(itemId) || 0;

        if (owned < quantity) return { success: false, reason: "Tu n'en as pas assez." };

        const gain = price * quantity;
        user.cash += gain;

        const newVal = owned - quantity;
        if (newVal <= 0) user.inventory.delete(itemId);
        else user.inventory.set(itemId, newVal);

        await user.save();
        return { success: true, gain: gain };
    },

    // --- LEADERBOARD ---
    getLeaderboard: async (limit = 10) => {
        // On récupère tout le monde (optimisation possible avec .sort() direct dans Mongo)
        const users = await User.find().limit(100); 
        
        // Calcul NetWorth en JS (Cash + Bank + Inventory Value)
        const richList = users.map(u => {
            let invValue = 0;
            if (u.inventory) {
                for (const [id, qty] of u.inventory) {
                    const it = itemsDb.find(i => i.id === id);
                    if (it && it.sellPrice) invValue += it.sellPrice * qty;
                }
            }
            return {
                id: u.userId,
                cash: u.cash,
                bank: u.bank,
                netWorth: u.cash + u.bank + invValue
            };
        });

        // Tri par NetWorth décroissant
        return richList.sort((a, b) => b.netWorth - a.netWorth).slice(0, limit);
    },

    // --- SOCIAL / PRISON ---
    isJailed: async (userId) => {
        const user = await getUser(userId);
        return user.jailEnd > Date.now();
    },
    setJail: async (userId, duration) => {
        const user = await getUser(userId);
        user.jailEnd = Date.now() + duration;
        await user.save();
    }
};