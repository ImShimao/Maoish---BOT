const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('💥 Supprime et recrée ce salon (Nettoyage total)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interactionOrMessage) {
        const channel = interactionOrMessage.channel;
        const user = interactionOrMessage.user || interactionOrMessage.author;

        // --- 1. FONCTION DE RÉPONSE HYBRIDE ---
        const replyFunc = async (payload) => {
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.reply({ ...payload, fetchReply: true });
            return await interactionOrMessage.channel.send(payload);
        };

        // --- 2. VÉRIFICATION PERMISSIONS ---
        if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu dois avoir la permission `Gérer les salons` pour faire ça.")] 
            });
        }

        // --- 3. INTERFACE DE CONFIRMATION ---
        const confirmBtn = new ButtonBuilder()
            .setCustomId('confirm_nuke')
            .setLabel('OUI, TOUT FAIRE SAUTER 💥')
            .setStyle(ButtonStyle.Danger);

        const cancelBtn = new ButtonBuilder()
            .setCustomId('cancel_nuke')
            .setLabel('Annuler')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(cancelBtn, confirmBtn);

        const response = await replyFunc({
            embeds: [embeds.warning(interactionOrMessage, "⚠️ ATTENTION NUCLÉAIRE ⚠️", 
                "Tu es sur le point de **SUPPRIMER DÉFINITIVEMENT** ce salon pour le recréer à neuf.\n\nTous les messages seront perdus à jamais.\n**Es-tu sûr de vouloir continuer ?**")],
            components: [row]
        });

        // --- 4. COLLECTEUR D'INTERACTION ---
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 15000 // 15 secondes pour décider
        });

        collector.on('collect', async i => {
            // Sécurité : Seul celui qui a fait la commande peut cliquer
            if (i.user.id !== user.id) {
                return i.reply({ content: "Pas touche ! Ce n'est pas ton bouton.", ephemeral: true });
            }

            if (i.customId === 'cancel_nuke') {
                await i.update({ content: "✅ Opération annulée. Le salon est sauf.", embeds: [], components: [] });
                return collector.stop();
            }

            if (i.customId === 'confirm_nuke') {
                await i.update({ content: "☢️ **LANCEMENT DE LA SÉQUENCE DE DESTRUCTION...**", embeds: [], components: [] });
                collector.stop();

                // --- 5. LOGIQUE NUKE ---
                try {
                    // A. On clone le salon (garde les perms, topic, etc.)
                    const position = channel.position;
                    const newChannel = await channel.clone({ reason: `Nuke demandé par ${user.tag}` });

                    // B. On supprime l'ancien
                    await channel.delete();

                    // C. On remet la position (Discord aime bien mettre tout en bas sinon)
                    await newChannel.setPosition(position);

                    // D. On envoie l'animation dans le NOUVEAU salon
                    const embed = embeds.success(interactionOrMessage, '☢️ CHANNEL NUKED ☢️', `Ce salon a été nettoyé par ${user}.`)
                        .setColor(0xFF0000) // Rouge pur
                        .setImage('https://media.giphy.com/media/XUFPGrX5Zis6Y/giphy.gif'); // Gif d'explosion

                    await newChannel.send({ embeds: [embed] });

                } catch (error) {
                    console.error(error);
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                // Si le temps est écoulé, on supprime les boutons
                try {
                    if (interactionOrMessage.isCommand?.()) await interactionOrMessage.editReply({ components: [] });
                    else await response.edit({ components: [] });
                } catch (e) {}
            }
        });
    }
};