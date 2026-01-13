module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // 1. SÉCURITÉ MP : On bloque si ce n'est pas sur un serveur
        if (!interaction.guild) {
            if (interaction.isRepliable()) {
                return interaction.reply({ content: "❌ **Mes commandes ne fonctionnent que sur un serveur !**", ephemeral: true });
            }
            return;
        }

        // 2. GESTION DE L'AUTOCOMPLÉTION (Pour tes commandes /animal, /giveitem, etc.)
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try { await command.autocomplete(interaction); } catch (e) { console.error(e); }
            return;
        }

        // 3. GESTION DES COMMANDES CLASSIQUES
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try { 
            await command.execute(interaction); 
        } catch (error) { 
            console.error(error);
            // On évite de faire planter le bot si la réponse a déjà été envoyée
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Erreur lors de l\'exécution !', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Erreur lors de l\'exécution !', ephemeral: true });
            }
        }
    },
};