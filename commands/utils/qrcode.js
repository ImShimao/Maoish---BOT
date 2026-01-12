const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrcode')
        .setDescription('Génère un QR Code à partir d\'un texte ou lien')
        .addStringOption(option => 
            option.setName('texte')
                .setDescription('Le lien ou le texte à transformer')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let text;

        if (interactionOrMessage.isCommand?.()) {
            text = interactionOrMessage.options.getString('texte');
        } else {
            if (!args || args.length === 0) return interactionOrMessage.reply("❌ Il me faut du texte ! Ex: `+qrcode https://google.com`");
            text = args.join(' ');
        }

        // On utilise une API publique fiable pour générer l'image
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`;

        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF) // Blanc
            .setTitle('📱 Voici ton QR Code')
            .setDescription(`Contenu : \`${text}\``)
            .setImage(qrApiUrl)
            .setFooter({ text: 'Maoish • Scan me' });

        if (interactionOrMessage.isCommand?.()) await interactionOrMessage.reply({ embeds: [embed] });
        else await interactionOrMessage.channel.send({ embeds: [embed] });
    }
};