const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../utils/embeds.js'); // Utilisation de tes embeds consistants

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Affiche la bannière d\'un utilisateur')
        .addUserOption(option => 
            option.setName('cible')
                .setDescription('L\'utilisateur dont vous voulez voir la bannière')
                .setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('cible') || interaction.user;

        // Force le fetch de l'utilisateur pour obtenir la bannière (donnée non présente par défaut)
        const user = await target.fetch();
        const banner = user.bannerURL({ size: 4096, dynamic: true });

        // Si l'utilisateur n'a pas de bannière
        if (!banner) {
            return interaction.reply({ 
                embeds: [ui.error(`L'utilisateur **${user.tag}** n'a pas de bannière.`)], 
                flags: true 
            });
        }

        // Création de l'embed avec ton template
        const embed = ui.template(
            `Bannière de ${user.username}`,
            `🎨 [Lien de l'image](${banner})`,
            'MAIN'
        ).setImage(banner);

        await interaction.reply({ embeds: [embed] });
    },
};