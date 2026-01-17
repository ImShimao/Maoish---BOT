const { SlashCommandBuilder, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Affiche les informations détaillées et esthétiques du serveur')
        .setDMPermission(false), // Désactive la commande en MP

    async execute(interactionOrMessage) {
        // --- 1. INITIALISATION ---
        const guild = interactionOrMessage.guild;
        
        if (!guild) return; // Sécurité si lancé en MP malgré tout

        // Fonction de réponse hybride
        const replyFunc = async (payload) => {
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.reply(payload);
            return await interactionOrMessage.channel.send(payload);
        };

        // --- 2. RÉCUPÉRATION ET CALCULS ---
        // On essaie de fetch tout le monde pour des stats précises (peut être long sur les gros serveurs)
        try { await guild.members.fetch(); } catch (e) {}
        
        const owner = await guild.fetchOwner();

        // Stats Membres
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = totalMembers - botCount;

        // Stats Présences (Requiert l'intent GUILD_PRESENCES dans le portail dev)
        // Si l'intent est manquant, le cache sera vide
        const onlineCount = guild.presences?.cache.filter(p => p.status !== 'offline').size;
        const onlineDisplay = onlineCount !== undefined ? `🟢 En ligne : **${onlineCount}**` : `🟢 En ligne : **N/A**`;

        // Stats Salons
        const channels = guild.channels.cache;
        const textC = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceC = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const stageC = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
        const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;

        // Dates & Sécurité
        const createdTimestamp = Math.floor(guild.createdTimestamp / 1000); 
        const verifLevel = {
            0: 'Aucune', 1: 'Faible', 2: 'Moyenne', 3: 'Élevée', 4: 'Extrême'
        }[guild.verificationLevel];

        // --- 3. CONSTRUCTION DE L'EMBED VIA L'USINE ---
        const embed = embeds.info(interactionOrMessage, `Informations sur ${guild.name}`, null)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setColor(0x2B2D31) // Gris "Discord Dark"
            .addFields(
                // 👑 EN-TÊTE
                { 
                    name: '👑 Propriétaire', 
                    value: `**${owner.user.tag}**\n\`${owner.id}\``, 
                    inline: true 
                },
                { 
                    name: '📅 Création', 
                    value: `<t:${createdTimestamp}:D>\n(<t:${createdTimestamp}:R>)`, 
                    inline: true 
                },
                { 
                    name: '🛡️ Sécurité', 
                    value: `Niveau : **${verifLevel}**\nLangue : \`${guild.preferredLocale}\``, 
                    inline: true 
                },
                
                // SEPARATEUR VIDE
                { name: '\u200b', value: '\u200b', inline: false },

                // 👥 POPULATION
                { 
                    name: `👥 Membres [${totalMembers}]`, 
                    value: `👤 Humains : **${humanCount}**\n🤖 Bots : **${botCount}**\n${onlineDisplay}`, 
                    inline: true 
                },

                // 📊 INFRASTRUCTURE
                { 
                    name: `📊 Salons [${channels.size}]`, 
                    value: `📝 Textuels : **${textC}**\n🔊 Vocaux : **${voiceC + stageC}**\n📂 Catégories : **${categories}**`, 
                    inline: true 
                },

                // 💎 NITRO & STUFF
                { 
                    name: '💎 Boosts & Rôles', 
                    value: `🚀 Niveau **${guild.premiumTier}**\n✨ Boosts : **${guild.premiumSubscriptionCount}**\n🎭 Rôles : **${guild.roles.cache.size}**\n😃 Emojis : **${guild.emojis.cache.size}**`, 
                    inline: true 
                }
            );

        // Ajout de la bannière si elle existe
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        // Ajout de l'ID en footer
        embed.setFooter({ text: `ID Serveur : ${guild.id} • ${config.FOOTER_TEXT || 'Maoish'}` });

        // --- 4. ENVOI ---
        await replyFunc({ embeds: [embed] });
    }
};