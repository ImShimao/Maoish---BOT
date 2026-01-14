const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Affiche les informations détaillées du serveur'),

    async execute(interactionOrMessage) {
        // --- 1. INITIALISATION ---
        const guild = interactionOrMessage.guild;
        
        // Fonction de réponse hybride
        const replyFunc = async (payload) => {
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.reply(payload);
            return await interactionOrMessage.channel.send(payload);
        };

        // --- 2. RÉCUPÉRATION DES DONNÉES ---
        // On charge tous les membres pour avoir le compte exact Humains vs Bots
        await guild.members.fetch(); 
        const owner = await guild.fetchOwner();

        // Compteurs Membres
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = totalMembers - botCount;

        // Compteurs Salons
        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;

        // Dates (Format Discord dynamique : timestamp en secondes)
        const createdTimestamp = Math.floor(guild.createdTimestamp / 1000); 

        // --- 3. CONSTRUCTION DE L'EMBED ---
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31) // Gris foncé style Discord moderne (ou mets 0x5865F2 pour du bleu)
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            // Ajoute la bannière en image principale si le serveur en a une
            .setImage(guild.bannerURL({ size: 1024 })) 
            .addFields(
                // --- LIGNE 1 : INFOS GÉNÉRALES ---
                { 
                    name: '👑 Propriétaire', 
                    value: `${owner.user}\n\`${owner.id}\``, 
                    inline: true 
                },
                { 
                    name: '📅 Création', 
                    value: `<t:${createdTimestamp}:D>\n(<t:${createdTimestamp}:R>)`, 
                    inline: true 
                },
                { 
                    name: '🌍 Langue', 
                    value: `\`${guild.preferredLocale}\``, 
                    inline: true 
                },

                // --- LIGNE 2 : MEMBRES ---
                { 
                    name: `👥 Population (${totalMembers})`, 
                    value: `👤 **Humains :** ${humanCount}\n🤖 **Bots :** ${botCount}`, 
                    inline: true 
                },
                
                // --- LIGNE 3 : STATS TECHNIQUES ---
                { 
                    name: '📊 Salons & Rôles', 
                    value: `📝 **Textuels :** ${textChannels}\n🔊 **Vocaux :** ${voiceChannels + stageChannels}\n🎭 **Rôles :** ${guild.roles.cache.size}\n😃 **Emojis :** ${guild.emojis.cache.size}`, 
                    inline: true 
                },
                { 
                    name: '🚀 Boosts', 
                    value: `Niveau **${guild.premiumTier}**\n${guild.premiumSubscriptionCount} boosts`, 
                    inline: true 
                }
            )
            .setFooter({ text: `ID Serveur : ${guild.id}` })
            .setTimestamp();

        // --- 4. ENVOI ---
        await replyFunc({ embeds: [embed] });
    }
};