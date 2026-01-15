const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ On importe l'usine à embeds

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
            replyFunc = (payload) => interactionOrMessage.reply(payload);
        } else {
            user = interactionOrMessage.author;
            replyFunc = (payload) => interactionOrMessage.channel.send(payload);
            
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

        // Fonction de formatage des nombres
        const fmt = (n) => n.toLocaleString('fr-FR');

        // --- 2. LOGIQUE PAR SOUS-COMMANDE ---

        // === CAS : CONSULTATION (INFO) ===
        if (subcommand === 'info') {
            const target = targetUser || user;
            const data = await eco.get(target.id);
            const total = data.cash + data.bank;

        // On passe null comme description car on utilise des Fields après
        const embed = embeds.info(interactionOrMessage, target.id === user.id ? `🏦 Ma Banque` : `🕵️ Compte de ${target.username}`, null)
            .setColor(0xF1C40F)
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
        const data = await eco.get(user.id);

        // Erreur : Pas de montant
        if (!amountRaw) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu dois préciser un montant (Ex: `100` ou `all`).")] });

        let amount = 0;
        if (['all', 'tout', 'max'].includes(amountRaw.toLowerCase())) {
            amount = (subcommand === 'déposer') ? data.cash : data.bank;
        } else {
            amount = parseInt(amountRaw);
        }

        // Erreur : Montant invalide
        if (isNaN(amount) || amount <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Le montant indiqué est invalide.")] });

        // --- DÉPÔT ---
        if (subcommand === 'déposer') {
            const success = await eco.deposit(user.id, amount);
            if (success) {
                const newData = await eco.get(user.id);
                // Succès : Embed Vert
                replyFunc({ 
                    embeds: [embeds.success(interactionOrMessage, "Dépôt effectué", `✅ Tu as déposé **${fmt(amount)} €** en sécurité.\n🏦 Nouveau solde banque : **${fmt(newData.bank)} €**`)] 
                });
            } else {
                // Erreur : Embed Rouge
                replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez de cash sur toi !\n💵 Tu possèdes : **${fmt(data.cash)} €**`)] 
                });
            }
        } 
        // --- RETRAIT ---
        else if (subcommand === 'retirer') {
            const success = await eco.withdraw(user.id, amount);
            if (success) {
                const newData = await eco.get(user.id);
                // Succès : Embed Vert
                replyFunc({ 
                    embeds: [embeds.success(interactionOrMessage, "Retrait effectué", `✅ Tu as retiré **${fmt(amount)} €** de ton compte.\n💵 Nouveau solde cash : **${fmt(newData.cash)} €**`)] 
                });
            } else {
                // Erreur : Embed Rouge
                replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, `Fonds insuffisants en banque !\n🏦 Tu possèdes : **${fmt(data.bank)} €**`)] 
                });
            }
        }
    }
};