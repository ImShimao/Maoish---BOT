const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        const guildData = await Guild.findOne({ guildId: newMember.guild.id });
        // On vérifie le module "members"
        if (!guildData || !guildData.logs.active || !guildData.logs.members) return;

        const logChannel = newMember.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setTimestamp();

        // A. Changement de Surnom
        if (oldMember.nickname !== newMember.nickname) {
            embed.setTitle('📝 Changement de Surnom')
                .setColor(0xF1C40F) // Jaune
                .addFields(
                    { name: 'Avant', value: oldMember.nickname || 'Aucun', inline: true },
                    { name: 'Après', value: newMember.nickname || 'Aucun', inline: true }
                );
            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        // B. Changement de Rôles
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            // Rôle ajouté ?
            const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            if (added.size > 0) {
                embed.setTitle('➕ Rôle Ajouté').setColor(0x2ECC71)
                    .setDescription(`A reçu le rôle : ${added.map(r => r).join(', ')}`);
                return logChannel.send({ embeds: [embed] }).catch(() => {});
            }

            // Rôle retiré ?
            const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
            if (removed.size > 0) {
                embed.setTitle('➖ Rôle Retiré').setColor(0xE74C3C)
                    .setDescription(`A perdu le rôle : ${removed.map(r => r).join(', ')}`);
                return logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
};