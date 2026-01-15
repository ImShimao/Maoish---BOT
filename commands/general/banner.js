const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Affiche la bannière d\'un utilisateur')
        .addUserOption(option => 
            option.setName('cible')
                .setDescription('L\'utilisateur dont vous voulez voir la bannière')
                .setRequired(false)
        ),

    async execute(interactionOrMessage, args) {
        let targetUser, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            targetUser = interactionOrMessage.options.getUser('cible') || interactionOrMessage.user;
            replyFunc = (payload) => interactionOrMessage.reply(payload);
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            targetUser = mention || interactionOrMessage.author;
            
            // On nettoie 'ephemeral' pour les messages classiques
            replyFunc = (payload) => {
                const { ephemeral, ...options } = payload;
                return interactionOrMessage.channel.send(options);
            };
        }

        try {
            // --- FETCH & HD ---
            // On force le fetch pour récupérer la bannière
            const user = await targetUser.fetch();
            // size: 4096 pour la HD, dynamic: true (ou implicite) pour les GIFs
            const bannerURL = user.bannerURL({ size: 4096 });

            // 1. Si pas de bannière
            if (!bannerURL) {
                return replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, "Pas de bannière", `L'utilisateur **${user.tag}** n'a pas configuré de bannière.`)],
                    ephemeral: true 
                });
            }

            // 2. Embed
            const embed = embeds.info(interactionOrMessage, `Bannière de ${user.username}`, `🎨 [Clique ici pour télécharger l'image](${bannerURL})`)
                .setImage(bannerURL)
                .setColor(user.accentColor || 0x2F3136);

            // 3. Bouton
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Ouvrir en HD')
                    .setStyle(ButtonStyle.Link)
                    .setURL(bannerURL)
            );

            await replyFunc({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Erreur Système", "Une erreur est survenue lors de la récupération de la bannière.")],
                ephemeral: true
            });
        }
    }
};