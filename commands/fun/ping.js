const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Affiche la latence du bot et de l\'API'),

    async execute(interactionOrMessage) {
        const client = interactionOrMessage.client;
        let sent;

        // --- 1. ENVOI DU MESSAGE INITIAL (POUR CALCULER LE TEMPS) ---
        // On envoie un message temporaire "Calcul..."
        if (interactionOrMessage.isCommand?.()) {
            // fetchReply: true est OBLIGATOIRE pour récupérer l'objet message et son timestamp
            sent = await interactionOrMessage.reply({ content: '🏓 Calcul en cours...', fetchReply: true });
        } else {
            sent = await interactionOrMessage.channel.send('🏓 Calcul en cours...');
        }

        // --- 2. CALCULS ---
        const timeDiff = sent.createdTimestamp - interactionOrMessage.createdTimestamp; // Latence aller-retour
        const apiPing = Math.round(client.ws.ping); // Latence API Discord

        // --- 3. COULEUR DYNAMIQUE ---
        let color = 0x2ECC71; // Vert (Excellent)
        let status = "Excellente";

        if (apiPing > 200) {
            color = 0xF1C40F; // Jaune (Moyen)
            status = "Moyenne";
        }
        if (apiPing > 500) {
            color = 0xE74C3C; // Rouge (Lent)
            status = "Instable";
        }

        // --- 4. CRÉATION DE L'EMBED ---
        // On utilise embeds.info comme base, puis on personnalise
        const embed = embeds.info(interactionOrMessage, '🏓 Pong !', `Connexion : **${status}**`)
            .setColor(color)
            .addFields(
                { name: '🤖 Latence Bot', value: `\`${timeDiff}ms\``, inline: true },
                { name: '🌐 Latence API', value: `\`${apiPing}ms\``, inline: true }
            );

        // --- 5. MODIFICATION DU MESSAGE ---
        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.editReply({ content: null, embeds: [embed] });
        } else {
            await sent.edit({ content: null, embeds: [embed] });
        }
    }
};