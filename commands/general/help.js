const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const ui = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche le centre d\'aide interactif'),

    async execute(interaction) {
        const { client, member } = interaction;

        // 1. On diffère la réponse (Indispensable pour éviter "Unknown Interaction" si le bot charge)
        // ephemeral: true remplace flags: true
        await interaction.deferReply({ ephemeral: true });

        // 2. Filtrage des commandes par permission
        const commands = client.commands.filter(cmd => {
            if (!cmd.data.default_member_permissions) return true;
            return member.permissions.has(cmd.data.default_member_permissions);
        });

        // 3. Organisation par catégories
        const categories = {};
        commands.forEach(cmd => {
            const cat = cmd.category || 'Autres';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        });

        const catNames = Object.keys(categories);

        // 4. Embed d'accueil
        const mainEmbed = ui.template(
            '📚 Centre d\'Aide - Maoish',
            `Bonjour **${member.user.username}** ! Sélectionnez une catégorie ci-dessous pour voir les commandes disponibles.\n\n` +
            `🔹 **Catégories disponibles :** ${catNames.length}\n` +
            `🔹 **Commandes accessibles :** ${commands.size}`,
            'MAIN'
        ).setThumbnail(client.user.displayAvatarURL());

        // 5. Menu déroulant
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Choisissez une catégorie...')
            .addOptions(
                catNames.map(cat => ({
                    label: cat.charAt(0).toUpperCase() + cat.slice(1),
                    description: `Voir les commandes de la catégorie ${cat}`,
                    value: cat,
                    emoji: getEmoji(cat)
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 6. On utilise editReply car on a fait un deferReply avant
        const response = await interaction.editReply({
            embeds: [mainEmbed],
            components: [row]
        });

        // 7. Collecteur pour les interactions
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async i => {
            const selectedCat = i.values[0];
            const catCmds = categories[selectedCat];

            const catEmbed = ui.template(
                `Catégorie : ${selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1)}`,
                catCmds.map(c => `**/${c.data.name}**\n└ ${c.data.description}`).join('\n\n'),
                'MAIN'
            );

            await i.update({ embeds: [catEmbed] });
        });
    }
};

// Fonction utilitaire pour les emojis du menu
function getEmoji(category) {
    const emojis = {
        moderation: '🛡️',
        economy: '💰',
        games: '🎮',
        fun: '✨',
        general: '⚙️',
        owner: '👑'
    };
    return emojis[category.toLowerCase()] || '📂';
}