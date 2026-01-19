const User = require('../models/User'); // ⚠️ Import direct pour les requêtes atomiques

module.exports = {
    // --- XP (Sécurisé & Multi-niveaux) ---
    addXP: async function(userId, guildId, amount) {
        // 1. Ajout immédiat et atomique de l'XP
        // On récupère le user à jour avec la nouvelle XP
        const user = await User.findOneAndUpdate(
            { userId: userId, guildId: guildId },
            { $inc: { xp: amount } },
            { new: true, upsert: true } // upsert: true crée le profil s'il n'existe pas
        );

        // 2. Calcul de la montée de niveau (En mémoire)
        let currentLevel = user.level;
        let currentXP = user.xp;
        let leveledUp = false;
        
        // Formule : 500 * niveau actuel
        // (Niveau 1 -> 500xp, Niveau 2 -> 1000xp, etc.)
        let nextLevelXP = currentLevel * 500;

        // BOUCLE WHILE : Tant qu'il a assez d'XP pour le niveau suivant
        while (currentXP >= nextLevelXP) {
            currentXP -= nextLevelXP; // On retire le coût du niveau
            currentLevel++;           // On monte d'un niveau
            leveledUp = true;         // On note qu'il a level up
            
            // On recalcule le coût du prochain niveau (pour la boucle suivante)
            nextLevelXP = currentLevel * 500;
        }

        // 3. Si le niveau a changé, on sauvegarde le résultat final (Atomique)
        if (leveledUp) {
            await User.updateOne(
                { userId: userId, guildId: guildId },
                { $set: { level: currentLevel, xp: currentXP } }
            );
            return { leveledUp: true, newLevel: currentLevel };
        }
        
        return { leveledUp: false };
    },

    quickXP: async (userId, guildId, amount) => {
        return module.exports.addXP(userId, guildId, amount);
    },

    // --- STATS (Sécurisé) ---
    addStat: async function(userId, guildId, statName, amount = 1) {
        // Construction de la clé dynamique (ex: stats.begs)
        const updateField = {};
        updateField[`stats.${statName}`] = amount;

        console.log(`[DEBUG STATS] Ajout de +${amount} à ${statName} pour ${userId}`);

        // Mise à jour atomique : Ajoute +1 sans écraser le reste
        await User.updateOne(
            { userId: userId, guildId: guildId },
            { $inc: updateField },
            { upsert: true }
        );
    },

    // --- SOCIAL & PRISON ---
    setPartner: async (userId, guildId, partnerId) => {
        await User.updateOne({ userId: userId, guildId: guildId }, { partner: partnerId }, { upsert: true });
        await User.updateOne({ userId: partnerId, guildId: guildId }, { partner: userId }, { upsert: true });
    },

    setJail: async (userId, guildId, duration) => {
        const releaseDate = Date.now() + duration;
        await User.updateOne(
            { userId: userId, guildId: guildId },
            { $set: { jailEnd: releaseDate } },
            { upsert: true }
        );
    }
};