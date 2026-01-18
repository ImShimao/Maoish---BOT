const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildBanAdd,
    async execute(ban) {
        const guildData = await Guild.findOne({ guildId: ban.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.mod) return;

        const logChannel = ban.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // On cherche qui a banni
        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
        const banLog = fetchedLogs.entries.first();
        const executor = banLog ? banLog.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('🔨 Membre Banni')
            .setColor(0x000000) // Noir/Très sombre
            .setThumbnail(ban.user.displayAvatarURL())
            .addFields(
                { name: '👤 Utilisateur', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                { name: '👮 Modérateur', value: executor ? `${executor.tag}` : 'Inconnu', inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};