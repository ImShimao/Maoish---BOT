require('dotenv').config();

module.exports = {
    // --- CONNEXION ---
    MONGO_URL: process.env.MONGO_URL,
    TOKEN: process.env.DISCORD_TOKEN || process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    OWNER_ID: process.env.OWNER_ID,
    REPORT_CHANNEL_ID: process.env.REPORT_CHANNEL_ID,
    
    // --- ÉCONOMIE GÉNÉRALE ---
    STARTING_BALANCE: 0,
    CURRENCY: "€",

    // --- IDENTITÉ VISUELLE (COULEURS) ---
    COLORS: {
        MAIN: 0x5865F2,     // Bleu Blurple (Discord)
        SUCCESS: 0x2ECC71,  // Vert
        ERROR: 0xE74C3C,    // Rouge
        WARNING: 0xF1C40F,  // Jaune/Or (Utilisé pour Economy ou Avertissements)
        JOB: 0xE67E22       // Orange (Spécial Métiers)
    },
    FOOTER_TEXT: "Maoish System",

    // --- CONFIGURATION DES MÉTIERS (NOUVEAU) ---
    JOBS: {
        COOK: { 
            id: 'cook', 
            name: 'Cuisinier', 
            salary: 17, 
            description: '🍔 Salaire élevé, pas de loot.' 
        },
        MINER: { 
            id: 'miner', 
            name: 'Mineur', 
            salary: 9, 
            description: '⛏️ Salaire moyen + Matériaux (toutes les 30m).' 
        },
        HACKER: { 
            id: 'hacker', 
            name: 'Hacker', 
            salary: 7, 
            description: '💻 Salaire faible + Chance de Crypto/Jackpot.' 
        }
    },

    // --- COOLDOWNS (En millisecondes) ---
    // Utilisé par tes autres commandes (mine, fish, etc.)
    COOLDOWNS: {
        WORK: 30 * 60 * 1000,       // 30 min (Ancien work, peut-être à supprimer si tu gardes que le nouveau job)
        DAILY: 24 * 60 * 60 * 1000, // 24 h
        
        MINE: 60 * 1000,            // 1 min
        FISH: 30 * 1000,            // 30 sec
        DIG: 2.5 * 60 * 1000,       // 2 min 30
        HUNT: 5 * 60 * 1000,        // 5 min (MODIFIÉ)
        
        BEG: 2 * 60 * 1000,         // 2 min
        CRIME: 2 * 60 * 1000,       // 2 min
        ROB: 60 * 60 * 1000,        // 1 h
        HACK: 2 * 60 * 60 * 1000,   // 2 h
        HEIST: 12 * 60 * 60 * 1000  // 12 heures
    }
};