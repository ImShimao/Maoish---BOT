const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Affiche depuis quand le bot est en ligne'),

    async execute(interactionOrMessage) {
        // --- GESTION HYBRIDE ---
        const replyFunc = (payload) => {
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(payload);
            return interactionOrMessage.channel.send(payload);
        };

        // --- CALCULS ---
        const totalSeconds = (interactionOrMessage.client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = Math.floor(totalSeconds % 60);

        const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;

        // --- EMBED VIA USINE ---
        // On utilise embeds.info mais on override la couleur pour le vert Matrix
        const embed = embeds.info(interactionOrMessage, '⚡ Statut Système', null)
            .setColor(0x00FF00)
            .addFields(
                { name: '⏱️ En ligne depuis', value: `\`${uptimeString}\``, inline: true },
                { name: '💾 Mémoire', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
                { name: '📡 Latence API', value: `\`${Math.round(interactionOrMessage.client.ws.ping)}ms\``, inline: true }
            );

        await replyFunc({ embeds: [embed] });
    }
};