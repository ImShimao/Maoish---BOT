const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Chasser le gibier (Nécessite un Fusil)'),

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
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas d'armes en cellule.\nLibération dans : **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- 2. COOLDOWN ---
        if (!userData.cooldowns) userData.cooldowns = {};
        if (!userData.cooldowns.hunt) userData.cooldowns.hunt = 0;

        if (userData.cooldowns.hunt > now) {
            const timeLeft = Math.ceil((userData.cooldowns.hunt - now) / 1000);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Chut !", `⏳ Tu vas effrayer le gibier.\nReviens dans **${minutes}m ${seconds}s**.`)], 
                ephemeral: true 
            });
        }

        // --- 3. VÉRIFICATION OUTIL ---
        // ✅ Ajout de guildId
        if (!await eco.hasItem(user.id, guildId, 'rifle')) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "❌ **Tu vas chasser en jetant des cailloux ?**\nAchète un `🔫 Fusil` au `/shop` !")], 
                ephemeral: true 
            });
        }

        // --- 4. ANTI-SPAM ---
        const cooldownAmount = config.COOLDOWNS.HUNT || 600000; // 10 minutes
        userData.cooldowns.hunt = now + cooldownAmount;
        await userData.save();

        // --- 5. LOGIQUE DE CHASSE ---
        const rand = Math.random();
        let itemId = '';
        let phrase = '';
        let color = config.COLORS.ECONOMY || 0x2F3136;

        // ÉCHEC (20%)
        if (rand < 0.20) {
            const fails = ["Tu as tiré... sur un arbre.", "Ton fusil s'est enrayé.", "Rien en vue.", "Tu as éternué et tout le monde s'est enfui."];
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🌲 **Raté !** ${fails[Math.floor(Math.random() * fails.length)]}`)] 
            });
        }
        // COMMUN (40%)
        else if (rand < 0.60) {
            if (Math.random() > 0.5) { itemId = 'meat'; phrase = "🥩 **De la viande !**"; }
            else { itemId = 'rabbit'; phrase = "🐇 **Pan ! Un Lapin !**"; }
        }
        // RARE (25%)
        else if (rand < 0.85) {
            if (Math.random() > 0.5) { itemId = 'duck'; phrase = "🦆 **En plein vol !** Un Canard."; }
            else { itemId = 'boar'; phrase = "🐗 **Un Sanglier !** Belle prise !"; color = 0xE67E22; }
        }
        // ÉPIQUE (10%)
        else if (rand < 0.95) {
            itemId = 'deer_antlers'; 
            phrase = "🦌 **Majestueux !** Tu as abattu un Cerf royal !";
            color = 0x9B59B6;
        }
        // LÉGENDAIRE (5%)
        else {
            itemId = 'bear';
            phrase = "🐻 **INCROYABLE !** Tu as vaincu un **OURS** féroce !";
            color = 0xE74C3C;
        }

        // ✅ Ajout de guildId
        await eco.addItem(user.id, guildId, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // --- XP & STATS ---
        // ✅ Ajout de guildId
        await eco.addStat(user.id, guildId, 'hunts'); 
        const xpResult = await eco.addXP(user.id, guildId, 30); // +30 XP

        // Utilisation de embeds.success mais on override la couleur et le titre
        const embed = embeds.success(interactionOrMessage, '🌲 Partie de Chasse', 
            `${phrase}\n\nTu ramènes : **${itemInfo.name}**\n💰 Valeur : **${itemInfo.sellPrice} €**\n✨ XP : **+30**`
        ).setColor(color);

        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;
        
        replyFunc({ content: content, embeds: [embed] });
    }
};