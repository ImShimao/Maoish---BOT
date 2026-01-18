const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../config'); //

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reportbug')
        .setDescription('Signaler un bug complet au staff')
        // Option 1 : L'image preuve directement dans la commande
        .addAttachmentOption(option => 
            option.setName('preuve')
                .setDescription('Capture d\'écran du bug (Optionnel)')
                .setRequired(false)),

    async execute(interaction) {
        // 1. On récupère l'image si elle existe
        const attachment = interaction.options.getAttachment('preuve');
        
        // 2. On prépare le formulaire pour les textes
        const modalId = `reportBug-${interaction.id}`;
        const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle('Signalement de Bug');

        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel("Titre du Bug")
            .setPlaceholder("Ex: La commande /ban ne marche pas")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel("Description & Étapes")
            .setPlaceholder("Explique le problème et comment le reproduire...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // Champ pour lien image (si pas d'upload)
        const linkInput = new TextInputBuilder()
            .setCustomId('link')
            .setLabel("Lien image (si pas uploadé)")
            .setPlaceholder("https://...")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(linkInput)
        );

        // 3. On affiche le formulaire
        await interaction.showModal(modal);

        // 4. On attend la validation (Filter assure que c'est le bon user/modal)
        const filter = (i) => i.customId === modalId;
        
        try {
            const submitted = await interaction.awaitModalSubmit({ filter, time: 600_000 }); // 10 minutes max pour écrire

            // --- Récupération des données ---
            const title = submitted.fields.getTextInputValue('title');
            const description = submitted.fields.getTextInputValue('description');
            const linkText = submitted.fields.getTextInputValue('link');

            // --- Vérification du salon de report ---
            const reportChannel = interaction.client.channels.cache.get(config.REPORT_CHANNEL_ID);
            if (!reportChannel) {
                return submitted.reply({ 
                    embeds: [embeds.error(submitted, 'Erreur Config', 'Le salon de réception des bugs est mal configuré.')],
                    ephemeral: true 
                });
            }

            // --- Construction de l'Embed Staff ---
            const reportEmbed = embeds.warning(submitted, `🐛 ${title}`, description)
                .addFields(
                    { name: '👤 Rapporteur', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                    { name: '🌐 Serveur', value: `${interaction.guild.name}`, inline: true }
                )
                .setTimestamp();

            // Gestion intelligente de l'image (Priorité : Fichier > Lien Formulaire)
            if (attachment) {
                reportEmbed.setImage(attachment.url);
                reportEmbed.setFooter({ text: 'Image provenant de l\'upload fichier' });
            } else if (linkText && linkText.startsWith('http')) {
                reportEmbed.setImage(linkText);
                reportEmbed.setFooter({ text: 'Image provenant du lien fourni' });
            }

            // --- Envoi ---
            await reportChannel.send({ embeds: [reportEmbed] });

            // Confirmation à l'utilisateur
            await submitted.reply({ 
                embeds: [embeds.success(submitted, 'Rapport Envoyé', 'Merci ! Ton signalement a été transmis au développeur avec succès.')],
                ephemeral: true 
            });

        } catch (error) {
            // Si le temps est écoulé ou autre erreur
            if (error.code !== 'InteractionCollectorError') console.error(error);
        }
    }
};