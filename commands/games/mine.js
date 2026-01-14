const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Miner des ressources (1m de recharge)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        
        // Gestionnaire de réponse amélioré (Supporte le mode Ephémère hybride)
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { 
                // En mode message classique (!mine), on retire 'ephemeral' pour éviter les erreurs
                const { ephemeral, ...options } = p; 
                return interactionOrMessage.channel.send(options); 
            };

        const userData = await eco.get(user.id);
        const now = Date.now();

        // --- 1. SÉCURITÉ PRISON (Ephémère) ---
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ 
                content: `🔒 **Tu es en PRISON !** Pas de pioche en cellule.\nLibération dans : **${timeLeft} minutes**.`, 
                ephemeral: true 
            });
        }

        // --- 2. VÉRIFICATION COOLDOWN (Ephémère) ---
        if (!userData.cooldowns) userData.cooldowns = {};
        
        if (userData.cooldowns.mine > now) {
            const timeLeft = Math.ceil((userData.cooldowns.mine - now) / 1000);
            return replyFunc({ 
                content: `⏳ **Repos !** Tes bras sont fatigués. Reviens dans **${timeLeft} secondes**.`, 
                ephemeral: true 
            });
        }

        // --- 3. VÉRIFICATION DE L'OUTIL (Ephémère) ---
        if (!await eco.hasItem(user.id, 'pickaxe')) {
            return replyFunc({ 
                content: "❌ **Impossible de creuser avec tes ongles !**\nAchète une `⛏️ Pioche` au `/shop`.", 
                ephemeral: true 
            });
        }

        // --- 4. LOGIQUE DE LOOT ---
        const rand = Math.random();
        let itemId = '';
        let message = '';
        let color = config.COLORS.ECONOMY;

        if (rand < 0.25) { 
            itemId = 'stone'; 
            const texts = ["Juste un caillou.", "De la roche grise.", "Une pierre banale.", "C'est lourd et ça vaut rien."];
            message = `🪨 ${texts[Math.floor(Math.random() * texts.length)]}`;
        }
        else if (rand < 0.50) { 
            itemId = 'coal'; 
            const texts = ["Un filon de charbon !", "De quoi faire un barbecue.", "C'est salissant mais utile.", "Du combustible fossile."];
            message = `🌑 ${texts[Math.floor(Math.random() * texts.length)]}`;
        }
        else if (rand < 0.70) { 
            itemId = 'iron'; 
            const texts = ["Du minerai de Fer !", "Un métal solide.", "On va pouvoir forger des trucs.", "Du fer brut."];
            message = `🔩 ${texts[Math.floor(Math.random() * texts.length)]}`;
        }
        else if (rand < 0.85) { 
            itemId = 'gold'; 
            const texts = ["**Une pépite d'OR !**", "Ça brille !", "On est riche !", "C'est précieux ça."];
            message = `⚜️ ${texts[Math.floor(Math.random() * texts.length)]}`;
            color = 0xF1C40F; // Jaune
        }
        else if (rand < 0.93) { 
            itemId = 'ruby'; 
            const texts = ["**UN RUBIS !**", "Une pierre rouge sang.", "Magnifique gemme.", "Ça vaut une fortune."];
            message = `🔴 ${texts[Math.floor(Math.random() * texts.length)]}`;
            color = 0xE74C3C; // Rouge
        }
        else if (rand < 0.98) { 
            itemId = 'diamond'; 
            const texts = ["💎 **UN DIAMANT !!**", "💎 **JACKPOT !**", "💎 **La plus belle des pierres !**"];
            message = texts[Math.floor(Math.random() * texts.length)];
            color = 0x3498DB; // Bleu cyan
        }
        else if (rand < 0.995) { 
            itemId = 'emerald'; 
            const texts = ["🟢 **LÉGENDAIRE ! UNE ÉMERAUDE !**", "🟢 **C'est vert, c'est rare, c'est cher !**"];
            message = texts[Math.floor(Math.random() * texts.length)];
            color = 0x2ECC71; // Vert
        }
        else { 
            // Échec critique (très rare)
            const fails = ["La galerie s'est effondrée !", "Tu as cassé le manche de ta pioche.", "Tu as eu peur d'une chauve-souris.", "Rien... le vide absolu."];
            
            // Application du cooldown même en cas d'échec critique
            userData.cooldowns.mine = now + (config.COOLDOWNS.MINE || 60000);
            await userData.save();
            
            return replyFunc(`💥 **Aïe !** ${fails[Math.floor(Math.random() * fails.length)]}`);
        }

        await eco.addItem(user.id, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // --- 5. SAUVEGARDE & CONFIRMATION ---
        userData.cooldowns.mine = now + (config.COOLDOWNS.MINE || 60000);
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('⛏️ Expédition Minière')
            .setDescription(`${message}\n\nTu as récupéré : **${itemInfo.name}**\n💰 Valeur : **${itemInfo.sellPrice} €**`)
            .setFooter({ text: config.FOOTER_TEXT || 'Maoish Economy' });

        replyFunc({ embeds: [embed] });
    }
};