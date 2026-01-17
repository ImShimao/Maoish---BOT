const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Affiche depuis quand le bot est en ligne'),

    async execute(interactionOrMessage) {
        const { client } = interactionOrMessage;

        // --- GESTION HYBRIDE ---
        const replyFunc = (payload) => {
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(payload);
            return interactionOrMessage.channel.send(payload);
        };

        // --- CALCULS ---
        const totalSeconds = (client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = Math.floor(totalSeconds % 60);

        const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;
        
        // Timestamp du démarrage (pour affichage dynamique Discord)
        const readyTimestamp = Math.floor(client.readyTimestamp / 1000);

        // --- EMBED VIA USINE ---
        // On utilise embeds.info mais on override la couleur pour le vert "En ligne"
        const embed = embeds.info(interactionOrMessage, '⚡ Statut Système', null)
            .setColor(0x00FF00) // Vert
            .addFields(
                { name: '⏱️ Durée', value: `\`${uptimeString}\``, inline: true },
                { name: '📅 Lancé le', value: `<t:${readyTimestamp}:f> (<t:${readyTimestamp}:R>)`, inline: true },
                { name: '\u200b', value: '\u200b', inline: false }, // Saut de ligne
                { name: '💾 Mémoire', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
                { name: '📡 Latence', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true }
            );

        await replyFunc({ embeds: [embed] });
    }
};