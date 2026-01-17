const { getUser } = require('./db');

module.exports = {
    // --- XP ---
    // ✅ Ajout de guildId
    addXP: async function(userId, guildId, amount) {
        // ✅ On récupère l'user spécifique au serveur
        const data = await getUser(userId, guildId);
        
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

    // ✅ Ajout de guildId
    quickXP: async (userId, guildId, amount) => {
        return module.exports.addXP(userId, guildId, amount);
    },

    // --- STATS ---
    // ✅ Ajout de guildId
    addStat: async function(userId, guildId, statName, amount = 1) {
        const data = await getUser(userId, guildId);
        if (!data.stats) data.stats = {};
        data.stats[statName] = (data.stats[statName] || 0) + amount;
        await data.save();
    },

    // --- SOCIAL & PRISON ---
    // ✅ Ajout de guildId pour les deux partenaires
    setPartner: async (userId, guildId, partnerId) => {
        const user = await getUser(userId, guildId);
        const partner = await getUser(partnerId, guildId);
        
        user.partner = partnerId;
        partner.partner = userId;
        
        await user.save();
        await partner.save();
    },

    // ✅ Ajout de guildId
    setJail: async (userId, guildId, duration) => {
        const user = await getUser(userId, guildId);
        user.jailEnd = Date.now() + duration;
        await user.save();
    }
};