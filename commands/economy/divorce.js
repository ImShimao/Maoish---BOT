const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('Mettre fin à ton mariage (Irréversible)'),

    async execute(interactionOrMessage) {
        let user;

        // On détermine l'utilisateur selon le type de commande
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
        } else {
            user = interactionOrMessage.author;
        }

        // --- 1. VÉRIFICATION DE LA SITUATION AMOUREUSE ---
        const userData = await eco.get(user.id);

        if (!userData.partner) {
            const errorContent = "❌ **Tu es célibataire !** Tu ne peux pas divorcer si tu n'es pas marié.";
            if (interactionOrMessage.isCommand?.()) {
                return interactionOrMessage.reply({ content: errorContent, ephemeral: true });
            } else {
                return interactionOrMessage.channel.send(errorContent);
            }
        }

        // On récupère l'ID du partenaire
        const partnerId = userData.partner;
        
        // On essaie de trouver le nom du partenaire sur Discord pour l'affichage
        let partnerName = "Ton partenaire";
        try {
            const partnerUser = await interactionOrMessage.client.users.fetch(partnerId);
            partnerName = partnerUser.username;
        } catch (e) {
            partnerName = "Utilisateur Inconnu";
        }

        // --- 2. DEMANDE DE CONFIRMATION ---
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('💔 Divorce')
            .setDescription(`Es-tu sûr de vouloir divorcer de **${partnerName}** ?\n\nCela annulera votre mariage immédiatement.`)
            .setFooter({ text: 'Cette action est irréversible.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_divorce').setLabel('Oui, je veux divorcer').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_divorce').setLabel('Non, annuler').setStyle(ButtonStyle.Secondary)
        );

        // --- 3. ENVOI DU MESSAGE (CORRIGÉ) ---
        let msg; // On déclare la variable ICI pour qu'elle soit accessible ensuite

        if (interactionOrMessage.isCommand?.()) {
            // Pour les Slash Commands, on DOIT utiliser fetchReply: true pour récupérer l'objet Message
            msg = await interactionOrMessage.reply({ embeds: [embed], components: [row], fetchReply: true });
        } else {
            // Pour les commandes classiques (+), on stocke le retour de channel.send
            msg = await interactionOrMessage.channel.send({ embeds: [embed], components: [row] });
        }

        // --- 4. GESTION DU BOUTON ---
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 30000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'cancel_divorce') {
                await i.update({ content: "😌 **Ouf !** L'amour a triomphé. Le divorce est annulé.", embeds: [], components: [] });
            } 
            else if (i.customId === 'confirm_divorce') {
                // --- ACTION : DIVORCE ---
                
                // 1. On récupère les données fraîches des deux (au cas où)
                const me = await eco.get(user.id);
                const them = await eco.get(partnerId);

                // 2. On coupe le lien des deux côtés
                me.partner = null;
                them.partner = null;

                // 3. On sauvegarde
                await me.save();
                await them.save();

                const divorceEmbed = new EmbedBuilder()
                    .setColor(0x95A5A6) // Gris
                    .setTitle('💔 C\'est fini...')
                    .setDescription(`**${user.username}** a divorcé de **${partnerName}**.\n\nVous êtes maintenant tous les deux célibataires.`);

                await i.update({ content: null, embeds: [divorceEmbed], components: [] });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                // On essaie de modifier le message original si le temps est écoulé
                try { 
                    if (interactionOrMessage.isCommand?.()) {
                         await interactionOrMessage.editReply({ content: "⏱️ Temps écoulé, divorce annulé.", components: [], embeds: [] });
                    } else {
                         await msg.edit({ content: "⏱️ Temps écoulé, divorce annulé.", components: [], embeds: [] });
                    }
                } catch (e) {}
            }
        });
    }
};