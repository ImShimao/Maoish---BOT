const { SlashCommandBuilder, version } = require('discord.js');
const embeds = require('../../utils/embeds.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Affiche les statistiques du bot'),

    async execute(interaction) {
        // Calcul de l'uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        
        // Stats Mémoire
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        const embed = embeds.info(interaction, `Statistiques de ${interaction.client.user.username}`, null)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { 
                    name: '🤖 Général', 
                    value: `**Développeur :** Shímáo\n**Discord.js :** v${version}\n**Node.js :** ${process.version}`, 
                    inline: true 
                },
                { 
                    name: '📊 Performance', 
                    value: `**RAM :** ${memoryUsage} MB\n**Ping WS :** ${interaction.client.ws.ping}ms\n**Uptime :** ${days}j ${hours}h ${minutes}m`, 
                    inline: true 
                },
                { 
                    name: '🌍 Présence', 
                    value: `**Serveurs :** ${interaction.client.guilds.cache.size}\n**Utilisateurs :** ${interaction.client.users.cache.size}`, 
                    inline: true 
                }
            );

        await interaction.reply({ embeds: [embed] });
    }
};