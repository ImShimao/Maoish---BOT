const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pileouface')
        .setDescription('Lance une pièce (Juste pour le fun, sans argent)'),

    async execute(interactionOrMessage) {
        let replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.deferReply(); 
            replyFunc = async (payload) => await interactionOrMessage.editReply(payload);
        } else {
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // 1. Suspense
        const suspenseEmbed = new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle('🪙 La pièce tourne...')
            .setDescription('*Ting... Ting... Ting...*');

        const msg = await replyFunc({ embeds: [suspenseEmbed] });

        // 2. Résultat
        const result = Math.random() < 0.5 ? 'Pile' : 'Face';
        const imageName = result === 'Pile' ? 'pile.png' : 'face.png';
        
        // C'est ICI la magie : on construit le chemin correct
        const imagePath = path.join(__dirname, '..', '..', 'img', imageName);
        const file = new AttachmentBuilder(imagePath);

        setTimeout(async () => {
            const finalEmbed = new EmbedBuilder()
                .setColor(result === 'Pile' ? 0x0099FF : 0xFFD700)
                .setTitle(`C'est... **${result.toUpperCase()}** !`)
                .setImage('attachment://' + imageName); // On référence le fichier attaché

            const payload = { embeds: [finalEmbed], files: [file] };

            if (interactionOrMessage.isCommand?.()) await interactionOrMessage.editReply(payload);
            else await msg.edit(payload);
        }, 2000);
    }
};