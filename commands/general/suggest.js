const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Guild = require('../../models/Guild'); //
const embeds = require('../../utils/embeds'); //

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Proposer une idée pour le serveur')
        .addStringOption(option => 
            option.setName('idee')
                .setDescription('Ta suggestion détaillée')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let suggestion, author, replyFunc;

        // --- 1. GESTION HYBRIDE (Slash / Prefix) ---
        if (interactionOrMessage.isCommand?.()) {
            suggestion = interactionOrMessage.options.getString('idee');
            author = interactionOrMessage.user;
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
        } else {
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Exemple : `+suggest Ajouter un salon musique`")]
                });
            }
            suggestion = args.join(' ');
            author = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
            try { await interactionOrMessage.delete(); } catch (e) {}
        }

        // --- 2. VÉRIFICATION CONFIG ---
        const guildConfig = await Guild.findOne({ guildId: interactionOrMessage.guild.id });
        
        if (!guildConfig || !guildConfig.suggestChannel) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, 'Non configuré', 'Les suggestions ne sont pas activées sur ce serveur. Demande à un admin de faire `/setsuggest`.')],
                ephemeral: true 
            });
        }

        const channel = interactionOrMessage.guild.channels.cache.get(guildConfig.suggestChannel);
        if (!channel) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, 'Erreur', 'Le salon de suggestions semble avoir été supprimé.')],
                ephemeral: true 
            });
        }

        // --- 3. PRÉPARATION DES DONNÉES DE VOTE ---
        // Map<UserId, 'up' | 'down'>
        const votes = new Map();

        const generateStatus = () => {
            const upCount = Array.from(votes.values()).filter(v => v === 'up').length;
            const downCount = Array.from(votes.values()).filter(v => v === 'down').length;
            const total = upCount + downCount;

            const upPercent = total === 0 ? 0 : Math.round((upCount / total) * 100);
            const downPercent = total === 0 ? 0 : Math.round((downCount / total) * 100);

            // Génération des barres (10 blocs)
            const createBar = (percent, colorBlock) => {
                const filled = Math.round((percent / 100) * 10);
                return colorBlock.repeat(filled) + '⬜'.repeat(10 - filled);
            };

            return `\n\n📊 **Statistiques des votes**\n` +
                   `✅ **Pour** : ${upCount} (${upPercent}%)\n${createBar(upPercent, '🟦')}\n\n` +
                   `❌ **Contre** : ${downCount} (${downPercent}%)\n${createBar(downPercent, '🟥')}\n` +
                   `\n*Total des votants : ${total}*`;
        };

        // --- 4. CRÉATION DE L'EMBED INITIAL ---
        const embed = embeds.info(interactionOrMessage, `Nouvelle Suggestion`, suggestion + generateStatus())
            .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() })
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setColor(0xFFD700) // Or
            .setFooter({ text: 'Maoish Suggestions • Utilisez les boutons pour voter !' })
            .setTimestamp();

        // --- 5. CRÉATION DES BOUTONS ---
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('suggest_up')
                .setLabel('Pour')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('suggest_down')
                .setLabel('Contre')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

        try {
            // Envoi dans le salon de suggestions
            const msg = await channel.send({ embeds: [embed], components: [row] });

            // Confirmation à l'auteur
            await replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, 'Envoyé !', `Ta suggestion est en ligne dans ${channel}.`)],
                ephemeral: true 
            });

            // --- 6. COLLECTEUR (Gestion des clics) ---
            // Le collecteur durera indéfiniment tant que le bot ne redémarre pas (time: 0 non recommandé, on met une très longue durée ou on gère via interactionCreate pour du permanent)
            // Ici on met 7 jours pour l'exemple (604800000 ms)
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 604800000 });

            collector.on('collect', async i => {
                const userId = i.user.id;
                const action = i.customId === 'suggest_up' ? 'up' : 'down';

                // Gestion du vote (bascule)
                if (votes.get(userId) === action) {
                    votes.delete(userId); // Annulation si on reclique sur le même
                    await i.reply({ content: "Vote retiré.", ephemeral: true });
                } else {
                    votes.set(userId, action); // Nouveau vote ou changement
                    await i.reply({ content: `A voté : **${action === 'up' ? 'Pour' : 'Contre'}**`, ephemeral: true });
                }

                // Mise à jour de l'embed
                embed.setDescription(suggestion + generateStatus());
                await msg.edit({ embeds: [embed] });
            });

            collector.on('end', async () => {
                // Quand le temps est écoulé (optionnel : désactiver les boutons)
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(row.components[0]).setDisabled(true),
                    ButtonBuilder.from(row.components[1]).setDisabled(true)
                );
                embed.setFooter({ text: 'Suggestion clôturée (Temps écoulé ou redémarrage).' });
                await msg.edit({ components: [disabledRow], embeds: [embed] });
            });

        } catch (error) {
            console.error(error);
            await replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, 'Erreur', 'Impossible d\'envoyer la suggestion.')],
                ephemeral: true 
            });
        }
    }
};