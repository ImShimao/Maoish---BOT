const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
        const guildData = await Guild.findOne({ guildId: newRole.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = newRole.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // Changement de Nom
        if (oldRole.name !== newRole.name) {
            const embed = new EmbedBuilder()
                .setTitle('📝 Rôle Modifié')
                .setColor(0xF1C40F) // Orange
                .setDescription(`Le rôle **${newRole.name}** a été renommé.`)
                .addFields(
                    { name: 'Avant', value: oldRole.name, inline: true },
                    { name: 'Après', value: newRole.name, inline: true }
                )
                .setTimestamp();

            // Qui a fait ça ?
            const fetchedLogs = await newRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
            const entry = fetchedLogs.entries.first();
            if (entry && Date.now() - entry.createdTimestamp < 5000) {
                embed.setFooter({ text: `Modifié par ${entry.executor.tag}`, iconURL: entry.executor.displayAvatarURL() });
            }

            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
};