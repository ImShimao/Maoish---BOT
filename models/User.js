const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    inventory: { type: Map, of: Number, default: {} },
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
    // --- NOUVEAUX CHAMPS (XP & STATS) ---
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    partner: { type: String, default: null },
    jailEnd: { type: Number, default: 0 },
    
    // C'est ici qu'on ajoute tout ce qui manquait
    stats: {
        crimes: { type: Number, default: 0 },
        fish: { type: Number, default: 0 },
        mine: { type: Number, default: 0 },
        hunts: { type: Number, default: 0 },
        digs: { type: Number, default: 0 },
        begs: { type: Number, default: 0 },   // Mendiant
        hacks: { type: Number, default: 0 },  // Hack
        works: { type: Number, default: 0 },  // Travail (optionnel mais utile)
        dailies: { type: Number, default: 0 } // Récompense journalière
    }
});

module.exports = mongoose.model('User', UserSchema);