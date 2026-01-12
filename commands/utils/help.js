const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche le menu d\'aide détaillé'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.isCommand?.() ? interactionOrMessage.user : interactionOrMessage.author;
        const replyFunc = interactionOrMessage.isCommand?.() ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);
        const client = interactionOrMessage.client;

        // 1. ORGANISATION DES DONNÉES
        // On stocke les commandes complètes (nom + description) par catégorie
        const categories = {};
        
        client.commands.forEach(cmd => {
            const rawCat = cmd.category || 'Autre';
            const catName = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
            
            if (!categories[catName]) categories[catName] = [];
            
            // On prépare la ligne de texte pour l'affichage
            // Format : /nom : Description
            const description = cmd.data.description || "Pas de description";
            categories[catName].push(`**/${cmd.data.name}** : ${description}`);
        });

        // 2. CONFIG VISUELLE
        const emojis = {
            'Economy': '💰', 'Fun': '🎉', 'Utils': '🛠️', 'Admin': '🔒', 'Autre': '📂'
        };

        const catDescriptions = {
            'Economy': 'Système bancaire, jeux d\'argent et travail.',
            'Fun': 'Mini-jeux, images et divertissement.',
            'Utils': 'Outils pratiques et informations.',
            'Admin': 'Commandes de gestion serveur.'
        };

        // 3. MENU DÉROULANT
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Choisis une catégorie...');

        Object.keys(categories).sort().forEach(cat => {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(cat)
                    .setDescription(catDescriptions[cat] || 'Liste des commandes')
                    .setValue(cat)
                    .setEmoji(emojis[cat] || '🔹')
            );
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 4. EMBED D'ACCUEIL
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31) // Gris foncé style Discord
            .setTitle(`🤖 Aide de ${client.user.username}`)
            .setDescription(`
            Bienvenue **${user.username}** !
            
            Utilise le menu ci-dessous pour voir les détails des commandes.
            
            ℹ️ **Préfixe :** Tu peux aussi utiliser \`+\` devant les commandes (ex: \`+ping\`).
            📊 **Total :** ${client.commands.size} commandes disponibles.
            `)
            .setThumbnail(client.user.displayAvatarURL());

        const msg = await replyFunc({ embeds: [embed], components: [row], fetchReply: true });

        // 5. COLLECTOR
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: "Ce menu n'est pas pour toi.", ephemeral: true });

            const selectedCat = i.values[0];
            // On joint la liste avec des sauts de ligne (\n)
            const commandsList = categories[selectedCat].join('\n');

            const catEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`${emojis[selectedCat] || '🔹'} Catégorie : ${selectedCat}`)
                .setDescription(commandsList) // C'est ici que la magie opère
                .setFooter({ text: 'Maoish • v3.0' });

            await i.update({ embeds: [catEmbed], components: [row] });
        });
    }
};