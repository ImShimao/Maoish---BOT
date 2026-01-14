const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dig')
        .setDescription('Creuser le sol avec une pelle (1m30 de recharge)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        const userData = await eco.get(user.id);
        const now = Date.now();

        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc(`🔒 **Tu es en PRISON !** Le sol de la cellule est en béton armé.\nLibération dans : **${timeLeft} minutes**.`);
        }

        // --- 2. VÉRIFICATION COOLDOWN ---
        // On s'assure que l'objet cooldowns existe
        if (!userData.cooldowns) userData.cooldowns = {};
        if (!userData.cooldowns.dig) userData.cooldowns.dig = 0;

        if (userData.cooldowns.dig > now) {
            const timeLeft = Math.ceil((userData.cooldowns.dig - now) / 1000);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            const waitPhrases = [
                "Tu as mal au dos, repose-toi un peu.",
                "La pelle fume, laisse-la refroidir.",
                "Tu vas finir par atteindre la Chine, calme-toi.",
                "Creuser c'est fatiguant.",
                "Il n'y a plus de trous disponibles pour l'instant."
            ];
            const randomWait = waitPhrases[Math.floor(Math.random() * waitPhrases.length)];
            
            return replyFunc(`⏳ **${randomWait}**\nReviens dans **${minutes}m ${seconds}s**.`);
        }

        // --- 3. VÉRIFICATION DE L'OUTIL ---
        if (!await eco.hasItem(user.id, 'shovel')) {
            return replyFunc("❌ **Tu vas creuser avec tes mains ?**\nAchète une `💩 Pelle` au `/shop` !");
        }

        // --- 4. ANTI-SPAM (Application immédiate) ---
        // On applique le cooldown de 1m30 (90000ms) maintenant pour bloquer le spam
        const cooldownAmount = 1.5 * 60 * 1000;
        userData.cooldowns.dig = now + cooldownAmount;
        await userData.save();

        // --- 5. LOGIQUE DE LOOT ---
        const rand = Math.random();
        let itemId = '';
        let phrase = '';
        let color = config.COLORS.ECONOMY || 0x2F3136;

        // === TABLE DE BUTIN ===

        // 1. ÉCHEC / RIEN (25%)
        if (rand < 0.25) { 
            const fails = [
                "Tu as trouvé... de la terre. Juste de la terre.",
                "Tu as tapé dans une racine, aïe ton poignet !",
                "Un vieux chewing-gum collé. Beurk.",
                "Rien du tout, le vide intersidéral.",
                "Tu as failli déterrer une mine antipersonnel (ouf !).",
                "Juste des cailloux sans valeur.",
                "Une canette de soda vide.",
                "Tu as trouvé un câble électrique (ne touche pas !)."
            ];
            // Le cooldown est déjà sauvegardé plus haut, donc c'est bon
            return replyFunc(`🍂 **Bof...** ${fails[Math.floor(Math.random() * fails.length)]}`);
        }
        
        // 2. COMMUN : Ver de terre / Patate (30%)
        else if (rand < 0.55) { 
            if (Math.random() > 0.5) {
                itemId = 'worm';
                const texts = ["Beurk ! Ça gigote !", "Un appât pour la pêche ?", "C'est gluant...", "Un ami pour la vie !"];
                phrase = `🪱 **Un Ver de Terre !** ${texts[Math.floor(Math.random() * texts.length)]}`;
            } else {
                itemId = 'potato';
                const texts = ["On fait des frites ?", "Une patate oubliée.", "C'est bio au moins.", "La raclette est pour bientôt."];
                phrase = `🥔 **Une Patate !** ${texts[Math.floor(Math.random() * texts.length)]}`;
            }
        }

        // 3. PEU COMMUN : Os / Déchet (15%)
        else if (rand < 0.70) { 
            if (Math.random() > 0.5) {
                itemId = 'trash'; 
                phrase = "🥾 **Une vieille botte !** Ça sent le fromage...";
            } else {
                itemId = 'bone'; 
                const texts = ["Un reste de poulet ?", "J'espère que c'est pas humain...", "Un chien l'avait caché là.", "Ça fera un bouillon."];
                phrase = `🦴 **Un Ossement !** ${texts[Math.floor(Math.random() * texts.length)]}`; 
            }
        }

        // 4. RARE : Pièce / Capsule (15%)
        else if (rand < 0.85) { 
            if (Math.random() > 0.5) {
                itemId = 'old_coin'; 
                phrase = "🪙 **Une Pièce Antique !** Ça date de l'Empire Romain ça !";
                color = 0xF1C40F; // Jaune
            } else {
                itemId = 'capsule'; 
                phrase = "⏳ **Une Capsule Temporelle !** Des souvenirs d'une autre époque...";
                color = 0x9B59B6; // Violet
            }
        }

        // 5. ÉPIQUE : Crâne / Coffre (10%)
        else if (rand < 0.95) { 
            if (Math.random() > 0.5) {
                itemId = 'skull'; 
                phrase = "💀 **Un Crâne Humain !** Appelez la police... ou vendez-le.";
                color = 0xE74C3C; // Rouge
            } else {
                itemId = 'treasure'; 
                phrase = "👑 **JACKPOT !** Ta pelle a heurté un **COFFRE AU TRÉSOR** !";
                color = 0xF1C40F; // Or
            }
        }

        // 6. LÉGENDAIRE : Fossile / Sarcophage (5%)
        else { 
            if (Math.random() > 0.3) { 
                itemId = 'fossil'; 
                phrase = "🦖 **INCROYABLE !** Tu as trouvé un **FOSSILE DE DINOSAURE** intact !!!";
                color = 0xE74C3C; 
            } else {
                itemId = 'sarcophagus'; // Le truc ultime
                phrase = "⚰️ **HISTORIQUE !** Tu viens de déterrer un **SARCOPHAGE PHARAONIQUE** ! Tu es riche !";
                color = 0x2ECC71; // Vert ultra rare
            }
        }

        // --- 6. ATTRIBUTION ---
        await eco.addItem(user.id, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('💩 Fouilles Archéologiques')
            .setDescription(`${phrase}\n\nTu as récupéré : **${itemInfo.name}**\n💰 Valeur estimée : **${itemInfo.sellPrice} €**`)
            .setFooter({ text: config.FOOTER_TEXT || 'Maoish Economy' });

        replyFunc({ embeds: [embed] });
    }
};