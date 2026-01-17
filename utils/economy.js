const { getUser } = require('./db');
const User = require('../models/User');
const itemsDb = require('./items.js');

module.exports = {
    // Récupérer un utilisateur
    get: async (userId, guildId) => {
        return await getUser(userId, guildId);
    },

    // Ajouter du cash
    addCash: async (userId, guildId, amount) => {
        const user = await User.findOneAndUpdate(
            { userId: userId, guildId: guildId },
            { $inc: { cash: parseInt(amount) } },
            { new: true }
        );
        return user ? user.cash : 0;
    },

    // Ajouter en banque
    addBank: async (userId, guildId, amount) => {
        // Si tu as un système de police, l'argent ira dans le compte 'police_treasury' DU SERVEUR
        const user = await User.findOneAndUpdate(
            { userId: userId, guildId: guildId },
            { $inc: { bank: parseInt(amount) } },
            { new: true }
        );
        return user ? user.bank : 0;
    },

    // Définir le montant exact (utile pour les commandes admin =setmoney)
    setTotal: async (userId, guildId, amount) => {
        const user = await getUser(userId, guildId);
        user.cash = parseInt(amount);
        await user.save();
        return user.cash;
    },

    // Déposer de l'argent (Cash -> Banque)
    deposit: async (userId, guildId, amount) => {
        const user = await getUser(userId, guildId);
        if (user.cash < amount) return false;
        
        user.cash -= amount;
        user.bank += amount;
        await user.save();
        return true;
    },

    // Retirer de l'argent (Banque -> Cash)
    withdraw: async (userId, guildId, amount) => {
        const user = await getUser(userId, guildId);
        if (user.bank < amount) return false;

        user.bank -= amount;
        user.cash += amount;
        await user.save();
        return true;
    },

    // Leaderboard (Top Richesses) propre au serveur
    getLeaderboard: async (guildId, limit = 10) => {
        // On ne prend que les gens de CE serveur
        const users = await User.find({ guildId: guildId }); 
        
        const richList = users.map(u => {
            let invValue = 0;
            // Gestion compatibilité Map/Object pour l'inventaire
            if (u.inventory) {
                const iterator = u.inventory instanceof Map ? u.inventory.entries() : Object.entries(u.inventory);
                for (const [id, qty] of iterator) {
                    const it = itemsDb.find(i => i.id === id);
                    if (it && it.sellPrice) invValue += (it.sellPrice * qty);
                }
            }
            return {
                id: u.userId,
                cash: u.cash,
                bank: u.bank,
                level: u.level || 1,
                xp: u.xp || 0,
                networth: u.cash + u.bank + invValue
            };
        });
        
        return richList.sort((a, b) => b.networth - a.networth).slice(0, limit);
    }
};