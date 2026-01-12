const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Braquer un membre')
        .addUserOption(o => o.setName('victime').setDescription('Qui voler ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        const robber = interactionOrMessage.user || interactionOrMessage.author;
        const victimUser = interactionOrMessage.isCommand?.() ? interactionOrMessage.options.getUser('victime') : interactionOrMessage.mentions.users.first();
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        if (!victimUser || victimUser.id === robber.id || victimUser.bot) return replyFunc("❌ Cible invalide.");

        const robberData = await eco.get(robber.id);
        const now = Date.now();

        if (robberData.jailEnd > now) return replyFunc("🔒 Les barreaux t'empêchent de braquer.");

        if (robberData.cooldowns.rob > now) {
            const timeLeft = Math.ceil((robberData.cooldowns.rob - now) / 60000);
            return replyFunc(`🚓 La police te surveille... Attends **${timeLeft} min**.`);
        }

        const victimData = await eco.get(victimUser.id);
        if (victimData.cash < 100) return replyFunc("❌ Cette personne est trop pauvre pour être volée.");
        if (robberData.cash < 500) return replyFunc("❌ Il te faut 500€ sur toi pour payer l'amende au cas où !");

        // Protection Cadenas
        if (await eco.hasItem(victimUser.id, 'lock')) {
            if (Math.random() < 0.5) {
                await eco.removeItem(victimUser.id, 'lock');
                return replyFunc(`🛡️ **ÉCHEC !** Le **Cadenas** de ${victimUser.username} t'a repoussé !`);
            }
        }

        robberData.cooldowns.rob = now + (config.COOLDOWNS.ROB || 3600000);
        const success = Math.random() < (config.PROBS?.ROB_SUCCESS || 0.5);

        if (success) {
            const stolen = Math.floor(victimData.cash * (Math.random() * 0.2 + 0.1));
            await eco.addCash(victimUser.id, -stolen);
            await eco.addCash(robber.id, stolen);
            await robberData.save();

            replyFunc(`🔫 **Braquage réussi !** Tu as volé **${stolen} €** à ${victimUser.username}.`);
        } else {
            const amende = 500;
            await eco.addCash(robber.id, -amende);
            await robberData.save();
            replyFunc(`🚓 **ALERTE !** Tu t'es fait pincer. Amende : **${amende} €**.`);
        }
    }
};