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

        if (robber.id === victimUser.id) return replyFunc("❌ Tu ne peux pas te voler toi-même (c'est idiot).");
        if (victimUser.bot) return replyFunc("❌ On ne vole pas les robots !");

        // --- COOLDOWN (1 Heure) ---
        const cooldownTime = 60 * 60 * 1000;
        const lastRob = cooldowns.get(robber.id);
        const now = Date.now();

        if (lastRob && (now - lastRob) < cooldownTime) {
            const minutes = Math.floor((cooldownTime - (now - lastRob)) / 60000);
            return replyFunc(`🚓 **La police te cherche !** Fais-toi discret pendant encore **${minutes} minutes**.`);
        }

        // --- VERIFICATIONS ---
        const victimData = eco.get(victimUser.id);
        const robberData = eco.get(robber.id);

        if (victimData.cash < 50) return replyFunc("❌ Cette personne n'a rien sur elle (moins de 50€). Inutile de prendre le risque.");
        if (robberData.cash < 500) return replyFunc("❌ Il te faut au moins **500€** sur toi pour payer l'amende si tu te fais attraper !");

        // --- ACTION (50% de chance) ---
        const success = Math.random() < 0.3; // 30% de réussite
        
        // On met le cooldown maintenant
        cooldowns.set(robber.id, now);

        if (success) {
            // Gain : Entre 10% et 40% du cash de la victime
            const percent = Math.random() * 0.3 + 0.1; // 0.1 à 0.4
            const stolen = Math.floor(victimData.cash * percent);

            eco.addCash(victimUser.id, -stolen);
            eco.addCash(robber.id, stolen);

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71) // Vert
                .setTitle('🔫 Braquage Réussi !')
                .setDescription(`Tu as volé **${stolen} €** à ${victimUser.username} !\nIl s'enfuit en pleurant. 🏃`)
                .setFooter({ text: 'Vite, dépose ça à la banque !' });
            
            return replyFunc({ embeds: [embed] });

        } else {
            // Echec : Amende de 500€
            const fine = 500;
            eco.addCash(robber.id, -fine);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Rouge
                .setTitle('🚓 ARRESTATION !')
                .setDescription(`Tu t'es fait attraper par la police !\nTu paies une amende de **${fine} €**.\n\n${victimUser.username} se moque de toi.`)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/190/190411.png');

            return replyFunc({ embeds: [embed] });
        }
    }
};