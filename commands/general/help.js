const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche le centre d\'aide interactif'),

    async execute(interactionOrMessage) {
        const { client } = interactionOrMessage;
        const member = interactionOrMessage.member || await interactionOrMessage.guild.members.fetch(interactionOrMessage.author.id);
        const user = interactionOrMessage.user || interactionOrMessage.author;

        let replyFunc, getMessage;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            // Pour les slashs, on diffère la réponse en mode éphémère (visible que par toi)
            await interactionOrMessage.deferReply({ ephemeral: true });
            replyFunc = (p) => interactionOrMessage.editReply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            // Pour les messages classiques
            replyFunc = (p) => interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        // 1. Filtrage des commandes par permission
        // On vérifie si l'utilisateur a les perms requises par la commande (si définies)
        const commands = client.commands.filter(cmd => {
            if (!cmd.data.default_member_permissions) return true;
            return member.permissions.has(cmd.data.default_member_permissions);
        });

        // 2. Organisation par catégories
        const categories = {};
        commands.forEach(cmd => {
            // On s'attend à ce que le handler de commande ait ajouté la propriété 'category'
            // Sinon on met 'Général' par défaut
            const cat = cmd.category || 'general'; 
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        });

        const catNames = Object.keys(categories);

        // 3. Embed d'accueil via l'USINE
        const mainEmbed = embeds.info(interactionOrMessage, '📚 Centre d\'Aide - Maoish', 
            `Bonjour **${user.username}** ! Sélectionnez une catégorie ci-dessous pour voir les commandes disponibles.\n\n` +
            `🔹 **Catégories disponibles :** ${catNames.length}\n` +
            `🔹 **Commandes accessibles :** ${commands.size}`
        ).setThumbnail(client.user.displayAvatarURL());

        // 4. Menu déroulant
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Choisissez une catégorie...')
            .addOptions(
                catNames.map(cat => ({
                    label: capitalize(cat),
                    description: `Voir les commandes de la catégorie ${cat}`,
                    value: cat,
                    emoji: getEmoji(cat)
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 5. Envoi
        const response = await replyFunc({
            embeds: [mainEmbed],
            components: [row]
        });

        const msg = await getMessage(response);
        if (!msg) return;

        // 6. Collecteur
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === user.id, // Seul celui qui a fait la commande peut utiliser le menu
            time: 60000
        });

        collector.on('collect', async i => {
            const selectedCat = i.values[0];
            const catCmds = categories[selectedCat];

            // Création de l'embed de catégorie via l'USINE
            const description = catCmds.map(c => `**/${c.data.name}**\n└ ${c.data.description}`).join('\n\n');
            
            const catEmbed = embeds.info(interactionOrMessage, `📂 Catégorie : ${capitalize(selectedCat)}`, description)
                .setColor(getColor(selectedCat)); // Couleur dynamique selon la catégorie

            await i.update({ embeds: [catEmbed] });
        });

        collector.on('end', async () => {
            // Désactive le menu à la fin
            try {
                const disabledRow = new ActionRowBuilder().addComponents(selectMenu.setDisabled(true));
                if (interactionOrMessage.isCommand?.()) await interactionOrMessage.editReply({ components: [disabledRow] });
                else await msg.edit({ components: [disabledRow] });
            } catch (e) {}
        });
    }
};

// --- FONCTIONS UTILITAIRES ---

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function getEmoji(category) {
    const emojis = {
        moderation: '🛡️',
        economy: '💰',
        games: '🎮',
        fun: '✨',
        general: '⚙️',
        owner: '👑',
        admin: '🔒'
    };
    return emojis[category.toLowerCase()] || '📂';
}

function getColor(category) {
    const colors = {
        moderation: 0xE74C3C, // Rouge
        economy: 0xF1C40F,    // Or
        games: 0x9B59B6,      // Violet
        fun: 0xE91E63,        // Rose
        general: 0x3498DB,    // Bleu
        owner: 0x000000       // Noir
    };
    return colors[category.toLowerCase()] || 0x2F3136;
}