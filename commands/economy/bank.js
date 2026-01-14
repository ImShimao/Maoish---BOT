const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js'); //

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Gère tes finances au Maoish Palace')
        // SOUS-COMMANDE : VOIR LES COMPTES
        .addSubcommand(sub => 
            sub.setName('info')
               .setDescription('Consulte ton solde ou celui d\'un autre membre')
               .addUserOption(o => o.setName('utilisateur').setDescription('Le membre à consulter')))
        // SOUS-COMMANDE : DÉPOSER
        .addSubcommand(sub => 
            sub.setName('déposer')
               .setDescription('Dépose ton cash en sécurité à la banque')
               .addStringOption(o => o.setName('montant').setDescription('Somme à déposer (ou "all")').setRequired(true)))
        // SOUS-COMMANDE : RETIRER
        .addSubcommand(sub => 
            sub.setName('retirer')
               .setDescription('Retire de l\'argent de ton compte bancaire')
               .addStringOption(o => o.setName('montant').setDescription('Somme à retirer (ou "all")').setRequired(true))),

    async execute(interactionOrMessage, args) {
        let user, subcommand, amountRaw, targetUser, replyFunc;

        // --- 1. GESTION DES INPUTS (SLASH / PREFIX) ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            subcommand = interactionOrMessage.options.getSubcommand();
            targetUser = interactionOrMessage.options.getUser('utilisateur');
            amountRaw = interactionOrMessage.options.getString('montant');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Préfixe (+bank, +bank @user, +bank depot 100)
            user = interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
            
            const firstArg = args[0]?.toLowerCase();
            if (['depot', 'déposer', 'd'].includes(firstArg)) {
                subcommand = 'déposer';
                amountRaw = args[1];
            } else if (['retrait', 'retirer', 'r'].includes(firstArg)) {
                subcommand = 'retirer';
                amountRaw = args[1];
            } else {
                subcommand = 'info';
                targetUser = interactionOrMessage.mentions.users.first();
            }
        }

        // Fonction de formatage des nombres (Ex: 1 000 000 €)
        const fmt = (n) => n.toLocaleString('fr-FR');

        // --- 2. LOGIQUE PAR SOUS-COMMANDE ---

        // === CAS : CONSULTATION (INFO) ===
        if (subcommand === 'info') {
            const target = targetUser || user;
            const data = await eco.get(target.id); //
            const total = data.cash + data.bank;

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(target.id === user.id ? `🏦 Ma Banque` : `🕵️ Compte de ${target.username}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '💵 Argent Liquide (Cash)', value: `> **${fmt(data.cash)} €**`, inline: true },
                    { name: '💳 Compte Bancaire', value: `> **${fmt(data.bank)} €**`, inline: true },
                    { name: '💰 Fortune Totale', value: `\`\`\`arm\n${fmt(total)} €\n\`\`\``, inline: false }
                )
                .setFooter({ text: target.id === user.id ? 'Protège ton cash en le déposant !' : 'Lecture seule' });

            return replyFunc({ embeds: [embed] });
        }

        // === CAS : TRANSACTIONS (DÉPOSER / RETIRER) ===
        const data = await eco.get(user.id); //
        if (!amountRaw) return replyFunc("❌ Tu dois préciser un montant (Ex: `100` ou `all`).");

        let amount = 0;
        if (['all', 'tout', 'max'].includes(amountRaw.toLowerCase())) {
            amount = (subcommand === 'déposer') ? data.cash : data.bank;
        } else {
            amount = parseInt(amountRaw);
        }

        if (isNaN(amount) || amount <= 0) return replyFunc("❌ Montant invalide.");

        if (subcommand === 'déposer') {
            const success = await eco.deposit(user.id, amount); //
            if (success) {
                const newData = await eco.get(user.id); //
                replyFunc(`✅ **${fmt(amount)} €** déposés en sécurité. (Nouveau solde banque : **${fmt(newData.bank)} €**)`);
            } else {
                replyFunc(`❌ Tu n'as pas assez de cash sur toi ! (Dispo : **${fmt(data.cash)} €**)`);
            }
        } 
        else if (subcommand === 'retirer') {
            const success = await eco.withdraw(user.id, amount); //
            if (success) {
                const newData = await eco.get(user.id); //
                replyFunc(`✅ **${fmt(amount)} €** retirés. (Nouveau solde cash : **${fmt(newData.cash)} €**)`);
            } else {
                replyFunc(`❌ Tu n'as pas assez d'argent en banque ! (Dispo : **${fmt(data.bank)} €**)`);
            }
        }
    }
};