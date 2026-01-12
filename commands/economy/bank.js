const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Gère ton compte bancaire')
        // Option 1 : L'action (Facultative, si vide = infos)
        .addStringOption(option => 
            option.setName('action')
                .setDescription('Que veux-tu faire ?')
                .setRequired(false)
                .addChoices(
                    { name: '📥 Déposer', value: 'depot' },
                    { name: '📤 Retirer', value: 'retrait' }
                ))
        // Option 2 : Le montant (Facultatif)
        .addStringOption(option => 
            option.setName('montant')
                .setDescription('Somme (ou "all")')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let user, action, amountRaw, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            // Si pas d'action, on met 'infos' par défaut
            action = interactionOrMessage.options.getString('action') || 'infos';
            amountRaw = interactionOrMessage.options.getString('montant');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            // +bank -> args[0] est vide -> 'infos'
            action = args[0] ? args[0].toLowerCase() : 'infos';
            amountRaw = args[1];
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        const data = await eco.get(user.id);

        // --- 1. MODE INFOS (Par défaut) ---
        if (action === 'infos' || action === 'solde') {
            const total = data.cash + data.bank;
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`🏦 Banque de ${user.username}`)
                .addFields(
                    { name: '💵 Poche', value: `**${data.cash} €**`, inline: true },
                    { name: '💳 Compte', value: `**${data.bank} €**`, inline: true },
                    { name: '💰 Total', value: `\`${total} €\``, inline: false }
                )
                .setFooter({ text: 'Utilise /bank action:Déposer pour mettre à l\'abri' });
            return replyFunc({ embeds: [embed] });
        }

        // --- GESTION MONTANT ---
        if (!amountRaw) return replyFunc("❌ Il faut préciser un montant !");

        let amount = 0;
        if (amountRaw === 'all' || amountRaw === 'tout') {
            if (action === 'depot') amount = data.cash;
            else amount = data.bank;
        } else {
            amount = parseInt(amountRaw);
        }

        if (isNaN(amount) || amount <= 0) return replyFunc("❌ Montant invalide.");

        // --- 2. DÉPÔT ---
        if (action === 'depot') {
            const success = await eco.deposit(user.id, amount);
            if (success) {
                const newData = await eco.get(user.id);
                replyFunc(`✅ **${amount} €** déposés en banque. (Nouveau solde : **${newData.bank} €**)`);
            } else {
                replyFunc(`❌ Pas assez de cash ! (Tu as ${data.cash} €)`);
            }
        } 
        // --- 3. RETRAIT ---
        else if (action === 'retrait') {
            const success = await eco.withdraw(user.id, amount);
            if (success) {
                const newData = await eco.get(user.id);
                replyFunc(`✅ **${amount} €** retirés. (Tu as maintenant **${newData.cash} €** en poche)`);
            } else {
                replyFunc(`❌ Pas assez en banque ! (Tu as ${data.bank} €)`);
            }
        }
    }
};