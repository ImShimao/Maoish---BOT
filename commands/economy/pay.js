const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Donner de l\'argent à un autre membre')
        .addUserOption(o => o.setName('membre').setDescription('À qui ?').setRequired(true))
        .addIntegerOption(o => o.setName('montant').setDescription('Combien ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let sender, receiver, amount, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            sender = interactionOrMessage.user;
            receiver = interactionOrMessage.options.getUser('membre');
            amount = interactionOrMessage.options.getInteger('montant');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            sender = interactionOrMessage.author;
            receiver = interactionOrMessage.mentions.users.first();
            if (!receiver) return interactionOrMessage.reply("❌ Mentionne quelqu'un !");
            if (!args[1] || isNaN(args[1])) return interactionOrMessage.reply("❌ Montant invalide !");
            amount = parseInt(args[1]);
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        if (amount <= 0) return replyFunc("❌ Tu ne peux pas donner 0 ou un négatif.");
        if (sender.id === receiver.id) return replyFunc("❌ Tu ne peux pas te donner de l'argent à toi-même.");

        const senderData = await eco.get(sender.id);
        if (senderData.cash < amount) return replyFunc(`❌ Tu n'as pas assez de cash sur toi (Poche : ${senderData.cash}€).`);

        // Transaction
        await eco.addCash(sender.id, -amount);
        await eco.addCash(receiver.id, amount);

        replyFunc(`💸 **${sender.username}** a donné **${amount} €** à **${receiver.username}** !`);
    }
};