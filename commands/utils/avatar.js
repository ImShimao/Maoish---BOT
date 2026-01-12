const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Affiche l\'avatar d\'un membre en HD')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(false)),

    async execute(interaction, args) {
        let targetUser;

        if (interaction.isCommand?.()) {
            targetUser = interaction.options.getUser('membre') || interaction.user;
        } else {
            const mention = interaction.mentions.users.first();
            targetUser = mention || interaction.author;
        }

        const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Avatar de ${targetUser.username}`)
            .setImage(avatarURL);

        // Petit bouton pour ouvrir l'image dans le navigateur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ouvrir dans le navigateur')
                    .setStyle(ButtonStyle.Link)
                    .setURL(avatarURL)
            );

        if (interaction.isCommand?.()) await interaction.reply({ embeds: [embed], components: [row] });
        else await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};