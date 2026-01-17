const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dig')
        .setDescription('Creuser le sol avec une pelle (2m30 de recharge)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;
        
        // Gestionnaire de réponse amélioré
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { 
                const { ephemeral, ...options } = p; 
                return interactionOrMessage.channel.send(options); 
            };

        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        const now = Date.now();

        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Le sol de la cellule est en béton armé.\nLibération dans : **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- 2. VÉRIFICATION COOLDOWN ---
        if (!userData.cooldowns) userData.cooldowns = {};
        if (!userData.cooldowns.dig) userData.cooldowns.dig = 0;

        if (userData.cooldowns.dig > now) {
            const timeLeft = Math.ceil((userData.cooldowns.dig - now) / 1000);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            const waitPhrases = [
                "Tu as mal au dos, repose-toi un peu.", "La pelle fume, laisse-la refroidir.",
                "Tu vas finir par atteindre la Chine, calme-toi.", "Creuser c'est fatiguant.",
                "Il n'y a plus de trous disponibles pour l'instant."
            ];
            const randomWait = waitPhrases[Math.floor(Math.random() * waitPhrases.length)];
            
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Repos !", `⏳ **${randomWait}**\nReviens dans **${minutes}m ${seconds}s**.`)], 
                ephemeral: true 
            });
        }

        // --- 3. VÉRIFICATION DE L'OUTIL ---
        // ✅ Ajout de guildId
        if (!await eco.hasItem(user.id, guildId, 'shovel')) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "❌ **Tu vas creuser avec tes mains ?**\nAchète une `💩 Pelle` au `/shop` !")], 
                ephemeral: true 
            });
        }

        // --- 4. ANTI-SPAM ---
        const cooldownAmount = config.COOLDOWNS.DIG || 150000; // 2m30
        userData.cooldowns.dig = now + cooldownAmount;
        await userData.save();

        // --- 5. LOGIQUE DE LOOT ---
        const rand = Math.random();
        let itemId = '';
        let phrase = '';
        let color = config.COLORS.ECONOMY || 0x2F3136;

        // 1. ÉCHEC (25%)
        if (rand < 0.25) { 
            const fails = [
                "Tu as trouvé... de la terre. Juste de la terre.", "Tu as tapé dans une racine, aïe ton poignet !",
                "Un vieux chewing-gum collé. Beurk.", "Rien du tout, le vide intersidéral.",
                "Tu as failli déterrer une mine antipersonnel (ouf !).", "Juste des cailloux sans valeur."
            ];
            // Utilisation de embeds.error (gris ou rouge léger) pour un échec sans conséquence grave
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🍂 **Bof...** ${fails[Math.floor(Math.random() * fails.length)]}`)] 
            });
        }
        // 2. COMMUN (30%)
        else if (rand < 0.55) { 
            if (Math.random() > 0.5) { itemId = 'worm'; phrase = "🪱 **Un Ver de Terre !** Ça gigote !"; } 
            else { itemId = 'potato'; phrase = "🥔 **Une Patate !** On fait des frites ?"; }
        }
        // 3. PEU COMMUN (15%)
        else if (rand < 0.70) { 
            if (Math.random() > 0.5) { itemId = 'trash'; phrase = "🥾 **Une vieille botte !** Ça sent le fromage..."; } 
            else { itemId = 'bone'; phrase = "🦴 **Un Ossement !** Un reste de poulet ?"; }
        }
        // 4. RARE (15%)
        else if (rand < 0.85) { 
            if (Math.random() > 0.5) { itemId = 'old_coin'; phrase = "🪙 **Une Pièce Antique !** Ça date de Rome !"; color = 0xF1C40F; } 
            else { itemId = 'capsule'; phrase = "⏳ **Une Capsule Temporelle !**"; color = 0x9B59B6; }
        }
        // 5. ÉPIQUE (10%)
        else if (rand < 0.95) { 
            if (Math.random() > 0.5) { itemId = 'skull'; phrase = "💀 **Un Crâne Humain !** Glauque..."; color = 0xE74C3C; } 
            else { itemId = 'treasure'; phrase = "👑 **JACKPOT !** Un **COFFRE AU TRÉSOR** !"; color = 0xF1C40F; }
        }
        // 6. LÉGENDAIRE (5%)
        else { 
            if (Math.random() > 0.3) { itemId = 'fossil'; phrase = "🦖 **INCROYABLE !** Un **FOSSILE** de dinosaure !"; color = 0xE74C3C; } 
            else { itemId = 'sarcophagus'; phrase = "⚰️ **HISTORIQUE !** Un **SARCOPHAGE** !"; color = 0x2ECC71; }
        }

        // ✅ Ajout de guildId
        await eco.addItem(user.id, guildId, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // --- AJOUTS XP & STATS ---
        // ✅ Ajout de guildId
        await eco.addStat(user.id, guildId, 'digs'); 
        const xpResult = await eco.addXP(user.id, guildId, 25); 

        // Utilisation de embeds.success, mais on override le titre et la couleur selon la rareté
        const embed = embeds.success(interactionOrMessage, '💩 Fouilles Archéologiques', 
            `${phrase}\n\nTu as récupéré : **${itemInfo.name}**\n💰 Valeur estimée : **${itemInfo.sellPrice} €**\n✨ XP : **+25**`
        ).setColor(color);

        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;

        replyFunc({ content: content, embeds: [embed] });
    }
};