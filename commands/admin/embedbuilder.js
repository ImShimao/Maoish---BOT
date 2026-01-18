const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedbuilder')
        .setDescription('Créer un embed personnalisé via un formulaire')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Le salon où envoyer l\'embed')
                .setRequired(true)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('salon');

        // Vérification que c'est un salon textuel
        if (!channel.isTextBased()) {
            return interaction.reply({ content: "❌ Je ne peux pas envoyer d'embed dans ce type de salon.", ephemeral: true });
        }

        // --- CRÉATION DU FORMULAIRE (MODAL) ---
        // Astuce : On passe l'ID du salon dans l'ID du modal pour le récupérer après
        const modal = new ModalBuilder()
            .setCustomId(`embedBuilder_${channel.id}`)
            .setTitle('Créateur d\'Embed');

        // 1. Titre
        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel("Titre de l'embed")
            .setStyle(TextInputStyle.Short)
            .setRequired(false); // Facultatif

        // 2. Description (Paragraphe)
        const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // 3. Couleur (Hex)
        const colorInput = new TextInputBuilder()
            .setCustomId('color')
            .setLabel("Couleur (Hex : #FF0000)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#2B2D31')
            .setRequired(false);

        // 4. Footer
        const footerInput = new TextInputBuilder()
            .setCustomId('footer')
            .setLabel("Texte du Footer")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // 5. Image (URL)
        const imageInput = new TextInputBuilder()
            .setCustomId('image')
            .setLabel("Image (URL)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://...')
            .setRequired(false);

        // Ajout des champs au modal (1 champ par ligne d'action)
        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(footerInput),
            new ActionRowBuilder().addComponents(imageInput)
        );

        // Affichage du formulaire
        await interaction.showModal(modal);
    }
};