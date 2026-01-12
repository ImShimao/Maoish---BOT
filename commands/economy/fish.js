const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Aller à la pêche (Cooldown persistant)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        const userData = await eco.get(user.id);
        const now = Date.now();

        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc(`🔒 Prisonnier ! Encore **${timeLeft} min**.`);
        }

        if (userData.cooldowns.fish > now) {
            const timeLeft = Math.ceil((userData.cooldowns.fish - now) / 1000);
            return replyFunc(`⏳ Patience... Encore **${timeLeft} secondes**.`);
        }

        if (!await eco.hasItem(user.id, 'fishing_rod')) return replyFunc("❌ Achète une **Canne à Pêche** !");

        const roll = Math.floor(Math.random() * 100);
        let itemId = roll < 40 ? 'trash' : roll < 75 ? 'fish' : roll < 95 ? 'trout' : 'shark';

        await eco.addItem(user.id, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        userData.cooldowns.fish = now + config.COOLDOWNS.FISH;
        await userData.save();

        replyFunc(`🎣 **${itemInfo.name}** attrapé ! (Valeur: ${itemInfo.sellPrice} €)`);
    }
};