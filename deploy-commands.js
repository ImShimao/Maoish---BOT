require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Liste des commandes Slash
const commands = [
    {
        name: 'ping',
        description: 'Répond Pong! (Version Slash)',
    },
    {
        name: 'comparer',
        description: 'Compare le prix d\'un produit tech (Bientôt dispo)',
        options: [
            {
                name: 'lien',
                description: 'Le lien du produit',
                type: 3, // 3 = STRING (Texte)
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('⏳ Enregistrement des Slash Commands...');

        // Enregistrement sur ton serveur spécifique (GUILD_ID) pour mise à jour immédiate
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('✅ Slash Commands enregistrées avec succès !');
    } catch (error) {
        console.error(error);
    }
})();