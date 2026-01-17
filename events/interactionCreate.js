const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate, // Ou 'interactionCreate' si tu préfères le string direct
    async execute(interaction) {
        // 1. SÉCURITÉ MP : On bloque si ce n'est pas sur un serveur
        // Indispensable pour la V2 (Multi-Serveur) car on a besoin de guildId
        if (!interaction.guild) {
            if (interaction.isRepliable()) {
                return interaction.reply({ content: "❌ **Mes commandes ne fonctionnent que sur un serveur !**", ephemeral: true });
            }
            return;
        }

        // 2. GESTION DE L'AUTOCOMPLÉTION
        // Utile pour les shops, inventaires, etc. qui proposent des choix dynamiques
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            
            try { 
                await command.autocomplete(interaction); 
            } catch (e) { 
                console.error(`Erreur Autocomplete ${interaction.commandName}:`, e); 
            }
            return;
        }

        // 3. GESTION DES COMMANDES CLASSIQUES (Slash)
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`Commande introuvable : ${interaction.commandName}`);
            return;
        }

        try { 
            await command.execute(interaction); 
        } catch (error) { 
            console.error(error);
            // On évite de faire planter le bot si la réponse a déjà été envoyée
            // On utilise followUp pour envoyer un nouveau message discret
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Une erreur critique est survenue !', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Une erreur critique est survenue !', ephemeral: true });
            }
        }
    },
};