const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild) {
        const guildData = await Guild.findOne({ guildId: newGuild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.server) return;

        const logChannel = newGuild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // Changement de Nom
        if (oldGuild.name !== newGuild.name) {
            const fetchedLogs = await newGuild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.GuildUpdate });
            const entry = fetchedLogs.entries.first();
            const executor = entry ? entry.executor : null;

            const embed = new EmbedBuilder()
                .setTitle('🏠 Serveur Modifié')
                .setColor(0x9B59B6) // Violet
                .setDescription(`Le nom du serveur a changé.`)
                .addFields(
                    { name: 'Avant', value: oldGuild.name, inline: true },
                    { name: 'Après', value: newGuild.name, inline: true },
                    { name: 'Modifié par', value: executor ? executor.tag : 'Inconnu', inline: false }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
};