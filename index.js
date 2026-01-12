require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials, REST, Routes, ActivityType } = require('discord.js');
const Table = require('cli-table3');

// --- 1. VÉRIFICATION DU TOKEN ---
if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    console.error("❌ ERREUR FATALE : Aucun Token trouvé. Vérifie ton fichier .env (DISCORD_TOKEN).");
    process.exit(1);
}
// On prend celui qui existe
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// --- 2. CONFIGURATION DU CLIENT ---
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
const slashCommandsData = [];

// --- 3. CHARGEMENT DES COMMANDES (Tableau + Sous-dossiers) ---
const table = new Table({
    head: ['Commande', 'Catégorie', 'Statut'],
    colWidths: [20, 15, 10]
});

console.clear();
console.log('🚀 Initialisation de Maoish...');

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const folderPath = path.join(foldersPath, folder);
    
    // Si c'est un DOSSIER (admin, fun, etc...)
    if (fs.lstatSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    command.category = folder; // On sauvegarde la catégorie pour le Help
                    slashCommandsData.push(command.data.toJSON());
                    table.push([command.data.name, folder, '✅']);
                } else {
                    table.push([file, folder, '⚠️']);
                }
            } catch (e) {
                table.push([file, 'ERREUR', '❌']);
                console.error(e);
            }
        }
    } 
    // Si c'est un FICHIER orphelin à la racine
    else if (folder.endsWith('.js')) {
        const filePath = path.join(foldersPath, folder);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            command.category = 'Autre';
            slashCommandsData.push(command.data.toJSON());
            table.push([command.data.name, 'Racine', '✅']);
        }
    }
}

// Affichage du tableau dans la console
console.log(table.toString());

// --- 4. DÉPLOIEMENT REST (Slash Commands) ---
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function deployCommands() {
    try {
        console.log('🔄 Actualisation des Slash Commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: slashCommandsData },
        );
        console.log('🌐 Commandes enregistrées avec succès !');
    } catch (error) {
        console.error('❌ Erreur déploiement:', error);
    }
}

// --- 5. ÉVÉNEMENTS ---

// A. Ready
client.once('ready', async () => {
    await deployCommands();
    console.log(`🟢 ${client.user.tag} est en ligne !`);

    // Animation Statut
    const activities = [
        { name: '🔥 Modère le serveur', type: ActivityType.Custom },
        { name: '💻 Code avec Vins', type: ActivityType.Playing },
        { name: '/help pour de l\'aide', type: ActivityType.Watching },
        { name: '🎰 Casino Ouvert !', type: ActivityType.Playing },
    ];

    let i = 0;
    setInterval(() => {
        client.user.setActivity(activities[i]);
        i = ++i % activities.length;
    }, 10_000);
});

// B. Interactions (Slash + Boutons + Menus)
client.on('interactionCreate', async interaction => {
    // Gestion des commandes Slash
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try { await command.execute(interaction); } 
        catch (error) { 
            console.error(error); 
            const errPay = { content: '❌ Erreur interne !', ephemeral: true };
            if (interaction.replied || interaction.deferred) await interaction.followUp(errPay);
            else await interaction.reply(errPay);
        }
    }
    // Les boutons/menus sont gérés dans les fichiers commandes via les collectors, 
    // donc pas besoin de code ici sauf si tu veux des boutons globaux permanents.
});

// C. Messages (Préfixe "+")
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('+')) return;
 
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    if (command) {
        try { await command.execute(message, args); } 
        catch (error) { 
            console.error(error);
            message.reply('❌ Erreur lors de l\'exécution.');
        }
    }
});

// --- 6. ANTI-CRASH ---
process.on('unhandledRejection', (reason, promise) => {
    console.error(' [ANTI-CRASH] Erreur non gérée :', reason);
});
process.on('uncaughtException', (err) => {
    console.error(' [ANTI-CRASH] Exception critique :', err);
});

// --- 7. LOGIN ---
client.login(TOKEN);