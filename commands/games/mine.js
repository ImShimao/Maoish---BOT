const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Miner des ressources (1m de recharge)'),

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
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de pioche en cellule.\nLibération dans : **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- 2. VÉRIFICATION COOLDOWN ---
        if (!userData.cooldowns) userData.cooldowns = {};
        if (!userData.cooldowns.mine) userData.cooldowns.mine = 0;
        
        if (userData.cooldowns.mine > now) {
            const timeLeft = Math.ceil((userData.cooldowns.mine - now) / 1000);
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Repos !", `⏳ Tes bras sont fatigués.\nReviens dans **${timeLeft} secondes**.`)], 
                ephemeral: true 
            });
        }

        // --- 3. VÉRIFICATION DE L'OUTIL ---
        // ✅ Ajout de guildId
        if (!await eco.hasItem(user.id, guildId, 'pickaxe')) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "❌ **Impossible de creuser avec tes ongles !**\nAchète une `⛏️ Pioche` au `/shop`.")], 
                ephemeral: true 
            });
        }

        // --- 4. ANTI-SPAM ---
        // On applique le cooldown AVANT le résultat pour éviter le spam
        const cooldownAmount = config.COOLDOWNS.MINE || 60000;
        userData.cooldowns.mine = now + cooldownAmount;
        await userData.save();

        // --- 5. LOGIQUE DE LOOT ---
        const rand = Math.random();
        let itemId = '';
        let message = '';
        let color = config.COLORS.ECONOMY || 0x2F3136;

        // Table de butin
        if (rand < 0.25) { 
            itemId = 'stone'; 
            const texts = ["Juste un caillou.", "De la roche grise.", "Une pierre banale."];
            message = `🪨 ${texts[Math.floor(Math.random() * texts.length)]}`;
            color = 0x95A5A6; // Gris
        }
        else if (rand < 0.50) { 
            itemId = 'coal'; 
            message = `🌑 Un filon de charbon !`;
            color = 0x2C3E50; // Gris foncé
        }
        else if (rand < 0.70) { 
            itemId = 'iron'; 
            message = `🔩 Du minerai de Fer !`;
            color = 0xBDC3C7; // Argenté
        }
        else if (rand < 0.85) { 
            itemId = 'gold'; 
            message = `⚜️ **Une pépite d'OR !**`;
            color = 0xF1C40F; // Or
        }
        else if (rand < 0.93) { 
            itemId = 'ruby'; 
            message = `🔴 **UN RUBIS !**`;
            color = 0xE74C3C; // Rouge
        }
        else if (rand < 0.98) { 
            itemId = 'diamond'; 
            message = `💎 **UN DIAMANT !!**`;
            color = 0x3498DB; // Bleu
        }
        else if (rand < 0.995) { 
            itemId = 'emerald'; 
            message = `🟢 **LÉGENDAIRE ! UNE ÉMERAUDE !**`;
            color = 0x2ECC71; // Vert
        }
        else { 
            // Éboulement (0.5% de chance)
            return replyFunc({
                embeds: [embeds.error(interactionOrMessage, "💥 **Aïe !**", "La galerie s'est effondrée sur toi !\n*(Tu n'as rien récupéré)*")]
            });
        }

        // Sauvegarde Item
        // ✅ Ajout de guildId
        await eco.addItem(user.id, guildId, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // --- XP & STATS ---
        // ✅ Ajout de guildId
        await eco.addStat(user.id, guildId, 'mine'); 
        const xpResult = await eco.addXP(user.id, guildId, 25); 

        // Utilisation de embeds.success avec override de couleur et titre
        const embed = embeds.success(interactionOrMessage, '⛏️ Expédition Minière', 
            `${message}\n\nTu as récupéré : **${itemInfo.name}**\n💰 Valeur : **${itemInfo.sellPrice} €**\n✨ XP : **+25**`
        ).setColor(color);

        // Notification Level Up
        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;
        
        replyFunc({ content: content, embeds: [embed] });
    }
};