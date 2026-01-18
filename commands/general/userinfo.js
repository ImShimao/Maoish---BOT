const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Affiche le profil d\'un utilisateur')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre à analyser')
                .setRequired(false)),

    async execute(interactionOrMessage) {
        const { guild } = interactionOrMessage;

        const replyFunc = async (payload) => {
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.reply(payload);
            return await interactionOrMessage.channel.send(payload);
        };

        // --- CIBLE ---
        let targetUser;
        if (interactionOrMessage.isCommand?.()) {
            targetUser = interactionOrMessage.options.getUser('membre') || interactionOrMessage.user;
        } else {
            targetUser = interactionOrMessage.mentions?.users.first() || interactionOrMessage.author;
        }

        // Fetch user & member
        try { targetUser = await targetUser.fetch(); } catch (e) {}
        let member = null;
        if (guild) {
            try { member = await guild.members.fetch(targetUser.id); } catch (e) {}
        }

        // --- DATES ---
        const createdTs = Math.floor(targetUser.createdTimestamp / 1000);
        const joinedTs = member ? Math.floor(member.joinedTimestamp / 1000) : null;

        // --- RÔLES ---
        let rolesDisplay = "Aucun";
        if (member) {
            const roles = member.roles.cache
                .filter(r => r.name !== '@everyone')
                .sort((a, b) => b.position - a.position);
            
            if (roles.size > 0) {
                // On affiche juste les 3-4 plus importants pour faire "pro" et pas une liste géante
                const topRoles = roles.first(5).map(r => r).join(' ');
                rolesDisplay = roles.size > 5 ? `${topRoles} (+${roles.size - 5})` : topRoles;
            }
        }

        // --- EMBED ---
        const embed = embeds.info(interactionOrMessage, null, null)
            .setAuthor({ name: `Profil de ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setColor(member?.displayHexColor !== '#000000' ? member.displayHexColor : 0x2B2D31)
            .addFields(
                { 
                    name: '👤 Identité', 
                    value: `**Mention :** <@${targetUser.id}>\n**ID :** \`${targetUser.id}\``, 
                    inline: true 
                },
                { 
                    name: '📅 Compte Discord', 
                    value: `<t:${createdTs}:D>\n(<t:${createdTs}:R>)`, 
                    inline: true 
                },
                // Ligne vide pour aérer si besoin, ou on passe direct à la suite
                { 
                    name: '📥 Arrivée Serveur', 
                    value: joinedTs ? `<t:${joinedTs}:D>\n(<t:${joinedTs}:R>)` : 'Non membre', 
                    inline: true 
                },
                { 
                    name: '🎭 Rôles Principaux', 
                    value: rolesDisplay, 
                    inline: false 
                }
            );

        if (targetUser.bannerURL()) {
            embed.setImage(targetUser.bannerURL({ dynamic: true, size: 1024 }));
        }

        await replyFunc({ embeds: [embed] });
    }
};