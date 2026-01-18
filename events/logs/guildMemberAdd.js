const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const moment = require('moment'); // Si tu ne l'as pas, utilise Date.now() ou installe-le (npm i moment)

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // 1. Config DB
        const guildData = await Guild.findOne({ guildId: member.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.members) return;

        const logChannel = member.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // 2. Calcul âge du compte
        const createdAt = Math.floor(member.user.createdTimestamp / 1000);
        
        // 3. Embed
        const embed = new EmbedBuilder()
            .setTitle('👋 Nouveau Membre')
            .setColor(0x2ECC71) // Vert
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`${member} a rejoint le serveur.`)
            .addFields(
                { name: '👤 Pseudo', value: `${member.user.tag}`, inline: true },
                { name: '🆔 ID', value: `${member.id}`, inline: true },
                { name: '📅 Compte créé', value: `<t:${createdAt}:R>`, inline: false } // Affiche "il y a X jours"
            )
            .setFooter({ text: `Nous sommes maintenant ${member.guild.memberCount} membres` })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};