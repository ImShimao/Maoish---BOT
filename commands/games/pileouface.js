const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pileouface')
        .setDescription('Double ta mise ou perds tout !')
        .addStringOption(option => 
            option.setName('choix')
                .setDescription('Pile ou Face ?')
                .setRequired(true)
                .addChoices({ name: 'Pile', value: 'pile' }, { name: 'Face', value: 'face' }))
        .addIntegerOption(option => 
            option.setName('mise')
                .setDescription('Somme à parier')
                .setMinValue(10)
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let replyFunc, user, choice, amount;
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            choice = interactionOrMessage.options.getString('choix');
            amount = interactionOrMessage.options.getInteger('mise');
            
            // On diffère la réponse car il y a un délai (suspense)
            await interactionOrMessage.deferReply(); 
            replyFunc = async (payload) => await interactionOrMessage.editReply(payload);
        } else {
            user = interactionOrMessage.author;
            // args[0] = choix, args[1] = mise
            if (!args[0] || !args[1]) return interactionOrMessage.channel.send("Usage: `+pf <pile/face> <mise>`");
            
            choice = args[0].toLowerCase();
            amount = parseInt(args[1]);
            
            // Normalisation pour les commandes message
            if (['p', 'pile'].includes(choice)) choice = 'pile';
            else if (['f', 'face'].includes(choice)) choice = 'face';
            
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // --- 1. SÉCURITÉS & PAIEMENT ---
        
        // Validation basique
        if (!['pile', 'face'].includes(choice)) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Choix invalide", "Tu dois choisir **Pile** ou **Face**.")] });
        if (isNaN(amount) || amount < 10) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide", "La mise minimum est de **10 €**.")] });

        const userData = await eco.get(user.id, guildId);
        
        // Vérif Prison
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de jeux d'argent ici.\nLibération dans : **${timeLeft} minutes**.`) ]});
        }

        // Vérif Argent
        if (userData.cash < amount) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Fonds insuffisants", `Tu as seulement **${userData.cash} €** en cash.`)] });

        // On retire la mise immédiatement
        await eco.addCash(user.id, guildId, -amount);

        // --- 2. SUSPENSE ---
        const suspenseEmbed = embeds.warning(interactionOrMessage, '🪙 La pièce tourne...', `Tu as misé **${amount} €** sur **${choice.toUpperCase()}**...\n*Ting... Ting... Ting...*`)
            .setColor(0xFFFF00); // Jaune

        // On envoie le message de suspense
        // Note: Si c'est une commande slash, on edit le deferred, sinon on send un nouveau message
        const msg = await replyFunc({ embeds: [suspenseEmbed] });

        // --- 3. RÉSULTAT ---
        const result = Math.random() < 0.5 ? 'pile' : 'face'; // minuscules pour matcher le choix
        const win = (choice === result);
        
        // Sélection de l'image (Attention : tes fichiers s'appellent pile.png et face.png ? Ou pile.png et face.png (l'image que tu m'as envoyée s'appelle "face.png" ? Vérifie bien les noms))
        // D'après tes uploads : "img/pile.png" et "img/face.png" (supposition, sinon renomme les fichiers)
        const imageName = result === 'pile' ? 'pile.png' : 'face.png'; // J'utilise 'face.png' par défaut si c'est face
        const imagePath = path.join(__dirname, '..', '..', 'img', imageName);
        
        // On prépare le fichier
        let file;
        try {
            file = new AttachmentBuilder(imagePath);
        } catch (e) {
            console.error("Erreur image:", e);
        }

        setTimeout(async () => {
            let finalEmbed;
            
            if (win) {
                const gain = amount * 2;
                await eco.addCash(user.id, guildId, gain);
                
                finalEmbed = embeds.success(interactionOrMessage, `C'est... **${result.toUpperCase()}** !`, 
                    `🎉 **GAGNÉ !**\nLa pièce est tombée du bon côté.\n💰 Tu remportes **${gain} €** !`)
                    .setColor(0x2ECC71); // Vert
            } else {
                // L'argent perdu part à la police (Optionnel)
                await eco.addBank('police_treasury', guildId, amount);
                
                finalEmbed = embeds.error(interactionOrMessage, `C'est... **${result.toUpperCase()}** !`, 
                    `💀 **PERDU...**\nTu avais parié sur ${choice}.\n💸 Tu perds ta mise de **${amount} €**.`)
                    .setColor(0xE74C3C); // Rouge
            }

            // On ajoute l'image si elle existe
            if (file) {
                finalEmbed.setImage('attachment://' + imageName);
            }

            const payload = { embeds: [finalEmbed], files: file ? [file] : [] };

            // Mise à jour du message
            if (interactionOrMessage.isCommand?.()) {
                await interactionOrMessage.editReply(payload);
            } else {
                // Pour le message classique, on édite le message de suspense
                if (msg.edit) await msg.edit(payload);
            }
        }, 2000); // 2 secondes de délai
    }
};