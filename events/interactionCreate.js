const { Events, EmbedBuilder } = require('discord.js');
const embeds = require('../utils/embeds'); 

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // --- 1. SÉCURITÉ MP (Utilisation de inGuild) ---
        if (!interaction.inGuild()) {
            if (interaction.isRepliable()) {
                return interaction.reply({ 
                    content: "❌ **Mes commandes ne fonctionnent que sur un serveur !**\nJe ne peux pas répondre aux messages privés.", 
                    ephemeral: true 
                });
            }
            return;
        }

        // --- 2. GESTION DU CACHE ET "UNKNOWN GUILD" ---
        // Si l'objet guild est manquant, on essaie de le récupérer
        if (!interaction.guild) {
            try {
                interaction.guild = await interaction.client.guilds.fetch(interaction.guildId);
            } catch (error) {
                // Erreur 10004 : Le bot n'est pas sur le serveur (User Install context)
                if (error.code === 10004) {
                    return interaction.reply({ 
                        content: "❌ **Je ne suis pas membre de ce serveur !**\nPour gérer l'économie ici, un administrateur doit m'inviter officiellement sur le serveur.\n*(Le système 'User Install' ne suffit pas pour les bases de données serveur)*.", 
                        ephemeral: true 
                    });
                }
                
                // Autres erreurs
                console.error("Erreur récupération guilde :", error);
                return interaction.reply({ content: "❌ Erreur de communication avec Discord. Réessayez.", ephemeral: true });
            }
        }

        // --- 3. AUTOCOMPLÉTION ---
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try { await command.autocomplete(interaction); } catch (e) {}
            return;
        }

        // --- 4. COMMANDES SLASH ---
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
                const errPayload = { content: '❌ Une erreur critique est survenue !', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(errPayload).catch(() => {});
                else await interaction.reply(errPayload).catch(() => {});
            }
        }

        // --- 5. MODALS ---
        else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('embedBuilder_')) {
                const channelId = interaction.customId.split('_')[1];
                const channel = interaction.guild.channels.cache.get(channelId);

                if (!channel) return interaction.reply({ content: "❌ Salon introuvable.", ephemeral: true });

                const title = interaction.fields.getTextInputValue('title');
                const description = interaction.fields.getTextInputValue('description');
                const color = interaction.fields.getTextInputValue('color') || '#2B2D31';
                const footer = interaction.fields.getTextInputValue('footer');
                const image = interaction.fields.getTextInputValue('image');

                const finalEmbed = new EmbedBuilder().setDescription(description).setColor(color);
                if (title) finalEmbed.setTitle(title);
                if (footer) finalEmbed.setFooter({ text: footer });
                if (image && image.startsWith('http')) finalEmbed.setImage(image);

                try {
                    await channel.send({ embeds: [finalEmbed] });
                    await interaction.reply({ embeds: [embeds.success(interaction, 'Succès', `Embed envoyé dans ${channel}.`)], ephemeral: true });
                } catch (err) {
                    await interaction.reply({ embeds: [embeds.error(interaction, 'Erreur', 'Impossible d\'envoyer l\'embed.')], ephemeral: true });
                }
            }
        }
    },
};