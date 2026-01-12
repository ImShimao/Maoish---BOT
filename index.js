require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const Table = require('cli-table3');
const mongoose = require('mongoose');
const config = require('./config.js');

// --- INITIALISATION DU CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

// --- CONNEXION DATABASE ---
mongoose.connect(config.MONGO_URL)
    .then(() => console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB Connecté'))
    .catch(err => console.error('\x1b[31m%s\x1b[0m', '❌ Erreur MongoDB:', err));

// --- CONFIGURATION DU TABLEAU (STYLE PRO) ---
const table = new Table({
    head: ['\x1b[35mCommande\x1b[0m', '\x1b[32mStatut\x1b[0m'], 
    chars: {
        'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
        'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
        'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
        'right': '║', 'right-mid': '╢', 'middle': '│'
    },
    style: { head: [], border: ['grey'] },
    colWidths: [25, 12],
    colAligns: ['left', 'center']
});

console.clear();
console.log('\x1b[36m' + '╔══════════════════════════════════════════╗');
console.log('║        🚀 INITIALISATION DE MAOISH       ║');
console.log('╚══════════════════════════════════════════╝' + '\x1b[0m');

// --- CHARGEMENT DES COMMANDES ---
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const folderPath = path.join(foldersPath, folder);
    if (!fs.lstatSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                command.category = folder;
                client.commands.set(command.data.name, command);
                table.push([command.data.name, '✅']);
            } else {
                table.push([file, '⚠️']);
            }
        } catch (error) {
            table.push([file, '❌']);
            console.error(`Erreur sur ${file}:`, error);
        }
    }
}

console.log(table.toString());

// --- CHARGEMENT DES EVENTS (EVENT HANDLER) ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// --- SYSTÈME ANTI-CRASH ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('\x1b[31m%s\x1b[0m', ' [ANTI-CRASH] Erreur non gérée :', reason);
});

process.on('uncaughtException', (err) => {
    console.error('\x1b[31m%s\x1b[0m', ' [ANTI-CRASH] Exception critique :', err);
});

// --- DÉMARRAGE DU BOT ---
client.login(TOKEN);