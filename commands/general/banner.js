const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

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
            // --- 1. FETCH OBLIGATOIRE ---
            // On force le fetch pour récupérer la bannière (sinon elle est souvent null)
            const user = await targetUser.fetch();
            
            // size: 4096 pour la HD
            const bannerURL = user.bannerURL({ size: 4096, dynamic: true });

            // Si pas de bannière
            if (!bannerURL) {
                return replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, "Pas de bannière", `L'utilisateur **${user.tag}** n'a pas configuré de bannière ou c'est une couleur unie.`)],
                    ephemeral: true 
                });
            }

            // --- 2. COULEUR DU ROLE ---
            let embedColor = user.accentColor || 0x2B2D31; // Couleur de profil ou Gris
            
            // On essaie de récupérer le membre pour avoir la couleur du rôle sur ce serveur
            if (interactionOrMessage.guild) {
                try {
                    const member = await interactionOrMessage.guild.members.fetch(user.id);
                    if (member && member.displayColor) embedColor = member.displayColor;
                } catch (e) {
                    // Si le membre n'est pas trouvé (ex: fetch d'un ID externe), on garde l'accentColor
                }
            }

            // --- 3. EMBED ---
            const embed = embeds.info(interactionOrMessage, `Bannière de ${user.username}`, `🎨 [Clique ici pour télécharger l'image](${bannerURL})`)
                .setImage(bannerURL)
                .setColor(embedColor);

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
                embeds: [embeds.error(interactionOrMessage, "Erreur Système", "Impossible de récupérer la bannière.")],
                ephemeral: true
            });
        }
    }
};