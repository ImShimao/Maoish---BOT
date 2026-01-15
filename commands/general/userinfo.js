const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Affiche les infos détaillées d\'un utilisateur')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre à analyser')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let targetUser, member;
        const { guild } = interactionOrMessage;

        // --- GESTION HYBRIDE ---
        // Définition de la fonction de réponse
        const replyFunc = async (payload) => {
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.reply(payload);
            return await interactionOrMessage.channel.send(payload);
        };

        // Récupération de l'utilisateur cible
        if (interactionOrMessage.isCommand?.()) {
            targetUser = interactionOrMessage.options.getUser('membre') || interactionOrMessage.user;
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            targetUser = mention || interactionOrMessage.author;
        }

        // Récupération du Membre (GuildMember) pour avoir les rôles, dates d'arrivée, etc.
        try {
            member = await guild.members.fetch(targetUser.id);
        } catch (e) {
            member = null; // L'utilisateur n'est peut-être plus sur le serveur
        }

        // --- PRÉPARATION DES DONNÉES ---
        
        // 1. Timestamps (Format dynamique Discord <t:TIMESTAMP:STYLE>)
        const createdTs = Math.floor(targetUser.createdTimestamp / 1000);
        const joinedTs = member ? Math.floor(member.joinedTimestamp / 1000) : null;

        // 2. Rôles (Avec protection anti-crash si trop de rôles)
        let rolesDisplay = "Pas de rôles ou non-membre";
        if (member) {
            const roles = member.roles.cache
                .filter(r => r.name !== '@everyone')
                .sort((a, b) => b.position - a.position) // Tri par importance
                .map(r => r);
            
            if (roles.length > 0) {
                if (roles.length > 20) {
                    rolesDisplay = `${roles.slice(0, 20).join(' ')} ... et ${roles.length - 20} autres.`;
                } else {
                    rolesDisplay = roles.join(' ');
                }
            } else {
                rolesDisplay = "Aucun rôle spécifique.";
            }
        }

        // 3. Flags / Badges (Bot, etc.)
        const isBot = targetUser.bot ? '🤖 Oui' : '👤 Non';
        
        // --- CONSTRUCTION DE L'EMBED VIA USINE ---
        // On utilise embeds.info comme base
        const embed = embeds.info(interactionOrMessage, `Profil de ${targetUser.username}`, null)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            // On prend la couleur du rôle le plus haut, ou gris par défaut
            .setColor(member ? member.displayHexColor : 0x2B2D31) 
            .addFields(
                // Identité
                { name: '🆔 Identité', value: `Tag : ${targetUser.tag}\nID : \`${targetUser.id}\`\nBot : ${isBot}`, inline: true },
                
                // Dates
                { 
                    name: '📅 Dates Clés', 
                    value: `**Création :** <t:${createdTs}:D> (<t:${createdTs}:R>)\n**Arrivée :** ${joinedTs ? `<t:${joinedTs}:D> (<t:${joinedTs}:R>)` : 'Non présent'}`, 
                    inline: true 
                },

                // Séparateur
                { name: '\u200b', value: '\u200b', inline: false },

                // Rôles
                { name: `🎭 Rôles [${member ? member.roles.cache.size - 1 : 0}]`, value: rolesDisplay, inline: false }
            );
        
        // Ajout de la bannière si dispo (nécessite un fetch user complet souvent, mais on tente via le cache user)
        if (targetUser.banner) {
            embed.setImage(targetUser.bannerURL({ size: 1024 }));
        }

        await replyFunc({ embeds: [embed] });
    }
};