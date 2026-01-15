const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Retirer ou Reset l\'argent (👑 Créateur uniquement)')
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
        // --- 1. INITIALISATION ---
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const guild = interactionOrMessage.guild;

        // Fonction de réponse hybride
        const replyFunc = (payload) => {
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(payload);
            return interactionOrMessage.channel.send(payload);
        };

        // --- 🔒 SÉCURITÉ ULTIME : OWNER ONLY ---
        if (guild.ownerId !== user.id) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Accès Refusé", "Seul le **Créateur du Serveur** (👑) peut retirer de l'argent ou réinitialiser les comptes.")] 
            });
        }

        // --- 2. GESTION ARGUMENTS ---
        let targets = [];
        let amountInput, account, isEveryone = false;

        // MODE SLASH
        if (interactionOrMessage.isCommand?.()) {
            amountInput = interactionOrMessage.options.getString('montant');
            account = interactionOrMessage.options.getString('compte') || 'cash';
            const memberOption = interactionOrMessage.options.getUser('membre');
            isEveryone = interactionOrMessage.options.getBoolean('tout_le_monde');

            if (isEveryone) {
                // On fetch pour être sûr d'avoir tout le monde en cache
                if (guild.members.cache.size < guild.memberCount) await guild.members.fetch();
                targets = guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else if (memberOption) {
                targets = [memberOption];
            } else {
                return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur", "Tu dois choisir soit un **membre**, soit l'option **tout_le_monde**.")] });
            }
        } 
        // MODE PREFIXE
        else {
            if (!args || args.length === 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Usage", "`+removemoney @User 100` ou `+removemoney everyone all`")] });

            // On détecte "everyone" ou "all" dans les arguments
            if (args.includes('everyone') || args.includes('all')) {
                isEveryone = true;
                if (guild.members.cache.size < guild.memberCount) await guild.members.fetch();
                targets = guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
            } else {
                const mentions = interactionOrMessage.mentions.users.map(u => u);
                targets = mentions.length > 0 ? mentions : [];
            }

            // Détection du montant (chiffre ou mot clé "all")
            amountInput = args.find(a => !a.startsWith('<@') && (['all', 'tout', 'max'].includes(a.toLowerCase()) || !isNaN(a)));
            account = args.includes('bank') ? 'bank' : 'cash';

            if (!amountInput || targets.length === 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur", "Cible ou montant manquant.")] });
        }

        // --- 3. LOGIQUE (RESET vs RETRAIT) ---
        const isReset = ['all', 'tout', 'max'].includes(amountInput.toLowerCase());
        const amountVal = isReset ? 0 : parseInt(amountInput);

        // Feedback de chargement si beaucoup de monde
        if (isEveryone) {
            const loadingMsg = await replyFunc({ embeds: [embeds.warning(interactionOrMessage, "Traitement en cours...", `Opération sur **${targets.length}** comptes...`)] });
        }

        let count = 0;
        
        // Boucle de traitement sécurisée
        for (const target of targets) {
            // On récupère les données via ton utilitaire eco
            const userData = await eco.get(target.id);
            
            if (isReset) {
                // RESET : On met à 0
                if (account === 'bank') userData.bank = 0;
                else userData.cash = 0;
            } else {
                // RETRAIT : On soustrait (en évitant le négatif si tu veux, sinon on laisse descendre)
                if (account === 'bank') userData.bank -= amountVal;
                else userData.cash -= amountVal;
            }
            
            await userData.save();
            count++;
        }

        // --- 4. RÉPONSE ---
        const location = account === 'bank' ? 'Banque' : 'Cash';
        const actionText = isReset ? "📉 RESET TOTAL (0 €)" : `📉 Retrait de **${amountVal.toLocaleString('fr-FR')} €**`;
        
        const embed = embeds.success(interactionOrMessage, "Opération terminée", 
            `${actionText} effectué sur le compte **${location}**.\n👥 **Comptes affectés :** ${count}`
        );

        // Si c'est une slash command, on editReply si on a différé, sinon on envoie un nouveau
        if (interactionOrMessage.isCommand?.() && interactionOrMessage.deferred) {
            return interactionOrMessage.editReply({ embeds: [embed] });
        }
        return replyFunc({ embeds: [embed] });
    }
};