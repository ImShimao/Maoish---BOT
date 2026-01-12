const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ui = require('../../utils/embeds.js'); // Pour garder tes embeds consistants

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Affiche l\'avatar d\'un membre en HD')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let targetUser;

        // 1. Détection du type (Slash ou Message)
        if (interactionOrMessage.isCommand?.()) {
            targetUser = interactionOrMessage.options.getUser('membre') || interactionOrMessage.user;
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            targetUser = mention || interactionOrMessage.author;
        }

        // 2. Récupération de l'URL en HD (4096 est le max autorisé par Discord)
        const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });

        // 3. Création de l'embed via ton template
        const embed = ui.template(
            `Avatar de ${targetUser.username}`,
            `🎨 [Lien de l'image](${avatarURL})`,
            'MAIN'
        ).setImage(avatarURL);

        // 4. Bouton pour ouvrir dans le navigateur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ouvrir en HD')
                    .setStyle(ButtonStyle.Link)
                    .setURL(avatarURL)
            );

        // 5. Envoi de la réponse
        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.reply({ embeds: [embed], components: [row] });
        } else {
            await interactionOrMessage.channel.send({ embeds: [embed], components: [row] });
        }
    }
};