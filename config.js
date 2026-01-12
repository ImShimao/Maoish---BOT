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
        PICKAXE: 1000,
        LAPTOP: 3000,
        LOCK: 200,
        RING: 10000,
        ROLEX: 25000
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

    // --- COOLDOWN (Défauts) ---
    COOLDOWNS: {
        WORK: 1800000,  // 30 min
        DAILY: 86400000,// 24 h
        MINE: 60000,    // 1 min
        FISH: 30000,    // 30 sec
        CRIME: 120000,  // 2 min
        BEG: 300000,    // 5 min
        ROB: 3600000    // 1 h
    },
    COLORS: {
        MAIN: 0x5865F2,    // Blurple
        SUCCESS: 0x2ECC71, // Vert
        ERROR: 0xE74C3C,   // Rouge
        ECONOMY: 0xF1C40F  // Jaune/Or
    },
};