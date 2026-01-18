const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildBanRemove,
    async execute(ban) {
        const guildData = await Guild.findOne({ guildId: ban.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.mod) return;

        const logChannel = ban.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
        const banLog = fetchedLogs.entries.first();
        const executor = banLog ? banLog.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('🔓 Membre Débanni')
            .setColor(0x2ECC71) // Vert
            .addFields(
                { name: '👤 Utilisateur', value: `${ban.user.tag}`, inline: true },
                { name: '👮 Modérateur', value: executor ? `${executor.tag}` : 'Inconnu', inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};