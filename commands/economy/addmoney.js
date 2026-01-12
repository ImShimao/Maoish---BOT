const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Générer de l\'argent (Admin Only)')
        .addUserOption(o => o.setName('membre').setDescription('Le chanceux').setRequired(true))
        .addIntegerOption(o => o.setName('montant').setDescription('Combien ?').setRequired(true))
        .addStringOption(o => 
            o.setName('compte')
            .setDescription('Où mettre l\'argent ?')
            .setRequired(true)
            .addChoices(
                { name: '💵 Cash', value: 'cash' },
                { name: '🏦 Banque', value: 'bank' }
            ))
        // Sécurité : Seuls les admins peuvent voir et utiliser cette commande
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interactionOrMessage, args) {
        let user, amount, account, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('membre');
            amount = interactionOrMessage.options.getInteger('montant');
            account = interactionOrMessage.options.getString('compte');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version préfixe (+addmoney @Vins 1000 cash)
            // Sécurité manuelle pour le préfixe
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interactionOrMessage.reply("❌ Tu n'es pas un Dieu, tu ne peux pas créer d'argent.");
            }
            
            user = interactionOrMessage.mentions.users.first();
            amount = parseInt(args[1]);
            account = args[2]?.toLowerCase() || 'cash';
            replyFunc = (p) => interactionOrMessage.channel.send(p);

            if (!user || isNaN(amount)) return replyFunc("❌ Usage: `+addmoney @User 1000 cash`");
        }

        if (account === 'bank') {
            eco.addBank(user.id, amount);
            replyFunc(`✅ **${amount} €** ajoutés sur le compte **Banque** de **${user.username}**.`);
        } else {
            eco.addCash(user.id, amount);
            replyFunc(`✅ **${amount} €** ajoutés dans la **Poche** de **${user.username}**.`);
        }
    }
};