const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role) {
        const guildData = await Guild.findOne({ guildId: role.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = role.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
        const entry = fetchedLogs.entries.first();
        const executor = entry ? entry.executor : null;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Rôle Supprimé')
            .setColor(0xE74C3C)
            .setDescription(`Le rôle **${role.name}** a été supprimé.`)
            .addFields({ name: 'Modérateur', value: executor ? `${executor.tag}` : 'Inconnu' })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};