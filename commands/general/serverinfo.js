const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Affiche les informations du serveur')
        .setDMPermission(false),

    async execute(interactionOrMessage) {
        // --- 1. INITIALISATION ---
        const guild = interactionOrMessage.guild;
        if (!guild) return;

        const replyFunc = async (payload) => {
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.reply(payload);
            return await interactionOrMessage.channel.send(payload);
        };

        // --- 2. RÉCUPÉRATION DES DONNÉES ---
        // Fetch complet pour les stats précises
        try { await guild.members.fetch(); } catch (e) {}
        const owner = await guild.fetchOwner().catch(() => null);

        // Stats
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = totalMembers - botCount;

        // Salons
        const channels = guild.channels.cache;
        const textC = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceC = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        
        // Dates
        const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

        // --- 3. CONSTRUCTION EMBED ---
        const embed = embeds.info(interactionOrMessage, null, null) // Titre null pour le mettre dans l'author
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setColor(0x2B2D31) // Couleur neutre/pro
            .addFields(
                // ℹ️ INFOS GÉNÉRALES
                { 
                    name: 'ℹ️ Informations', 
                    value: `👑 **Propriétaire :** <@${owner?.id}>\n📅 **Création :** <t:${createdTimestamp}:D> (<t:${createdTimestamp}:R>)`, 
                    inline: false 
                },
                
                // 👥 STATISTIQUES (Membres & Boosts regroupés)
                { 
                    name: '📊 Statistiques', 
                    value: `👥 **Membres :** ${totalMembers} (👤 ${humanCount} | 🤖 ${botCount})\n💎 **Boosts :** Niveau ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, 
                    inline: false 
                },

                // 📝 SALONS & RÔLES
                { 
                    name: '📂 Infrastructure', 
                    value: `💬 **Salons :** ${textC} Texte | ${voiceC} Vocal\n🎭 **Rôles :** ${guild.roles.cache.size}`, 
                    inline: false 
                }
            )
            .setFooter({ text: `ID: ${guild.id}` });

        // Ajout de la description du serveur si elle existe (Fait très pro)
        if (guild.description) {
            embed.setDescription(`*${guild.description}*`);
        }

        // Ajout bannière
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024, dynamic: true }));
        }

        await replyFunc({ embeds: [embed] });
    }
};