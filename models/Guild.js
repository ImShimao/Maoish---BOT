// models/Guild.js
const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // Config des Logs
    logs: {
        channelId: { type: String, default: null }, // ID du salon logs
        active: { type: Boolean, default: false },  // Système activé ou non
        
        // Catégories de logs (True = activé)
        messages: { type: Boolean, default: true }, // Suppressions/Edits
        voice: { type: Boolean, default: true },    // Connexions/Déconnexions
        members: { type: Boolean, default: true },  // Arrivées/Départs
        mod: { type: Boolean, default: true }       // Bans/Kicks/Warns
    },

    // Système de Warns (Tableau d'objets)
    warns: [{
        userId: String,
        reason: String,
        moderatorId: String,
        date: { type: Number, default: Date.now }
    }]
});

module.exports = mongoose.model('Guild', GuildSchema);