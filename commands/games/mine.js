const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Miner des ressources (1m de recharge)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        
        // Gestionnaire de réponse amélioré
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { 
                const { ephemeral, ...options } = p; 
                return interactionOrMessage.channel.send(options); 
            };

        const userData = await eco.get(user.id);
        const now = Date.now();

        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ 
                content: `🔒 **Tu es en PRISON !** Pas de pioche en cellule.\nLibération dans : **${timeLeft} minutes**.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- 2. VÉRIFICATION COOLDOWN ---
        if (!userData.cooldowns) userData.cooldowns = {};
        
        if (userData.cooldowns.mine > now) {
            const timeLeft = Math.ceil((userData.cooldowns.mine - now) / 1000);
            return replyFunc({ 
                content: `⏳ **Repos !** Tes bras sont fatigués. Reviens dans **${timeLeft} secondes**.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- 3. VÉRIFICATION DE L'OUTIL ---
        if (!await eco.hasItem(user.id, 'pickaxe')) {
            return replyFunc({ 
                content: "❌ **Impossible de creuser avec tes ongles !**\nAchète une `⛏️ Pioche` au `/shop`.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- 4. LOGIQUE DE LOOT ---
        const rand = Math.random();
        let itemId = '';
        let message = '';
        let color = config.COLORS.ECONOMY;

        if (rand < 0.25) { 
            itemId = 'stone'; 
            const texts = ["Juste un caillou.", "De la roche grise.", "Une pierre banale."];
            message = `🪨 ${texts[Math.floor(Math.random() * texts.length)]}`;
        }
        else if (rand < 0.50) { 
            itemId = 'coal'; 
            message = `🌑 Un filon de charbon !`;
        }
        else if (rand < 0.70) { 
            itemId = 'iron'; 
            message = `🔩 Du minerai de Fer !`;
        }
        else if (rand < 0.85) { 
            itemId = 'gold'; 
            message = `⚜️ **Une pépite d'OR !**`;
            color = 0xF1C40F;
        }
        else if (rand < 0.93) { 
            itemId = 'ruby'; 
            message = `🔴 **UN RUBIS !**`;
            color = 0xE74C3C;
        }
        else if (rand < 0.98) { 
            itemId = 'diamond'; 
            message = `💎 **UN DIAMANT !!**`;
            color = 0x3498DB;
        }
        else if (rand < 0.995) { 
            itemId = 'emerald'; 
            message = `🟢 **LÉGENDAIRE ! UNE ÉMERAUDE !**`;
            color = 0x2ECC71;
        }
        else { 
            userData.cooldowns.mine = now + (config.COOLDOWNS.MINE || 60000);
            await userData.save();
            return replyFunc(`💥 **Aïe !** La galerie s'est effondrée !`);
        }

        // --- FIX ICI : On définit itemInfo avant de l'utiliser ---
        const itemInfo = itemsDb.find(i => i.id === itemId);

        await eco.addItem(user.id, itemId);
        await eco.addStat(user.id, 'mine');
        const xpResult = await eco.addXP(user.id, 25);

        userData.cooldowns.mine = now + (config.COOLDOWNS.MINE || 60000);
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('⛏️ Expédition Minière')
            .setDescription(`${message}\n\nTu as récupéré : **${itemInfo.name}**\n💰 Valeur : **${itemInfo.sellPrice} €**\n✨ XP : **+25**`)
            .setFooter({ text: config.FOOTER_TEXT });

        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : "";
        replyFunc({ content: content, embeds: [embed] });
    }
};