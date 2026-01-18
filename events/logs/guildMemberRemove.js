const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // 1. Config DB
        const guildData = await Guild.findOne({ guildId: member.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.members) return;

        const logChannel = member.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // 2. Récupération des rôles (Sauf @everyone)
        const roles = member.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => r.name)
            .join(', ');

        // 3. Embed
        const embed = new EmbedBuilder()
            .setTitle('😢 Départ')
            .setColor(0xE74C3C) // Rouge
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`${member.user.tag} a quitté le serveur.`)
            .addFields(
                { name: '👤 Pseudo', value: `${member.user.tag}`, inline: true },
                { name: '🆔 ID', value: `${member.id}`, inline: true },
                { name: '📜 Rôles possédés', value: roles.length > 0 ? roles : 'Aucun', inline: false }
            )
            .setFooter({ text: `Nous sommes maintenant ${member.guild.memberCount} membres` })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};