const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

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
            amount = parseInt(args[1]);
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        const sendEmbed = (text, color) => replyFunc({ embeds: [new EmbedBuilder().setColor(color).setDescription(text)] });

        if (!amount || isNaN(amount) || amount <= 0) return sendEmbed("❌ Montant invalide.", config.COLORS.ERROR);
        if (sender.id === receiver.id) return sendEmbed("❌ Tu ne peux pas te donner de l'argent à toi-même.", config.COLORS.ERROR);

        const senderData = await eco.get(sender.id);
        
        // FORMATAGE
        const fmt = (n) => n.toLocaleString('fr-FR');

        if (senderData.cash < amount) return sendEmbed(`❌ **Fonds insuffisants !**\nTu as seulement ${fmt(senderData.cash)} € en poche.`, config.COLORS.ERROR);

        await eco.addCash(sender.id, -amount);
        await eco.addCash(receiver.id, amount);

        sendEmbed(`💸 **Virement effectué !**\n\n📤 **${sender.username}** a envoyé **${fmt(amount)} €**\n📥 Reçu par **${receiver.username}**`, config.COLORS.SUCCESS);
    }
};