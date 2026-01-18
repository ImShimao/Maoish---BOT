const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // --- NOUVEAU : SYSTÈME DE SUGGESTIONS ---
    suggestChannel: { type: String, default: null },

    // --- CONFIGURATION ÉCONOMIE & VISUELS ---
    economy: {
        symbol: { type: String, default: "€" }, 
        currencyName: { type: String, default: "Euros" },
        bankCapacity: { type: Number, default: 10000 }, 
        inflation: { type: Number, default: 1.0 }
    },

    // --- CONFIGURATION DES LOGS ---
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