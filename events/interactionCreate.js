const { Events, EmbedBuilder } = require('discord.js');
const embeds = require('../utils/embeds'); // Assure-toi que le chemin est bon

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // --- 1. SÉCURITÉ MP (Bloque les commandes hors serveur) ---
        if (!interaction.guild) {
            if (interaction.isRepliable()) {
                return interaction.reply({ content: "❌ **Mes commandes ne fonctionnent que sur un serveur !**", ephemeral: true });
            }
            return;
        }

        // --- 2. GESTION DE L'AUTOCOMPLÉTION (Pour shops, items, etc.) ---
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

        // --- 3. GESTION DES COMMANDES SLASH (Chat Input) ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`Commande introuvable : ${interaction.commandName}`);
                return;
            }

            try { 
                await command.execute(interaction); 
            } catch (error) { 
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '❌ Une erreur critique est survenue !', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Une erreur critique est survenue !', ephemeral: true });
                }
            }
        }

        // --- 4. GESTION DES MODALS (Nouveau : Embed Builder) ---
        else if (interaction.isModalSubmit()) {
            
            // On vérifie si c'est le formulaire de l'Embed Builder
            if (interaction.customId.startsWith('embedBuilder_')) {
                
                // On récupère l'ID du salon qui était caché dans le customId
                const channelId = interaction.customId.split('_')[1];
                const channel = interaction.guild.channels.cache.get(channelId);

                if (!channel) {
                    return interaction.reply({ content: "❌ Le salon cible n'existe plus.", ephemeral: true });
                }

                // Récupération des valeurs saisies par l'utilisateur
                const title = interaction.fields.getTextInputValue('title');
                const description = interaction.fields.getTextInputValue('description');
                const color = interaction.fields.getTextInputValue('color') || '#2B2D31';
                const footer = interaction.fields.getTextInputValue('footer');
                const image = interaction.fields.getTextInputValue('image');

                // Construction de l'embed
                const finalEmbed = new EmbedBuilder()
                    .setDescription(description)
                    .setColor(color);

                if (title) finalEmbed.setTitle(title);
                if (footer) finalEmbed.setFooter({ text: footer });
                
                // Validation basique de l'URL image pour éviter les crashs
                if (image && image.startsWith('http')) finalEmbed.setImage(image);

                try {
                    // Envoi dans le salon choisi
                    await channel.send({ embeds: [finalEmbed] });
                    
                    // Confirmation à l'admin (visible uniquement par lui)
                    await interaction.reply({ 
                        embeds: [embeds.success(interaction, 'Embed Envoyé', `Ton embed a été posté dans ${channel}.`)],
                        ephemeral: true 
                    });
                } catch (err) {
                    console.error(err);
                    await interaction.reply({ 
                        embeds: [embeds.error(interaction, 'Erreur', 'Je n\'ai pas réussi à envoyer l\'embed. Vérifie mes permissions ou l\'URL de l\'image.')],
                        ephemeral: true 
                    });
                }
            }
        }
    },
};