// commands/admin/say.js
const { SlashCommandBuilder, PermissionflagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sayadvance')
        .setDescription('Fait parler le bot avec style')
        .addStringOption(o => o.setName('message').setDescription('Texte à envoyer').setRequired(true))
        .addChannelOption(o => o.setName('salon').setDescription('Où envoyer ?').addChannelTypes(ChannelType.GuildText))
        .addBooleanOption(o => o.setName('embed').setDescription('Envoyer en tant qu\'embed ?'))
        .setDefaultMemberPermissions(PermissionflagsBits.Administrator),
    async execute(interaction) {
        const msg = interaction.options.getString('message');
        const channel = interaction.options.getChannel('salon') || interaction.channel;
        const useEmbed = interaction.options.getBoolean('embed');

        if (useEmbed) {
            const embed = new (require('discord.js').EmbedBuilder)().setDescription(msg).setColor(0x5865F2);
            await channel.send({ embeds: [embed] });
        } else {
            await channel.send(msg);
        }
        await interaction.reply({ content: '✅ Envoyé !', flags: true });
    }
};