const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Gère ton compte ou consulte celui d\'un autre')
        // Option 1 : Voir quelqu'un (Bloque le reste)
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('Voir le compte de quelqu\'un d\'autre (Lecture seule)')
                .setRequired(false))
        // Option 2 : Action (Dépôt/Retrait)
        .addStringOption(option => 
            option.setName('action')
                .setDescription('Choisir une opération (Dépôt ou Retrait)')
                .setRequired(false)
                .addChoices(
                    { name: '📥 Déposer', value: 'depot' },
                    { name: '📤 Retirer', value: 'retrait' }
                ))
        // Option 3 : Montant
        .addStringOption(option => 
            option.setName('montant')
                .setDescription('Somme à traiter (ou "all")')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let executor, targetUser, action, amountRaw, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            executor = interactionOrMessage.user;
            targetUser = interactionOrMessage.options.getUser('utilisateur');
            action = interactionOrMessage.options.getString('action');
            amountRaw = interactionOrMessage.options.getString('montant');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            executor = interactionOrMessage.author;
            targetUser = interactionOrMessage.mentions.users.first();
            action = args[0] ? args[0].toLowerCase() : null;
            amountRaw = args[1];
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- LOGIQUE DE SÉCURITÉ ---
        // Si un utilisateur est ciblé, on force l'affichage simple, peu importe les autres options
        if (targetUser && targetUser.id !== executor.id) {
            const data = await eco.get(targetUser.id);
            const total = data.cash + data.bank;

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`🕵️ Compte de ${targetUser.username}`)
                .addFields(
                    { name: '💵 Poche', value: `**${data.cash} €**`, inline: true },
                    { name: '💳 Compte', value: `**${data.bank} €**`, inline: true },
                    { name: '💰 Total', value: `\`${total} €\``, inline: false }
                )
                .setFooter({ text: 'Tu ne peux pas effectuer d\'actions sur ce compte.' });

            return replyFunc({ embeds: [embed] });
        }

        // Si on arrive ici, c'est que l'utilisateur travaille sur SON propre compte
        const data = await eco.get(executor.id);

        // --- CAS : AFFICHAGE SIMPLE (Pas d'action choisie) ---
        if (!action) {
            const total = data.cash + data.bank;
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`🏦 Ma Banque (${executor.username})`)
                .addFields(
                    { name: '💵 Poche', value: `**${data.cash} €**`, inline: true },
                    { name: '💳 Compte', value: `**${data.bank} €**`, inline: true },
                    { name: '💰 Total', value: `\`${total} €\``, inline: false }
                )
                .setFooter({ text: 'Utilise les options "action" et "montant" pour tes transactions.' });

            return replyFunc({ embeds: [embed] });
        }

        // --- CAS : TRANSACTION (Dépôt ou Retrait) ---
        if (!amountRaw) return replyFunc("❌ Tu dois préciser un **montant** pour effectuer cette action.");

        let amount = 0;
        if (amountRaw === 'all' || amountRaw === 'tout') {
            amount = (action === 'depot') ? data.cash : data.bank;
        } else {
            amount = parseInt(amountRaw);
        }

        if (isNaN(amount) || amount <= 0) return replyFunc("❌ Montant invalide.");

        if (action === 'depot') {
            const success = await eco.deposit(executor.id, amount);
            if (success) {
                const newData = await eco.get(executor.id);
                replyFunc(`✅ **${amount} €** déposés. (Nouveau solde banque : **${newData.bank} €**)`);
            } else {
                replyFunc(`❌ Pas assez de cash en poche ! (Dispo : ${data.cash} €)`);
            }
        } 
        else if (action === 'retrait') {
            const success = await eco.withdraw(executor.id, amount);
            if (success) {
                const newData = await eco.get(executor.id);
                replyFunc(`✅ **${amount} €** retirés. (Nouveau solde poche : **${newData.cash} €**)`);
            } else {
                replyFunc(`❌ Pas assez d'argent en banque ! (Dispo : ${data.bank} €)`);
            }
        }
    }
};