const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pileouface')
        .setDescription('Lance une pièce (Juste pour le fun, sans argent)'),

    async execute(interactionOrMessage) {
        let replyFunc, user;

        // --- GESTION HYBRIDE ---
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
            
            // On utilise l'embed d'erreur standard
            const errorEmbed = embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas le droit de t'amuser.\nLibération dans : **${timeLeft} minutes**.`);
            return replyFunc({ embeds: [errorEmbed] });
        }

        // 1. Suspense (Embed Jaune via embeds.warning)
        const suspenseEmbed = embeds.warning(interactionOrMessage, '🪙 La pièce tourne...', '*Ting... Ting... Ting...*')
            .setColor(0xFFFF00); // Jaune pur

        const msg = await replyFunc({ embeds: [suspenseEmbed] });

        // 2. Résultat
        const result = Math.random() < 0.5 ? 'Pile' : 'Face';
        const imageName = result === 'Pile' ? 'pile.png' : 'face.png';
        
        // Chemin vers les images (Assure-toi que le dossier 'img' existe bien à la racine du projet !)
        const imagePath = path.join(__dirname, '..', '..', 'img', imageName);
        const file = new AttachmentBuilder(imagePath);

        setTimeout(async () => {
            // Embed de résultat (base success, mais couleur adaptée)
            const finalEmbed = embeds.success(interactionOrMessage, `C'est... **${result.toUpperCase()}** !`, null)
                .setColor(result === 'Pile' ? 0x0099FF : 0xFFD700) // Bleu pour Pile, Or pour Face
                .setImage('attachment://' + imageName); 

            const payload = { embeds: [finalEmbed], files: [file] };

            if (interactionOrMessage.isCommand?.()) {
                await interactionOrMessage.editReply(payload);
            } else {
                await msg.edit(payload);
            }
        }, 2000);
    }
};