const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Obtenir le lien pour m\'inviter sur ton serveur'),

    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Inviter le Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/oauth2/authorize?client_id=1459971434368598228&permissions=8&integration_type=0&scope=bot+applications.commands`)
        );

        const embed = embeds.info(
            interaction, 
            '🔗 Invitation', 
            'Clique sur le bouton ci-dessous pour m\'ajouter à ton serveur !'
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};