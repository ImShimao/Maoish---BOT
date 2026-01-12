const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Retirer ou Reset l\'argent (Owner Only)')
        .addStringOption(o => o.setName('montant').setDescription('Combien retirer ? (Ecris "all" pour tout reset)').setRequired(true))
        .addUserOption(o => o.setName('membre').setDescription('Un joueur spécifique'))
        .addBooleanOption(o => o.setName('tout_le_monde').setDescription('Retirer à tout le serveur ?'))
        .addStringOption(o => 
            o.setName('compte')
            .setDescription('Quel compte viser ? (Défaut: Cash)')
            .addChoices(
                { name: '💵 Cash', value: 'cash' },
                { name: '🏦 Banque', value: 'bank' }
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interactionOrMessage, args) {
        let userID = interactionOrMessage.user ? interactionOrMessage.user.id : interactionOrMessage.author.id;
        let replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- SÉCURITÉ OWNER ONLY ---
        if (interactionOrMessage.guild.ownerId !== userID) {
            return replyFunc("⛔ **Accès Refusé.** Seul le **propriétaire du serveur** peut confisquer de l'argent.");
        }

        let targets = [];
        let amountInput, account, isEveryone = false;

        // --- GESTION SLASH COMMAND ---
        if (interactionOrMessage.isCommand?.()) {
            amountInput = interactionOrMessage.options.getString('montant');
            account = interactionOrMessage.options.getString('compte') || 'cash';
            const member = interactionOrMessage.options.getUser('membre');
            const all = interactionOrMessage.options.getBoolean('tout_le_monde');

            if (all) {
                isEveryone = true;
                await interactionOrMessage.guild.members.fetch();
                targets = interactionOrMessage.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else if (member) {
                targets = [member];
            } else {
                return replyFunc("❌ Tu dois choisir soit un **membre**, soit l'option **tout_le_monde**.");
            }
        } 
        // --- GESTION PREFIX (+removemoney) ---
        else {
            // args[0] = user/everyone, args[1] = montant, args[2] = compte
            // On cherche "everyone" ou "all"
            if (args.includes('everyone') || args.includes('all_users')) {
                isEveryone = true;
                await interactionOrMessage.guild.members.fetch();
                targets = interactionOrMessage.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else {
                targets = interactionOrMessage.mentions.users.map(u => u);
            }

            // On cherche le montant (chiffre ou "all")
            amountInput = args.find(a => !a.startsWith('<@') && (['all', 'tout'].includes(a.toLowerCase()) || !isNaN(a)));
            account = args.includes('bank') ? 'bank' : 'cash';

            if (!amountInput || targets.length === 0) return replyFunc("❌ Usage: `+removemoney @User 100` ou `+removemoney everyone all`");
        }

        // --- LOGIQUE DE RETRAIT ---
        let count = 0;
        let isReset = ['all', 'tout', 'max'].includes(amountInput.toLowerCase());
        let valueToRemove = isReset ? 0 : parseInt(amountInput);

        targets.forEach(user => {
            const currentData = eco.get(user.id);
            let removeAmount = 0;

            if (account === 'bank') {
                // Si on reset, on retire exactement ce qu'il a. Sinon le montant fixe.
                removeAmount = isReset ? currentData.bank : valueToRemove;
                if (removeAmount > 0) eco.addBank(user.id, -removeAmount);
            } else {
                removeAmount = isReset ? currentData.cash : valueToRemove;
                if (removeAmount > 0) eco.addCash(user.id, -removeAmount);
            }
            count++;
        });

        const actionText = isReset ? "RESET TOTAL (0 €)" : `Retrait de ${valueToRemove} €`;
        const targetText = isEveryone ? `tout le monde (${count} membres)` : targets[0].username;

        replyFunc(`📉 **${actionText}** effectué sur le compte **${account === 'bank' ? 'Banque' : 'Cash'}** de **${targetText}**.`);
    }
};