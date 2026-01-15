require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');
const config = require('./config.js');

// --- INITIALISATION DU CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

// --- AFFICHAGE HEADER ---
console.clear();
console.log('\x1b[36m' + '╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                      🚀 INITIALISATION DE MAOISH                           ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝' + '\x1b[0m');

// --- CHARGEMENT ET AFFICHAGE CÔTE À CÔTE ---
const commandTable = require('./handlers/commandHandler.js')(client);
const { table: eventTable, count: eventCount } = require('./handlers/eventHandler.js')(client);
require('./handlers/antiCrash.js')(client);

// Fonction pour fusionner les textes
const printSideBySide = (text1, text2) => {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    
    // On calcule la largeur visuelle (sans les codes couleurs ANSI) pour l'alignement
    const cleanLine = (str) => str.replace(/\x1B\[[0-9;]*[mK]/g, '');
    const width1 = lines1.length > 0 ? cleanLine(lines1[0]).length : 0;

    for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || ' '.repeat(width1); // On comble avec des espaces si le tableau 1 est fini
        const line2 = lines2[i] || '';
        console.log(line1 + '   ' + line2); // 3 espaces de séparation
    }
};

// Affichage des tableaux
printSideBySide(commandTable, eventTable);

// Affichage des résumés en dessous
console.log(`\n\x1b[32m✅ ${client.commands.size} Commandes chargées.\x1b[0m         \x1b[32m✅ ${eventCount} Événements chargés.\x1b[0m\n`);

// --- CONNEXION DATABASE ---
mongoose.connect(config.MONGO_URL)
    .then(() => console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB Connecté'))
    .catch(err => console.error('\x1b[31m%s\x1b[0m', '❌ Erreur MongoDB:', err));

// --- DÉMARRAGE ---
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
client.login(TOKEN);