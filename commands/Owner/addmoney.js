const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Générer de l\'argent (Owner Only)')
        .addIntegerOption(o => o.setName('montant').setDescription('Combien ?').setRequired(true))
        .addUserOption(o => o.setName('membre').setDescription('Un joueur spécifique (Vide = Toi)'))
        .addBooleanOption(o => o.setName('tout_le_monde').setDescription('Donner à tout le serveur ?'))
        .addStringOption(o => 
            o.setName('compte')
            .setDescription('Où mettre l\'argent ? (Défaut: Cash)')
            .addChoices(
                { name: '💵 Cash', value: 'cash' },
                { name: '🏦 Banque', value: 'bank' }
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interactionOrMessage, args) {
        let userID = interactionOrMessage.user ? interactionOrMessage.user.id : interactionOrMessage.author.id;
        let replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- SÉCURITÉ ULTIME : OWNER ONLY ---
        if (interactionOrMessage.guild.ownerId !== userID) {
            return replyFunc("⛔ **Accès Refusé.** Seul le **propriétaire du serveur** (la couronne 👑) peut créer de l'argent.");
        }

        let targets = [];
        let amount, account, isEveryone = false;

        // --- GESTION SLASH COMMAND ---
        if (interactionOrMessage.isCommand?.()) {
            amount = interactionOrMessage.options.getInteger('montant');
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
                // MODIFICATION ICI : Si personne n'est choisi, c'est TOI la cible
                targets = [interactionOrMessage.user];
            }
        } 
        // --- GESTION PREFIX (+addmoney) ---
        else {
            amount = parseInt(args.find(a => !isNaN(a) && !a.startsWith('<@')));
            account = args.includes('bank') ? 'bank' : 'cash';

            if (!amount) return replyFunc("❌ Usage: `+addmoney 1000` (pour toi) ou `+addmoney @User 1000`");

            if (args.includes('everyone') || args.includes('all')) {
                isEveryone = true;
                await interactionOrMessage.guild.members.fetch();
                targets = interactionOrMessage.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else {
                const mentions = interactionOrMessage.mentions.users.map(u => u);
                if (mentions.length > 0) {
                    targets = mentions;
                } else {
                    // MODIFICATION ICI : Si pas de mention, c'est l'auteur du message
                    targets = [interactionOrMessage.author];
                }
            }
        }

        // --- DISTRIBUTION ---
        let count = 0;
        targets.forEach(user => {
            if (account === 'bank') eco.addBank(user.id, amount);
            else eco.addCash(user.id, amount);
            count++;
        });

        if (isEveryone) {
            replyFunc(`✅ **${amount} €** ont été envoyés à **tout le monde** (${count} membres) ! 💸`);
        } else if (targets.length === 1) {
            // Petit message personnalisé si c'est toi-même
            const isSelf = targets[0].id === userID;
            const targetName = isSelf ? "ton propre compte" : `**${targets[0].username}**`;
            replyFunc(`✅ **${amount} €** ajoutés à ${targetName} (${account === 'bank' ? 'Banque' : 'Cash'}).`);
        } else {
            replyFunc(`✅ **${amount} €** ajoutés à **${count} personnes**.`);
        }
    }
};