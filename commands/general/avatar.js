const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Affiche l\'avatar d\'un membre en HD')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let targetUser, targetMember, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            targetUser = interactionOrMessage.options.getUser('membre') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            targetUser = mention || interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- RÉCUPÉRATION DU MEMBRE (Pour l'avatar de serveur et la couleur) ---
        // On essaie de récupérer l'objet "Membre" qui contient les infos spécifiques au serveur
        if (interactionOrMessage.guild) {
            try {
                targetMember = await interactionOrMessage.guild.members.fetch(targetUser.id);
            } catch (e) {
                targetMember = null;
            }
        }

        // Si on a le membre, on utilise son avatar de serveur, sinon l'avatar global
        // size: 4096 = Qualité Max
        const avatarURL = (targetMember || targetUser).displayAvatarURL({ size: 4096, dynamic: true });
        
        // Couleur : Celle du rôle du membre, ou gris par défaut
        const embedColor = targetMember ? targetMember.displayColor : 0x2B2D31;

        const embed = embeds.info(interactionOrMessage, `Avatar de ${targetUser.username}`, `🎨 [Clique ici pour télécharger l'image](${avatarURL})`)
            .setImage(avatarURL)
            .setColor(embedColor); // Utilise la couleur du rôle

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Ouvrir en HD')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarURL)
        );

        await replyFunc({ embeds: [embed], components: [row] });
    }
};