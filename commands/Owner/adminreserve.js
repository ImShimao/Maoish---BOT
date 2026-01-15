const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminreserve')
        .setDescription('🔧 Gérer la Réserve Fédérale (👑 Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Masqué pour les membres normaux
        .addSubcommand(sub => 
            sub.setName('info')
                .setDescription('Voir le montant actuel de la réserve')
        )
        .addSubcommand(sub => 
            sub.setName('set')
                .setDescription('Définir le montant exact de la réserve')
                .addIntegerOption(opt => opt.setName('montant').setDescription('Le nouveau montant').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Ajouter de l\'argent à la réserve')
                .addIntegerOption(opt => opt.setName('montant').setDescription('Montant à ajouter (ou - pour retirer)').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('reset')
                .setDescription('Vider la réserve (Mettre à 0)')
        ),

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
                embeds: [embeds.error(interactionOrMessage, "Accès Refusé", "Seul le **Créateur du Serveur** (👑) peut toucher à la Réserve Fédérale.")] 
            });
        }

        // --- 2. GESTION ARGUMENTS ---
        let subcommand, amountInput;

        if (interactionOrMessage.isCommand?.()) {
            subcommand = interactionOrMessage.options.getSubcommand();
            amountInput = interactionOrMessage.options.getInteger('montant');
        } else {
            // Support prefix : !adminreserve set 50000
            subcommand = args[0] || 'info';
            amountInput = parseInt(args[1]);
        }

        // --- 3. CHARGEMENT DONNÉES ---
        // On récupère le compte spécial 'police_treasury'
        const treasury = await eco.get('police_treasury');
        const oldBalance = treasury.bank;

        // --- 4. LOGIQUE SOUS-COMMANDES ---

        // 🏦 INFO
        if (subcommand === 'info') {
            const embed = embeds.info(interactionOrMessage, '🏦 État de la Réserve', `Montant actuel : **${oldBalance.toLocaleString('fr-FR')} €**`)
                .setFooter({ text: "Utilise 'set', 'add' ou 'reset' pour modifier." });
            
            // On met en mode éphémère si c'est une slash command pour plus de discrétion
            return replyFunc({ embeds: [embed], ephemeral: true });
        }

        // 🔧 SET (Définir)
        else if (subcommand === 'set') {
            if (isNaN(amountInput)) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur", "Montant invalide.")] });
            
            treasury.bank = amountInput;
            await treasury.save();

            const embed = embeds.success(interactionOrMessage, 'Réserve Modifiée (SET)', null)
                .addFields(
                    { name: 'Avant', value: `${oldBalance.toLocaleString('fr-FR')} €`, inline: true },
                    { name: 'Après', value: `**${amountInput.toLocaleString('fr-FR')} €**`, inline: true }
                );
            return replyFunc({ embeds: [embed] });
        }

        // ➕ ADD (Ajouter/Retirer)
        else if (subcommand === 'add') {
            if (isNaN(amountInput)) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur", "Montant invalide.")] });

            await eco.addBank('police_treasury', amountInput);
            const newBalance = oldBalance + amountInput;

            const embed = embeds.success(interactionOrMessage, 'Réserve Ajustée (ADD)', `Opération : **${amountInput > 0 ? '+' : ''}${amountInput.toLocaleString('fr-FR')} €**`)
                .addFields(
                    { name: 'Nouveau Solde', value: `**${newBalance.toLocaleString('fr-FR')} €**`, inline: true }
                );
            return replyFunc({ embeds: [embed] });
        }

        // 🗑️ RESET (Vider)
        else if (subcommand === 'reset') {
            treasury.bank = 0;
            await treasury.save();

            const embed = embeds.warning(interactionOrMessage, 'Réserve Vidée', "La réserve fédérale a été remise à **0 €**.")
                .setColor(0xE74C3C); // Rouge
            return replyFunc({ embeds: [embed] });
        }
    }
};