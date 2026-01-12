const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Affiche les stats techniques du serveur'),

    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        // On a besoin de fetch le propriétaire pour avoir son tag
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📊 Stats : ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 Propriétaire', value: `${owner.user}`, inline: true },
                { name: '🌍 Région', value: `${guild.preferredLocale}`, inline: true },
                { name: '👥 Membres', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Création', value: guild.createdAt.toLocaleDateString('fr-FR'), inline: true },
                { name: '🚀 Boosts', value: `Niveau ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
                { name: '🆔 ID Serveur', value: `\`${guild.id}\``, inline: true },
                { name: '📂 Salons', value: `${guild.channels.cache.size}`, inline: true },
                { name: '🎭 Rôles', value: `${guild.roles.cache.size}`, inline: true },
                { name: '😃 Emojis', value: `${guild.emojis.cache.size}`, inline: true }
            )
            .setFooter({ text: 'Maoish • ServerInfo' })
            .setTimestamp();

        if (interactionOrMessage.isCommand?.()) await interactionOrMessage.reply({ embeds: [embed] });
        else await interactionOrMessage.channel.send({ embeds: [embed] });
    }
};