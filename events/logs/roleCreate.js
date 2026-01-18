const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role) {
        const guildData = await Guild.findOne({ guildId: role.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = role.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
        const entry = fetchedLogs.entries.first();
        const executor = entry ? entry.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('👑 Rôle Créé')
            .setColor(0x2ECC71)
            .setDescription(`Le rôle **${role.name}** a été créé.`)
            .addFields({ name: 'Créateur', value: executor ? `${executor.tag}` : 'Inconnu' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};