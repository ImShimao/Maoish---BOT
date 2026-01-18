const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildEmojiDelete,
    async execute(emoji) {
        const guildData = await Guild.findOne({ guildId: emoji.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = emoji.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const fetchedLogs = await emoji.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.EmojiDelete });
        const entry = fetchedLogs.entries.first();
        const executor = entry ? entry.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Emoji Supprimé')
            .setColor(0xE74C3C)
            .setThumbnail(emoji.url)
            .addFields(
                { name: 'Nom', value: `:${emoji.name}:`, inline: true },
                { name: 'Supprimé par', value: executor ? executor.tag : 'Inconnu', inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};