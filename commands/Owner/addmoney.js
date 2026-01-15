const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Générer de l\'argent (👑 Créateur uniquement)')
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
        // 1. Identification de l'utilisateur
        const user = interactionOrMessage.user || interactionOrMessage.author;
        
        // Fonction de réponse hybride
        const replyFunc = (payload) => {
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(payload);
            return interactionOrMessage.channel.send(payload);
        };

        // --- 🔒 SÉCURITÉ ULTIME : OWNER ONLY ---
        // On compare l'ID de l'utilisateur avec l'ID du propriétaire du serveur
        if (interactionOrMessage.guild.ownerId !== user.id) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Accès Interdit", "Seul le **Créateur du Serveur** (👑) a le droit de créer de l'argent.")] 
            });
        }

        // --- 2. GESTION DES ARGUMENTS ---
        let targets = [];
        let amount, account, isEveryone = false;

        // MODE SLASH
        if (interactionOrMessage.isCommand?.()) {
            amount = interactionOrMessage.options.getInteger('montant');
            account = interactionOrMessage.options.getString('compte') || 'cash';
            const memberOption = interactionOrMessage.options.getUser('membre');
            isEveryone = interactionOrMessage.options.getBoolean('tout_le_monde');

            if (isEveryone) {
                await interactionOrMessage.guild.members.fetch();
                targets = interactionOrMessage.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else if (memberOption) {
                targets = [memberOption];
            } else {
                targets = [user]; // Si rien précisé -> Soi-même
            }
        } 
        // MODE PREFIXE (+addmoney 1000 bank)
        else {
            if (!args || args.length === 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Usage", "`+addmoney 1000`")] });

            // On cherche le premier nombre dans les arguments
            const amountArg = args.find(a => !isNaN(a) && !a.startsWith('<@'));
            if (!amountArg) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur", "Il faut indiquer un montant !")] });
            
            amount = parseInt(amountArg);
            account = args.includes('bank') ? 'bank' : 'cash';

            if (args.includes('everyone') || args.includes('all')) {
                isEveryone = true;
                await interactionOrMessage.guild.members.fetch();
                targets = interactionOrMessage.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else {
                const mentions = interactionOrMessage.mentions.users.map(u => u);
                targets = mentions.length > 0 ? mentions : [user];
            }
        }

        // --- 3. DISTRIBUTION ---
        let count = 0;
        
        // Boucle sur les cibles
        for (const target of targets) {
            if (account === 'bank') await eco.addBank(target.id, amount);
            else await eco.addCash(target.id, amount);
            count++;
        }

        // --- 4. RÉPONSE ---
        const location = account === 'bank' ? 'Banque' : 'Cash';
        
        if (isEveryone) {
            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, "Pluie de billets !", `✅ **${amount} €** ont été envoyés à **tout le serveur** (${count} membres).`)] 
            });
        } else if (targets.length === 1) {
            const targetName = targets[0].id === user.id ? "ton propre compte" : `**${targets[0].username}**`;
            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, "Transaction réussie", `✅ **${amount} €** ajoutés à ${targetName} (${location}).`)] 
            });
        } else {
            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, "Transaction groupée", `✅ **${amount} €** ajoutés à **${count} personnes**.`)] 
            });
        }
    }
};