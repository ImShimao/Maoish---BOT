const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminreserve')
        .setDescription('🔧 Gérer la Réserve Fédérale (Owner/Admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Seuls les admins peuvent la voir
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
        // --- GESTION HYBRIDE ---
        let user, subcommand, amountInput, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            subcommand = interactionOrMessage.options.getSubcommand();
            amountInput = interactionOrMessage.options.getInteger('montant');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            // Support limité pour les commandes prefix (ex: !adminreserve set 50000)
            user = interactionOrMessage.author;
            // On vérifie manuellement si c'est un admin pour le mode prefix
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interactionOrMessage.channel.send("❌ Commande réservée aux administrateurs.");
            }
            
            subcommand = args[0] || 'info';
            amountInput = parseInt(args[1]);
            replyFunc = async (p) => { const { ephemeral, ...o } = p; return interactionOrMessage.channel.send(o); };
        }

        // On récupère le compte de la police
        const treasury = await eco.get('police_treasury');
        const oldBalance = treasury.bank;

        // --- LOGIQUE DES SOUS-COMMANDES ---

        if (subcommand === 'info') {
            const embed = new EmbedBuilder()
                .setColor(config.COLORS.MAIN || 0x5865F2)
                .setTitle('🏦 État de la Réserve (Admin)')
                .setDescription(`Montant actuel : **${oldBalance.toLocaleString('fr-FR')} €**`)
                .setFooter({ text: "Utilise 'set', 'add' ou 'reset' pour modifier." });
            return replyFunc({ embeds: [embed], ephemeral: true });
        }

        else if (subcommand === 'set') {
            if (isNaN(amountInput)) return replyFunc({ content: "❌ Montant invalide.", ephemeral: true });
            
            treasury.bank = amountInput;
            await treasury.save();

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.SUCCESS || 0x2ECC71)
                .setTitle('🔧 Réserve Modifiée (SET)')
                .addFields(
                    { name: 'Avant', value: `${oldBalance.toLocaleString('fr-FR')} €`, inline: true },
                    { name: 'Après', value: `**${amountInput.toLocaleString('fr-FR')} €**`, inline: true }
                );
            return replyFunc({ embeds: [embed] });
        }

        else if (subcommand === 'add') {
            if (isNaN(amountInput)) return replyFunc({ content: "❌ Montant invalide.", ephemeral: true });

            await eco.addBank('police_treasury', amountInput);
            const newBalance = oldBalance + amountInput;

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.SUCCESS || 0x2ECC71)
                .setTitle('🔧 Réserve Modifiée (ADD)')
                .setDescription(`Ajout de **${amountInput.toLocaleString('fr-FR')} €** à la réserve.`)
                .addFields(
                    { name: 'Nouveau Solde', value: `**${newBalance.toLocaleString('fr-FR')} €**`, inline: true }
                );
            return replyFunc({ embeds: [embed] });
        }

        else if (subcommand === 'reset') {
            treasury.bank = 0;
            await treasury.save();

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C) // Rouge
                .setTitle('🗑️ Réserve Vidée')
                .setDescription(`La réserve fédérale a été remise à **0 €**.`);
            return replyFunc({ embeds: [embed] });
        }
    }
};