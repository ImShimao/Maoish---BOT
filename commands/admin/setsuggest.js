const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild'); // ✅ Import du modèle mis à jour
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setsuggest')
        .setDescription('Configurer le salon de suggestions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Le salon des suggestions (Vide = Désactiver)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('salon');
        
        // On cherche la config du serveur (create if not exists)
        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) guildData = new Guild({ guildId: interaction.guild.id });

        if (!channel) {
            // Désactivation
            guildData.suggestChannel = null;
            await guildData.save();
            return interaction.reply({ embeds: [embeds.success(interaction, 'Succès', 'Le système de suggestions a été désactivé.')] });
        }

        // Activation
        guildData.suggestChannel = channel.id;
        await guildData.save();

        await interaction.reply({ embeds: [embeds.success(interaction, 'Succès', `Les suggestions arriveront désormais dans ${channel}.`)] });
    }
};