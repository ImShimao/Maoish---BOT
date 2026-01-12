const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Affiche depuis quand le bot est en ligne'),

    async execute(interactionOrMessage) {
        const totalSeconds = (interactionOrMessage.client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = Math.floor(totalSeconds % 60);

        const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;

        const embed = new EmbedBuilder()
            .setColor(0x00FF00) // Vert Matrix
            .setTitle('⚡ Statut Système')
            .addFields(
                { name: '⏱️ En ligne depuis', value: `\`${uptimeString}\``, inline: true },
                { name: '💾 Mémoire', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
                { name: '📡 Latence API', value: `\`${Math.round(interactionOrMessage.client.ws.ping)}ms\``, inline: true }
            )
            .setFooter({ text: 'Maoish • Monitoring' });

        if (interactionOrMessage.isCommand?.()) await interactionOrMessage.reply({ embeds: [embed] });
        else await interactionOrMessage.channel.send({ embeds: [embed] });
    }
};