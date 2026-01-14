const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const eco = require('../../utils/eco.js'); // Import ajouté

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pileouface')
        .setDescription('Lance une pièce (Juste pour le fun, sans argent)'),

    async execute(interactionOrMessage) {
        let replyFunc, user;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            await interactionOrMessage.deferReply(); 
            replyFunc = async (payload) => await interactionOrMessage.editReply(payload);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // --- SÉCURITÉ PRISON ---
        const userData = await eco.get(user.id);
        if (userData && userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            const msg = `🔒 **Tu es en PRISON !** Pas le droit de t'amuser.\nLibération dans : **${timeLeft} minutes**.`;
            return replyFunc(msg);
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
        
        const imagePath = path.join(__dirname, '..', '..', 'img', imageName);
        const file = new AttachmentBuilder(imagePath);

        setTimeout(async () => {
            const finalEmbed = new EmbedBuilder()
                .setColor(result === 'Pile' ? 0x0099FF : 0xFFD700)
                .setTitle(`C'est... **${result.toUpperCase()}** !`)
                .setImage('attachment://' + imageName); 

            const payload = { embeds: [finalEmbed], files: [file] };

            if (interactionOrMessage.isCommand?.()) await interactionOrMessage.editReply(payload);
            else await msg.edit(payload);
        }, 2000);
    }
};