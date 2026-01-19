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
        .addStringOption(option => // ⚠️ Changé de Integer à String pour accepter "all"
            option.setName('mise')
                .setDescription('Somme à parier (ou "all")')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let replyFunc, user, choice, amountInput;
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            choice = interactionOrMessage.options.getString('choix');
            amountInput = interactionOrMessage.options.getString('mise'); // On récupère du texte
            
            await interactionOrMessage.deferReply(); 
            replyFunc = async (payload) => await interactionOrMessage.editReply(payload);
        } else {
            user = interactionOrMessage.author;
            // args[0] = choix, args[1] = mise
            if (!args[0] || !args[1]) return interactionOrMessage.channel.send("Usage: `+pf <pile/face> <mise>`");
            
            choice = args[0].toLowerCase();
            amountInput = args[1];
            
            // Normalisation pour les commandes message
            if (['p', 'pile'].includes(choice)) choice = 'pile';
            else if (['f', 'face'].includes(choice)) choice = 'face';
            
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // Validation basique du choix
        if (!['pile', 'face'].includes(choice)) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Choix invalide", "Tu dois choisir **Pile** ou **Face**.")] });

        // --- RÉCUPÉRATION DONNÉES ---
        const userData = await eco.get(user.id, guildId);

        // --- GESTION DU ALL-IN / K / M ---
        let amount = 0;
        const cleanInput = amountInput.toLowerCase();

        if (['all', 'tout', 'tapis', 'max'].includes(cleanInput)) {
            amount = userData.cash;
        } else {
            // Supporte "1k" (1000) ou "1m" (1000000)
            if (cleanInput.includes('k')) amount = parseFloat(cleanInput) * 1000;
            else if (cleanInput.includes('m')) amount = parseFloat(cleanInput) * 1000000;
            else amount = parseInt(cleanInput);
        }

        // Arrondir pour éviter les décimales
        amount = Math.floor(amount);

        // --- SÉCURITÉS & PAIEMENT ---
        if (isNaN(amount) || amount < 10) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide", "La mise minimum est de **10 €**.")] });
        
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

        const msg = await replyFunc({ embeds: [suspenseEmbed] });

        // --- 3. RÉSULTAT ---
        const result = Math.random() < 0.5 ? 'pile' : 'face'; 
        const win = (choice === result);
        
        // Images (suppose que les fichiers sont img/pile.png et img/face.png)
        const imageName = result === 'pile' ? 'pile.png' : 'face.png';
        const imagePath = path.join(__dirname, '..', '..', 'img', imageName);
        
        let file;
        try {
            file = new AttachmentBuilder(imagePath);
        } catch (e) {
            console.error("Erreur image (pas grave):", e);
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
                // L'argent perdu part à la police
                await eco.addBank('police_treasury', guildId, amount);
                
                finalEmbed = embeds.error(interactionOrMessage, `C'est... **${result.toUpperCase()}** !`, 
                    `💀 **PERDU...**\nTu avais parié sur ${choice}.\n💸 Tu perds ta mise de **${amount} €**.`)
                    .setColor(0xE74C3C); // Rouge
            }

            if (file) {
                finalEmbed.setImage('attachment://' + imageName);
            }

            const payload = { embeds: [finalEmbed], files: file ? [file] : [] };

            if (interactionOrMessage.isCommand?.()) {
                await interactionOrMessage.editReply(payload);
            } else {
                if (msg.edit) await msg.edit(payload);
            }
        }, 2000); 
    }
};