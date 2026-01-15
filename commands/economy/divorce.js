const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('Mettre fin à ton mariage (Irréversible)'),

    async execute(interactionOrMessage) {
        let user;

        // On détermine l'utilisateur
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
        } else {
            user = interactionOrMessage.author;
        }

        // --- 1. VÉRIFICATION ---
        const userData = await eco.get(user.id);

        if (!userData.partner) {
            const errorEmbed = embeds.error(interactionOrMessage, "Tu es célibataire !\nTu ne peux pas divorcer si tu n'es pas marié.");
            
            if (interactionOrMessage.isCommand?.()) {
                return interactionOrMessage.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                return interactionOrMessage.channel.send({ embeds: [errorEmbed] });
            }
        }

        // Récupération du partenaire
        const partnerId = userData.partner;
        let partnerName = "Ton partenaire";
        try {
            const partnerUser = await interactionOrMessage.client.users.fetch(partnerId);
            partnerName = partnerUser.username;
        } catch (e) {
            partnerName = "Utilisateur Inconnu";
        }

        // --- 2. DEMANDE DE CONFIRMATION ---
        // Utilisation de embeds.warning pour attirer l'attention
        const confirmEmbed = embeds.warning(interactionOrMessage, '💔 Demande de Divorce', 
            `Es-tu sûr de vouloir divorcer de **${partnerName}** ?\n\nCela annulera votre mariage immédiatement.`
        ).setFooter({ text: 'Cette action est irréversible.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_divorce').setLabel('Oui, je veux divorcer').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_divorce').setLabel('Non, annuler').setStyle(ButtonStyle.Secondary)
        );

        // --- 3. ENVOI DU MESSAGE ---
        let msg;
        if (interactionOrMessage.isCommand?.()) {
            msg = await interactionOrMessage.reply({ embeds: [confirmEmbed], components: [row], fetchReply: true });
        } else {
            msg = await interactionOrMessage.channel.send({ embeds: [confirmEmbed], components: [row] });
        }

        // --- 4. GESTION DU BOUTON ---
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 30000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'cancel_divorce') {
                // Annulation : Embed Info/Success
                const cancelEmbed = embeds.success(interactionOrMessage, "Divorce annulé", "😌 **Ouf !** L'amour a triomphé.");
                await i.update({ embeds: [cancelEmbed], components: [] });
            } 
            else if (i.customId === 'confirm_divorce') {
                // --- ACTION : DIVORCE ---
                const me = await eco.get(user.id);
                const them = await eco.get(partnerId);

                me.partner = null;
                them.partner = null;

                await me.save();
                await them.save();

                // Embed spécial gris/triste (On le construit à la main ou on utilise info avec une couleur custom)
                // Ici je vais utiliser embeds.info et forcer la couleur grise pour le style "Triste"
                const divorceEmbed = embeds.info(interactionOrMessage, '💔 C\'est fini...', 
                    `**${user.username}** a divorcé de **${partnerName}**.\n\nVous êtes maintenant tous les deux célibataires.`
                ).setColor(0x95A5A6); // Gris

                await i.update({ embeds: [divorceEmbed], components: [] });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                try { 
                    const timeoutEmbed = embeds.error(interactionOrMessage, "⏱️ Temps écoulé, divorce annulé.");
                    if (interactionOrMessage.isCommand?.()) {
                         await interactionOrMessage.editReply({ embeds: [timeoutEmbed], components: [] });
                    } else {
                         await msg.edit({ embeds: [timeoutEmbed], components: [] });
                    }
                } catch (e) {}
            }
        });
    }
};