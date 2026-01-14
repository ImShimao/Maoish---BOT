require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const Table = require('cli-table3');
const mongoose = require('mongoose');
const config = require('./config.js');
const eco = require('./utils/eco.js'); // Importation pour l'XP Vocal

// --- INITIALISATION DU CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates, // REQUIS POUR L'XP VOCAL
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

// --- CONNEXION DATABASE ---
mongoose.connect(config.MONGO_URL)
    .then(() => console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB Connecté'))
    .catch(err => console.error('\x1b[31m%s\x1b[0m', '❌ Erreur MongoDB:', err));

// --- STYLE DU CONSOLE LOG (TON STYLE ORIGINAL) ---
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
console.log('║         🚀 INITIALISATION DE MAOISH      ║');
console.log('╚══════════════════════════════════════════╝' + '\x1b[0m');

// --- CHARGEMENT DES COMMANDES (PAR DOSSIERS) ---
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

// --- CHARGEMENT DES EVENTS ---
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

// --- SYSTÈME XP VOCAL (S'active quand le bot est prêt) ---
client.on('ready', () => {
    // Le message "est en ligne" est déjà géré par ton event ready.js normalement
    
    // Boucle de vérification toutes les 5 minutes (300 000 ms)
    setInterval(async () => {
        client.guilds.cache.forEach(async (guild) => {
            // On récupère tous les salons vocaux où il y a du monde
            const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased() && c.members.size > 0);
            
            for (const channel of voiceChannels.values()) {
                // On filtre les membres éligibles :
                // - Pas un bot
                // - Pas en sourdine (SelfDeaf) pour éviter l'AFK passif
                // - Doit être au moins 2 dans le salon (pour éviter de farm tout seul)
                const eligibleMembers = channel.members.filter(m => 
                    !m.user.bot && 
                    !m.voice.selfDeaf && 
                    channel.members.size > 1
                );

                for (const member of eligibleMembers.values()) {
                    const xpGain = 50; // On donne 50 XP
                    const res = await eco.addXP(member.id, xpGain);
                    
                    // Si le joueur passe un niveau en vocal, on lui envoie un petit DM
                    if (res.leveledUp) {
                        try {
                            await member.send(`🎙️ **Activité Vocale** : En discutant sur **${guild.name}**, tu es passé **Niveau ${res.newLevel}** ! 🎉`);
                        } catch (e) {
                            // On ignore si les DMs sont fermés
                        }
                    }
                }
            }
        });
    }, 5 * 60 * 1000); 
});

// --- SYSTÈME ANTI-CRASH ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('\x1b[31m%s\x1b[0m', ' [ANTI-CRASH] Erreur non gérée :', reason);
});

process.on('uncaughtException', (err) => {
    console.error('\x1b[31m%s\x1b[0m', ' [ANTI-CRASH] Exception critique :', err);
});

// --- DÉMARRAGE ---
client.login(TOKEN);