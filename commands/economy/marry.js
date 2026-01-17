const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Demande quelqu\'un en mariage (Nécessite une 💍 Bague)')
        .addUserOption(option => 
            option.setName('partenaire')
                .setDescription('L\'amour de ta vie')
                .setRequired(true)),

    async execute(interactionOrMessage) {
        let proposer, targetUser, replyFunc;
        // ✅ 1. Récupération ID Serveur (INDISPENSABLE)
        const guildId = interactionOrMessage.guild.id; 

        if (interactionOrMessage.isCommand?.()) {
            proposer = interactionOrMessage.user;
            targetUser = interactionOrMessage.options.getUser('partenaire');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            proposer = interactionOrMessage.author;
            targetUser = interactionOrMessage.mentions.users.first();
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- 1. VÉRIFICATIONS DE BASE ---
        if (!targetUser) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Il faut mentionner quelqu'un !")] });
        if (proposer.id === targetUser.id) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas t'épouser toi-même.")] });
        if (targetUser.bot) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas épouser un robot !")] });

        // --- 2. VÉRIFICATION DE LA BAGUE ---
        // ✅ Ajout guildId ici
        const hasRing = await eco.hasItem(proposer.id, guildId, 'ring');
        if (!hasRing) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Tu n'as pas de Bague ! 💍\nVa en acheter une au `/shop` avant de faire ta demande.")] 
            });
        }

        // --- 3. VÉRIFICATION MARIAGE EXISTANT ---
        // ✅ Ajout guildId ici pour vérifier le statut SUR CE SERVEUR
        const proposerData = await eco.get(proposer.id, guildId);
        const targetData = await eco.get(targetUser.id, guildId);

        if (proposerData.partner) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu es déjà marié ! Divorces d'abord.")] });
        if (targetData.partner) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `${targetUser.username} est déjà marié(e) !`)] });

        // --- 4. LA DEMANDE ---
        const embed = embeds.info(interactionOrMessage, '💍 Demande en Mariage', 
            `**${targetUser}**, **${proposer}** demande ta main !\n\n*Acceptes-tu de l'épouser pour le meilleur et pour le pire ?*`
        )
        .setColor(0xE91E63) // Rose
        .setFooter({ text: 'Tu as 60 secondes pour répondre.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_marry').setLabel('OUI, je le veux ! 💖').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('refuse_marry').setLabel('Non désolé... 💔').setStyle(ButtonStyle.Danger)
        );

        const msg = await replyFunc({ content: `${targetUser}`, embeds: [embed], components: [row], fetchReply: true });

        // --- 5. GESTION DE LA RÉPONSE ---
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === targetUser.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'accept_marry') {
                // ✅ Ajout guildId ici
                if (!await eco.hasItem(proposer.id, guildId, 'ring')) {
                    return i.reply({ embeds: [embeds.error(i, "L'autre n'a plus la bague ! Arnaque !")], ephemeral: true });
                }

                // ✅ Ajout guildId ici aussi pour valider le mariage et retirer l'objet
                await eco.removeItem(proposer.id, guildId, 'ring');
                await eco.setPartner(proposer.id, guildId, targetUser.id);

                const successEmbed = embeds.success(interactionOrMessage, '💒 VIVE LES MARIÉS ! 💒', 
                    `🎉 **${proposer}** et **${targetUser}** sont maintenant mariés !\n\nLa bague 💍 a été passée au doigt.`
                ).setColor(0xFF69B4); // Rose clair

                await i.update({ content: null, embeds: [successEmbed], components: [] });
            } 
            else if (i.customId === 'refuse_marry') {
                const sadEmbed = embeds.info(interactionOrMessage, '💔 Refus...', 
                    `**${targetUser}** a refusé la demande de ${proposer}...\n(Tu as gardé ta bague au moins).`
                ).setColor(0x000000); // Noir/Gris
                
                await i.update({ content: null, embeds: [sadEmbed], components: [] });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                try {
                    const timeoutEmbed = embeds.error(interactionOrMessage, "⏱️ Le silence est une réponse... La demande a expiré.");
                    await msg.edit({ content: null, embeds: [timeoutEmbed], components: [] });
                } catch (e) {}
            }
        });
    }
};