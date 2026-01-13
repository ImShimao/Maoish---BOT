const { SlashCommandBuilder, PermissionflagsBits } = require('discord.js');
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
        .setDefaultMemberPermissions(PermissionflagsBits.Administrator),

    async execute(interactionOrMessage, args) {
        let userID = interactionOrMessage.user ? interactionOrMessage.user.id : interactionOrMessage.author.id;
        let replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- SÉCURITÉ OWNER ONLY ---
        if (interactionOrMessage.guild.ownerId !== userID) {
            return replyFunc("⛔ **Accès Refusé.** Seul le **propriétaire du serveur** peut utiliser cette commande.");
        }

        let targets = [];
        let amountInput, account, isEveryone = false;

        // --- RÉCUPÉRATION DES PARAMÈTRES ---
        if (interactionOrMessage.isCommand?.()) {
            amountInput = interactionOrMessage.options.getString('montant');
            account = interactionOrMessage.options.getString('compte') || 'cash';
            const member = interactionOrMessage.options.getUser('membre');
            const all = interactionOrMessage.options.getBoolean('tout_le_monde');

            if (all) {
                isEveryone = true;
                // On fetch pour être sûr d'avoir tout le monde
                if (interactionOrMessage.guild.members.cache.size < interactionOrMessage.guild.memberCount) {
                    await interactionOrMessage.guild.members.fetch();
                }
                targets = interactionOrMessage.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else if (member) {
                targets = [member];
            } else {
                return replyFunc("❌ Tu dois choisir soit un **membre**, soit l'option **tout_le_monde**.");
            }
        } else {
            // Version Préfixe
            if (args.includes('everyone') || args.includes('all')) {
                isEveryone = true;
                if (interactionOrMessage.guild.members.cache.size < interactionOrMessage.guild.memberCount) {
                    await interactionOrMessage.guild.members.fetch();
                }
                targets = interactionOrMessage.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else {
                targets = interactionOrMessage.mentions.users.map(u => u);
            }
            amountInput = args.find(a => !a.startsWith('<@') && (['all', 'tout'].includes(a.toLowerCase()) || !isNaN(a)));
            account = args.includes('bank') ? 'bank' : 'cash';
            
            if (!amountInput || targets.length === 0) return replyFunc("❌ Usage: `+removemoney @User 100` ou `+removemoney everyone all`");
        }

        // --- ACTION ---
        const targetIds = targets.map(u => u.id);
        const isReset = ['all', 'tout', 'max'].includes(amountInput.toLowerCase());

        if (isReset) {
            // RESET TOTAL : On met le compte à 0
            eco.batchSet(targetIds, 0, account);
            replyFunc(`📉 **RESET TOTAL (0 €)** effectué sur le compte **${account}** de **${isEveryone ? 'tout le monde' : targets[0].username}**.`);
        } else {
            // RETRAIT : On retire un montant fixe
            const val = parseInt(amountInput);
            if (isNaN(val)) return replyFunc("❌ Montant invalide.");
            
            // On ajoute un montant négatif (ex: -100)
            eco.batchAdd(targetIds, -val, account);
            replyFunc(`📉 **Retrait de ${val} €** effectué sur le compte **${account}** de **${isEveryone ? 'tout le monde' : targets[0].username}**.`);
        }
    }
};