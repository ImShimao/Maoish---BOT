// config.js
module.exports = {
    // --- DATABASE ---
    MONGO_URL: process.env.MONGO_URL,
    
    // --- ÉCONOMIE ---
    STARTING_BALANCE: 0,
    CURRENCY: "€",
    
    // --- IDENTITÉ VISUELLE ---
    COLORS: {
        MAIN: 0x5865F2,    // Bleu Blurple
        SUCCESS: 0x2ECC71, // Vert
        ERROR: 0xE74C3C,   // Rouge
        ECONOMY: 0xF1C40F  // Or
    },
    FOOTER_TEXT: "Maoish",

    // --- COOLDOWNS (En millisecondes) ---
    // C'est ici que tu gères le temps pour TOUT le monde d'un coup
    COOLDOWNS: {
        WORK: 30 * 60 * 1000,       // 30 min
        DAILY: 24 * 60 * 60 * 1000, // 24 h
        
        MINE: 60 * 1000,            // 1 min
        FISH: 30 * 1000,            // 30 sec
        DIG: 2.5 * 60 * 1000,       // 2 min 30 (150 000 ms)
        HUNT: 10 * 60 * 1000,       // 10 min
        
        BEG: 2 * 60 * 1000,         // 2 min
        CRIME: 2 * 60 * 1000,       // 2 min
        ROB: 60 * 60 * 1000,        // 1 h
        HACK: 2 * 60 * 60 * 1000,   // 2 h
        HEIST: 12 * 60 * 60 * 1000  // 12 heures
    }
};