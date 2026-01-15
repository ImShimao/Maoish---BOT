const { getUser } = require('./db');

module.exports = {
    // --- XP ---
    addXP: async function(userId, amount) {
        const data = await getUser(userId);
        data.xp += amount;
        
        const nextLevelXP = data.level * 500; 
        if (data.xp >= nextLevelXP) {
            data.xp -= nextLevelXP;
            data.level += 1;
            await data.save();
            return { leveledUp: true, newLevel: data.level };
        }
        await data.save();
        return { leveledUp: false };
    },

    quickXP: async (userId, amount) => {
        // Alias pour addXP, mais tu peux garder la logique séparée si tu veux
        return module.exports.addXP(userId, amount);
    },

    // --- STATS ---
    addStat: async function(userId, statName, amount = 1) {
        const data = await getUser(userId);
        if (!data.stats) data.stats = {};
        data.stats[statName] = (data.stats[statName] || 0) + amount;
        await data.save();
    },

    // --- SOCIAL & PRISON ---
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
    }
};