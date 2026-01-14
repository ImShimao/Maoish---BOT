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
    get: async (userId) => {
        const user = await getUser(userId);
        return user;
    },

    addCash: async (userId, amount) => {
        const user = await User.findOneAndUpdate(
            { userId: userId },
            { $inc: { cash: parseInt(amount) } },
            { new: true, upsert: true }
        );
        return user.cash;
    },

    addBank: async (userId, amount) => {
        const user = await User.findOneAndUpdate(
            { userId: userId },
            { $inc: { bank: parseInt(amount) } },
            { new: true, upsert: true }
        );
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

    // --- INVENTAIRE ---
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

    // --- SOCIAL / PRISON ---
    setPartner: async (userId, partnerId) => {
        const user = await getUser(userId);
        const partner = await getUser(partnerId);
        user.partner = partnerId;
        partner.partner = userId;
        await user.save();
        await partner.save();
    },

    setJail: async (userId, duration) => {
        const user = await getUser(userId);
        user.jailEnd = Date.now() + duration;
        await user.save();
    },

    // --- SYSTÈME XP ET STATS (NOUVEAU) ---
    addXP: async function(userId, amount) {
        const data = await getUser(userId);
        data.xp += amount;
        
        const nextLevelXP = data.level * 500; 
        if (data.xp >= nextLevelXP) {
            data.xp -= nextLevelXP;
            data.level += 1;
            // On retourne true si le joueur a level up
            await data.save();
            return { leveledUp: true, newLevel: data.level };
        }
        await data.save();
        return { leveledUp: false };
    },

    addStat: async function(userId, statName, amount = 1) {
        const data = await getUser(userId);
        if (!data.stats) data.stats = {};
        data.stats[statName] = (data.stats[statName] || 0) + amount;
        await data.save();
    },
// À ajouter dans le module.exports de utils/eco.js
    batchAdd: async (userIds, amount, account = 'cash') => {
        const update = { $inc: { [account]: parseInt(amount) } };
        await User.updateMany({ userId: { $in: userIds } }, update);
    },

    batchSet: async (userIds, value, account = 'cash') => {
        const update = { $set: { [account]: parseInt(value) } };
        await User.updateMany({ userId: { $in: userIds } }, update);
    },

    quickXP: async (userId, amount) => {
        const user = await getUser(userId);
        user.xp += amount;
        const nextLevelXP = user.level * 500;
        if (user.xp >= nextLevelXP) {
            user.xp -= nextLevelXP;
            user.level += 1;
            await user.save();
            return { leveledUp: true, newLevel: user.level };
        }
        await user.save();
        return { leveledUp: false };
    },
    // --- LEADERBOARD ---
    getLeaderboard: async (limit = 10) => {
        const users = await User.find();
        const richList = users.map(u => {
            let invValue = 0;
            if (u.inventory) {
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
        return richList.sort((a, b) => b.networth - a.networth);
    }
};