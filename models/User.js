const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // --- IDENTIFICATION MULTI-SERVEUR ---
    userId: { type: String, required: true },
    guildId: { type: String, required: true }, // INDISPENSABLE pour différencier les serveurs

    // --- ÉCONOMIE ---
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    
    // Inventory (Map est plus flexible pour stocker "pomme": 5, "épée": 1)
    inventory: { type: Map, of: Number, default: {} },

    // --- SYSTÈMES TEMPORELS ---
    cooldowns: { 
        work: { type: Number, default: 0 },
        daily: { type: Number, default: 0 },
        rob: { type: Number, default: 0 },
        mine: { type: Number, default: 0 },
        fish: { type: Number, default: 0 },
        crime: { type: Number, default: 0 },
        beg: { type: Number, default: 0 },
        hack: { type: Number, default: 0 },
        hunt: { type: Number, default: 0 },
        dig: { type: Number, default: 0 },
        braquage: { type: Number, default: 0 }
    },

    // --- PROGRESSION & SOCIAL ---
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 }, // Pour le daily streak
    partner: { type: String, default: null }, // ID du partenaire de mariage
    jailEnd: { type: Number, default: 0 }, // Timestamp de sortie de prison

    // --- STATISTIQUES (Pour les leaderboards/achievements) ---
    stats: {
        crimes: { type: Number, default: 0 },
        fish: { type: Number, default: 0 },
        mine: { type: Number, default: 0 },
        hunts: { type: Number, default: 0 },
        digs: { type: Number, default: 0 },
        begs: { type: Number, default: 0 },
        hacks: { type: Number, default: 0 },
        works: { type: Number, default: 0 },
        dailies: { type: Number, default: 0 }
    },

    // --- MÉTIER ---
    job: { 
        name: { type: String, default: null }, 
        startedAt: { type: Number, default: 0 }
    }
});

// C'est ici que la magie opère : Un utilisateur est unique PAR SERVEUR.
UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);