const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-eco')
        .setDescription('Gérer l\'économie du serveur (Admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // --- SOUS-COMMANDE : AJOUTER ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Ajouter de l\'argent')
                .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))
                .addIntegerOption(o => o.setName('montant').setDescription('Quantité').setRequired(true))
                .addStringOption(o => 
                    o.setName('compte')
                     .setDescription('Où ?')
                     .addChoices(
                        { name: '💵 Cash', value: 'cash' }, 
                        { name: '🏦 Banque', value: 'bank' }
                     )))
        // --- SOUS-COMMANDE : RETIRER ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Retirer de l\'argent')
                .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))
                .addIntegerOption(o => o.setName('montant').setDescription('Quantité').setRequired(true))
                .addStringOption(o => 
                    o.setName('compte')
                     .setDescription('Où ?')
                     .addChoices(
                        { name: '💵 Cash', value: 'cash' }, 
                        { name: '🏦 Banque', value: 'bank' }
                     )))
        // --- SOUS-COMMANDE : DÉFINIR ---
        .addSubcommand(sub => 
            sub.setName('set')
                .setDescription('Définir un montant exact')
                .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))
                .addIntegerOption(o => o.setName('montant').setDescription('Nouveau solde').setRequired(true))
                .addStringOption(o => 
                    o.setName('compte')
                     .setDescription('Où ?')
                     .addChoices(
                        { name: '💵 Cash', value: 'cash' }, 
                        { name: '🏦 Banque', value: 'bank' }
                     )))
        // --- SOUS-COMMANDE : RESET ---
        .addSubcommand(sub => 
            sub.setName('reset')
                .setDescription('Remettre à zéro un joueur')
                .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('membre');
        const amount = interaction.options.getInteger('montant');
        const account = interaction.options.getString('compte') || 'cash'; // Par défaut cash
        const guildId = interaction.guild.id;

        // On récupère les données actuelles
        const userData = await eco.get(target.id, guildId);

        // Petite variable pour l'affichage propre dans la réponse
        const accountDisplay = account === 'cash' ? '💵 Cash' : '🏦 Banque';

        switch (sub) {
            case 'add':
                if (account === 'cash') await eco.addCash(target.id, guildId, amount);
                else await eco.addBank(target.id, guildId, amount);
                
                return interaction.reply({ embeds: [embeds.success(interaction, '💰 Ajout effectué', `**+${amount}€** ajoutés à ${target} (${accountDisplay}).`)] });

            case 'remove':
                // Pour retirer, on ajoute un nombre négatif
                if (account === 'cash') await eco.addCash(target.id, guildId, -amount);
                else await eco.addBank(target.id, guildId, -amount);

                return interaction.reply({ embeds: [embeds.success(interaction, '💸 Retrait effectué', `**-${amount}€** retirés à ${target} (${accountDisplay}).`)] });

            case 'set':
                if (account === 'cash') {
                    userData.cash = amount;
                } else {
                    userData.bank = amount;
                }
                await userData.save();
                return interaction.reply({ embeds: [embeds.success(interaction, '✍️ Modification effectuée', `Solde de ${target} défini à **${amount}€** (${accountDisplay}).`)] });

            case 'reset':
                userData.cash = 0;
                userData.bank = 0;
                await userData.save();
                return interaction.reply({ embeds: [embeds.warning(interaction, '⚠️ Reset', `Le compte de ${target} a été remis à zéro.`)] });
        }
    }
};