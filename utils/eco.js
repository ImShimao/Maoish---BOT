const User = require('../models/User');
const itemsDb = require('./items.js');
const config = require('../config.js');

// Fonction interne pour récupérer/créer un user
async function getUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    return user;
}

module.exports = {
    getUser,

    // --- ARGENT ---
    get: async (userId) => { // Renommé pour compatibilité avec tes commandes (eco.get)
        const user = await getUser(userId);
        return user; // On retourne tout l'objet user Mongoose
    },

    addCash: async (userId, amount) => {
        const user = await getUser(userId);
        user.cash += parseInt(amount);
        await user.save();
        return user.cash;
    },

    addBank: async (userId, amount) => {
        const user = await getUser(userId);
        user.bank += parseInt(amount);
        await user.save();
        return user.bank;
    },

    // --- BANQUE (Depot/Retrait) ---
    deposit: async (userId, amount) => {
        const user = await getUser(userId);
        if (user.cash < amount) return false;
        
        user.cash -= amount;
        user.bank += amount;
        await user.save();
        return true;
    },

    withdraw: async (userId, amount) => {
        const user = await getUser(userId);
        if (user.bank < amount) return false;

        user.bank -= amount;
        user.cash += amount;
        await user.save();
        return true;
    },

    // --- GESTION MASSE (Pour admin commands) ---
    batchAdd: async (userIds, amount, type = 'cash') => {
        // Met à jour plusieurs utilisateurs d'un coup
        const update = {};
        update[type] = amount; // ex: { cash: 100 } mais il faut incrémenter
        
        await User.updateMany(
            { userId: { $in: userIds } },
            { $inc: { [type]: amount } } // $inc permet d'ajouter/soustraire
        );
    },

    batchSet: async (userIds, amount, type = 'cash') => {
        await User.updateMany(
            { userId: { $in: userIds } },
            { $set: { [type]: amount } } // $set remplace la valeur
        );
    },

    // --- INVENTAIRE ---
    hasItem: async (userId, itemId) => {
        const user = await getUser(userId);
        // Avec une Map Mongoose, on utilise .get()
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

    // --- SOCIAL / MARIAGE ---
    setPartner: async (userId, partnerId) => {
        const user = await getUser(userId);
        const partner = await getUser(partnerId);

        user.partner = partnerId;
        partner.partner = userId;

        await user.save();
        await partner.save();
    },

    isJailed: async (userId) => {
        const user = await getUser(userId);
        return user.jailEnd > Date.now();
    },

    setJail: async (userId, duration) => {
        const user = await getUser(userId);
        user.jailEnd = Date.now() + duration;
        await user.save();
    },

    // --- LEADERBOARD OPTIMISÉ ---
    getLeaderboard: async (limit = 10) => {
        const users = await User.find(); // On récupère tout le monde
        
        const richList = users.map(u => {
            // Calcul de la valeur de l'inventaire
            let invValue = 0;
            if (u.inventory) {
                // u.inventory est une Map Mongoose
                for (const [id, qty] of u.inventory) {
                    const it = itemsDb.find(i => i.id === id);
                    if (it && it.sellPrice) invValue += (it.sellPrice * qty);
                }
            }

            return {
                id: u.userId,
                cash: u.cash,
                bank: u.bank,
                networth: u.cash + u.bank + invValue
            };
        });

        // Tri décroissant
        return richList.sort((a, b) => b.networth - a.networth);
    }
};