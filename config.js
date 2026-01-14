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

    // --- PRIX DES ITEMS ---
    PRICES: {
        PHONE: 1500,
        FISHING_ROD: 500,
        PICKAXE: 500,
        LAPTOP: 3000,
        LOCK: 200,
        RING: 10000,
        ROLEX: 25000,
        FERRARI: 100000
    },

    // --- REVENTE ---
    SELL_PRICES: {
        FISH: 45,
        RARE_FISH: 250,
        TRASH: 5,
        STONE: 15,
        COAL: 40,
        GOLD: 350,
        DIAMOND: 5000,
        SHARK: 1500
    },

    // --- COOLDOWNS (En millisecondes) ---
    COOLDOWNS: {
        WORK: 30 * 60 * 1000,   // 30 min
        DAILY: 24 * 60 * 60 * 1000, // 24 h
        
        MINE: 60 * 1000,        // 1 min
        FISH: 30 * 1000,        // 30 sec
        DIG: 2.5 * 60 * 1000,   // 2 min 30 (150 000 ms)
        
        BEG: 2 * 60 * 1000,     // 2 min
        CRIME: 2 * 60 * 1000,   // 2 min
        ROB: 60 * 60 * 1000     // 1 h
    }
};