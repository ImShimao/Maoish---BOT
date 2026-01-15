const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrcode')
        .setDescription('Génère un QR Code à partir d\'un texte ou lien')
        .addStringOption(option => 
            option.setName('texte')
                .setDescription('Le lien ou le texte à transformer')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let text, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            text = interactionOrMessage.options.getString('texte');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Pour le message classique (+qrcode)
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Texte manquant", "Il me faut du texte pour créer un QR Code !\nExemple : `+qrcode https://google.com`")] 
                });
            }
            text = args.join(' ');
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // On utilise l'API publique de goqr.me (rapide et fiable)
        // encodeURIComponent est vital pour gérer les espaces et caractères spéciaux
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`;

        // Création de l'embed via l'usine
        const embed = embeds.info(interactionOrMessage, '📱 Voici ton QR Code', `Contenu : \`${text}\``)
            .setImage(qrApiUrl)
            .setColor(0xFFFFFF); // Blanc pour faire "propre" sur un QR Code

        await replyFunc({ embeds: [embed] });
    }
};