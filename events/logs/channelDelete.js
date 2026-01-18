const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        if (!channel.guild) return;
        const guildData = await Guild.findOne({ guildId: channel.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = channel.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
        const entry = fetchedLogs.entries.first();
        const executor = (entry && Date.now() - entry.createdTimestamp < 5000) ? entry.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Salon Supprimé')
            .setColor(0xE74C3C)
            .addFields(
                { name: 'Nom', value: channel.name, inline: true },
                { name: 'Modérateur', value: executor ? `${executor.tag}` : 'Inconnu', inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};