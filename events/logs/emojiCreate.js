const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildEmojiCreate,
    async execute(emoji) {
        const guildData = await Guild.findOne({ guildId: emoji.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = emoji.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const fetchedLogs = await emoji.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.EmojiCreate });
        const entry = fetchedLogs.entries.first();
        const creator = entry ? entry.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('😀 Emoji Ajouté')
            .setColor(0x2ECC71)
            .setThumbnail(emoji.url)
            .addFields(
                { name: 'Nom', value: `:${emoji.name}:`, inline: true },
                { name: 'Ajouté par', value: creator ? creator.tag : 'Inconnu', inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};