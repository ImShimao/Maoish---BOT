const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        if (!newChannel.guild) return;
        const guildData = await Guild.findOne({ guildId: newChannel.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = newChannel.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // On ignore les changements de position/catégorie pour éviter le spam
        if (oldChannel.rawPosition !== newChannel.rawPosition) return;
        if (oldChannel.parentId !== newChannel.parentId) return;

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0xF1C40F); // Orange

        // 1. Changement de Nom
        if (oldChannel.name !== newChannel.name) {
            embed.setTitle('📝 Salon Renommé')
                .setDescription(`Le salon ${newChannel} a été modifié.`)
                .addFields(
                    { name: 'Avant', value: oldChannel.name, inline: true },
                    { name: 'Après', value: newChannel.name, inline: true }
                );
            
            // Qui a fait ça ?
            const fetchedLogs = await newChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
            const entry = fetchedLogs.entries.first();
            if (entry && Date.now() - entry.createdTimestamp < 5000) {
                embed.setFooter({ text: `Modifié par ${entry.executor.tag}`, iconURL: entry.executor.displayAvatarURL() });
            }

            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
};