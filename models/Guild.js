const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // --- CONFIGURATION ÉCONOMIE & VISUELS ---
    economy: {
        // Le logo de l'argent (ex: "€", "💵", "<:monLogo:123456>")
        symbol: { type: String, default: "€" }, 
        currencyName: { type: String, default: "Euros" },
        
        // Espace de la banque par défaut (pour limiter les riches si tu veux)
        bankCapacity: { type: Number, default: 10000 }, 
        
        // Facteur d'inflation (1.0 = normal, 0.5 = tout coûte moins cher, 2.0 = tout est cher)
        inflation: { type: Number, default: 1.0 }
    },

    // --- CONFIGURATION DES LOGS (Tu gardes ton système actuel) ---
    logs: {
        channelId: { type: String, default: null },
        active: { type: Boolean, default: false },
        
        messages: { type: Boolean, default: true },
        voice: { type: Boolean, default: true },
        members: { type: Boolean, default: true },
        mod: { type: Boolean, default: true }
    },

    // --- SYSTÈME DE WARNS ---
    warns: [{
        userId: String,
        reason: String,
        moderatorId: String,
        date: { type: Number, default: Date.now }
    }]
});

module.exports = mongoose.model('Guild', GuildSchema);