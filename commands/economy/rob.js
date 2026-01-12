const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Braquer un membre (Attention à la police !)')
        .addUserOption(o => o.setName('victime').setDescription('Qui veux-tu voler ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let robber, victimUser, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            robber = interactionOrMessage.user;
            victimUser = interactionOrMessage.options.getUser('victime');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            robber = interactionOrMessage.author;
            victimUser = interactionOrMessage.mentions.users.first();
            replyFunc = (p) => interactionOrMessage.channel.send(p);
            if (!victimUser) return replyFunc("❌ Qui veux-tu voler ? Mentionne-le !");
        }

        // --- 1. Vérif Prison (CORRIGÉ) ---
        if (await eco.isJailed(robber.id)) {
            const userData = await eco.get(robber.id);
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }

        if (robber.id === victimUser.id) return replyFunc("❌ Tu ne peux pas te voler toi-même.");
        if (victimUser.bot) return replyFunc("❌ On ne vole pas les robots !");

        // COOLDOWN
        const cooldownTime = 60 * 60 * 1000;
        const lastRob = cooldowns.get(robber.id);
        const now = Date.now();

        if (lastRob && (now - lastRob) < cooldownTime) {
            const minutes = Math.floor((cooldownTime - (now - lastRob)) / 60000);
            return replyFunc(`🚓 **La police te cherche !** Fais-toi discret pendant encore **${minutes} minutes**.`);
        }

        // --- VERIFICATIONS ARGENT (CORRIGÉ AVEC AWAIT) ---
        const victimData = await eco.get(victimUser.id);
        const robberData = await eco.get(robber.id);

        if (victimData.cash < 50) return replyFunc("❌ Cette personne n'a rien sur elle (moins de 50€).");
        if (robberData.cash < 500) return replyFunc("❌ Il te faut au moins **500€** sur toi pour payer l'amende si tu te fais attraper !");

        // --- CADENAS (CORRIGÉ) ---
        if (await eco.hasItem(victimUser.id, 'lock')) {
            const protected = Math.random() < 0.5;
            if (protected) {
                await eco.removeItem(victimUser.id, 'lock');
                return replyFunc(`🛡️ **ÉCHEC !** Le **Cadenas** de ${victimUser.username} t'a empêché de voler !`);
            }
        }

        // ACTION
        const success = Math.random() < 0.5;
        cooldowns.set(robber.id, now);

        if (success) {
            const percent = Math.random() * 0.3 + 0.1;
            const stolen = Math.floor(victimData.cash * percent);

            await eco.addCash(victimUser.id, -stolen);
            await eco.addCash(robber.id, stolen);

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('🔫 Braquage Réussi !')
                .setDescription(`Tu as volé **${stolen} €** à ${victimUser.username} !`)
                .setFooter({ text: 'Vite, dépose ça à la banque !' });
            
            return replyFunc({ embeds: [embed] });

        } else {
            const fine = 500;
            await eco.addCash(robber.id, -fine);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚓 ARRESTATION !')
                .setDescription(`Tu t'es fait attraper par la police !\nTu paies une amende de **${fine} €**.`);

            return replyFunc({ embeds: [embed] });
        }
    }
};