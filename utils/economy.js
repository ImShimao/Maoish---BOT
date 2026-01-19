const { getUser } = require('./db');
const User = require('../models/User');
const itemsDb = require('./items.js'); // Vérifie bien ce chemin

module.exports = {
    // Récupérer un utilisateur
    get: async (userId, guildId) => {
        return await getUser(userId, guildId);
    },

    // Ajouter du cash (Atomique)
    addCash: async (userId, guildId, amount) => {
        const user = await User.findOneAndUpdate(
            { userId: userId, guildId: guildId },
            { $inc: { cash: parseInt(amount) } },
            { new: true, upsert: true } // Upsert = crée si n'existe pas
        );
        return user ? user.cash : 0;
    },

    // Ajouter en banque (Atomique)
    addBank: async (userId, guildId, amount) => {
        const user = await User.findOneAndUpdate(
            { userId: userId, guildId: guildId },
            { $inc: { bank: parseInt(amount) } },
            { new: true, upsert: true }
        );
        return user ? user.bank : 0;
    },

    // Définir le montant exact
    setTotal: async (userId, guildId, amount) => {
        const user = await getUser(userId, guildId);
        user.cash = parseInt(amount);
        await user.save();
        return user.cash;
    },

    // 🛡️ DÉPÔT SÉCURISÉ (Cash -> Banque)
    deposit: async (userId, guildId, amount) => {
        const val = parseInt(amount);
        if (val <= 0) return false;

        const result = await User.findOneAndUpdate(
            { 
                userId: userId, 
                guildId: guildId, 
                cash: { $gte: val } // Condition : Avoir assez de cash
            },
            { 
                $inc: { cash: -val, bank: val } // Action : Déplace l'argent en 1 coup
            },
            { new: true }
        );

        return !!result; // Renvoie 'true' si ça a marché, 'false' sinon
    },

    // 🛡️ RETRAIT SÉCURISÉ (Banque -> Cash)
    withdraw: async (userId, guildId, amount) => {
        const val = parseInt(amount);
        if (val <= 0) return false;

        const result = await User.findOneAndUpdate(
            { 
                userId: userId, 
                guildId: guildId, 
                bank: { $gte: val } // Condition : Avoir assez en banque
            },
            { 
                $inc: { bank: -val, cash: val } // Action : Déplace l'argent en 1 coup
            },
            { new: true }
        );

        return !!result;
    },

    // 🛡️ TRANSFERT SÉCURISÉ (Pour la commande pay)
    // C'est la nouvelle fonction indispensable !
    transfer: async (fromId, toId, guildId, amount) => {
        const val = parseInt(amount);
        if (val <= 0) return false;

        // 1. On tente de retirer l'argent de l'envoyeur
        const sender = await User.findOneAndUpdate(
            { userId: fromId, guildId: guildId, cash: { $gte: val } },
            { $inc: { cash: -val } },
            { new: true }
        );

        // Si sender est null, c'est qu'il n'avait pas les fonds
        if (!sender) return false;

        // 2. Si ça a marché, on crédite le receveur
        await User.findOneAndUpdate(
            { userId: toId, guildId: guildId },
            { $inc: { cash: val } },
            { upsert: true }
        );

        return true;
    },

    // Leaderboard
    getLeaderboard: async (guildId, limit = 10) => {
        const users = await User.find({ guildId: guildId }); 
        
        const richList = users.map(u => {
            let invValue = 0;
            if (u.inventory) {
                const iterator = u.inventory instanceof Map ? u.inventory.entries() : Object.entries(u.inventory);
                for (const [id, qty] of iterator) {
                    // Attention : itemsDb est peut-être un array ou un objet selon ton import
                    // Si itemsDb est un tableau :
                    const it = Array.isArray(itemsDb) ? itemsDb.find(i => i.id === id) : itemsDb[id];
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