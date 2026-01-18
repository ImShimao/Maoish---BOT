const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return; 
        const guildData = await Guild.findOne({ guildId: channel.guild.id });
        // Note : On utilise le nouveau module .server
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = channel.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
        const entry = fetchedLogs.entries.first();
        const creator = (entry && Date.now() - entry.createdTimestamp < 5000) ? entry.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('🏗️ Salon Créé')
            .setColor(0x2ECC71)
            .setDescription(`Le salon ${channel} a été créé.`)
            .addFields({ name: 'Créateur', value: creator ? `${creator.tag}` : 'Inconnu' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};