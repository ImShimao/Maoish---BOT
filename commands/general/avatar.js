const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Affiche l\'avatar d\'un membre en HD')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let targetUser, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            targetUser = interactionOrMessage.options.getUser('membre') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            targetUser = mention || interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- RÉCUPÉRATION HD ---
        // size: 4096 donne la qualité maximale.
        // On ne force pas le format (.png) pour laisser les GIFs s'animer s'ils existent.
        const avatarURL = targetUser.displayAvatarURL({ size: 4096 });

        const embed = embeds.info(interactionOrMessage, `Avatar de ${targetUser.username}`, `🎨 [Clique ici pour télécharger l'image](${avatarURL})`)
            .setImage(avatarURL)
            .setColor(targetUser.accentColor || 0x2F3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Ouvrir en HD')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarURL)
        );

        await replyFunc({ embeds: [embed], components: [row] });
    }
};