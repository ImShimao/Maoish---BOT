// config.js
module.exports = {
    // --- DATABASE ---
    // Remplace par ton lien de connexion MongoDB (Atlas ou local)
    MONGO_URL: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/maoish",

    // --- ÉCONOMIE ---
    STARTING_BALANCE: 0,
    CURRENCY: "€",
    
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

    // --- REVENTE (Sell Price) ---
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

    // --- COOLDOWNS (en millisecondes) ---
    COOLDOWNS: {
        WORK: 3600000,  // 1 heure
        DAILY: 86400000,// 24 heures
        MINE: 60000,    // 1 minute
        FISH: 30000,    // 30 secondes
        CRIME: 300000   // 5 minutes
    },

    // --- PROBABILITÉS (0 à 1) ---
    PROBS: {
        CRIME_SUCCESS: 0.6,
        ROB_SUCCESS: 0.6,
        LOCK_BREAK: 0.5
    }
};