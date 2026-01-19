const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const Guild = require('../../models/Guild');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configuration générale du bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- CONFIG SUGGESTIONS (Sous-commande simple) ---
        .addSubcommand(sub => 
            sub.setName('suggestions')
               .setDescription('Configurer le salon des suggestions')
               .addChannelOption(o => 
                   o.setName('salon')
                    .setDescription('Le salon (Vide = Désactiver)')
                    .addChannelTypes(ChannelType.GuildText)))

        // --- CONFIG LOGS (Groupe de sous-commandes) ---
        .addSubcommandGroup(group => 
            group.setName('logs')
                .setDescription('Gérer le système de logs')
                // 1. CONFIG (anciennement setup)
                .addSubcommand(sub => 
                    sub.setName('config')
                        .setDescription('Définir le salon et configurer les modules')
                        .addChannelOption(opt => 
                            opt.setName('salon')
                                .setDescription('Le salon où envoyer les logs')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                // 2. INFOS
                .addSubcommand(sub => 
                    sub.setName('infos')
                        .setDescription('Voir la configuration actuelle des logs'))
                // 3. DISABLE
                .addSubcommand(sub => 
                    sub.setName('disable')
                        .setDescription('Désactiver complètement le système de logs'))
        ),

    async execute(interaction) {
        // --- 🛡️ SÉCURITÉ ANTI-CRASH ---
        // Empêche l'utilisation par message "+setup" car cette commande nécessite des options Slash
        if (!interaction.isCommand || !interaction.isCommand()) {
            return interaction.channel.send("❌ **Commande indisponible en format message.**\nUtilise `/setup` pour configurer le bot avec le menu interactif.");
        }

        // Récupération des infos de la commande
        const group = interaction.options.getSubcommandGroup(false); // Peut être null (pour suggestions) ou 'logs'
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        
        // Récupération ou Création de la Config DB
        let guildData = await Guild.findOne({ guildId: guildId });
        if (!guildData) {
            guildData = new Guild({ guildId: guildId });
            await guildData.save(); // On sauvegarde direct pour être sûr
        }

        // ====================================================
        // PARTIE 1 : SUGGESTIONS
        // ====================================================
        if (sub === 'suggestions') {
            const channel = interaction.options.getChannel('salon');

            if (!channel) {
                guildData.suggestChannel = null;
                await guildData.save();
                return interaction.reply({ embeds: [embeds.warning(interaction, 'Configuration', 'Le système de suggestions a été **désactivé**.')] });
            }

            guildData.suggestChannel = channel.id;
            await guildData.save();
            return interaction.reply({ embeds: [embeds.success(interaction, 'Configuration', `Les suggestions arriveront désormais dans ${channel}.`)] });
        }

        // ====================================================
        // PARTIE 2 : LOGS (Si le groupe est 'logs')
        // ====================================================
        if (group === 'logs') {

            // --- A. INFOS ---
            if (sub === 'infos') {
                const isActive = guildData.logs.active && guildData.logs.channelId;
                const channelObj = isActive ? interaction.guild.channels.cache.get(guildData.logs.channelId) : null;

                const status = isActive ? "✅ **Système Actif**" : "❌ **Système Désactivé**";
                const desc = `
                **Statut :** ${status}
                **Salon :** ${channelObj ? channelObj : 'Aucun (ou salon supprimé)'}
                
                **Modules :**
                📨 Messages : ${guildData.logs.messages ? '✅' : '❌'}
                🎙️ Vocal : ${guildData.logs.voice ? '✅' : '❌'}
                👋 Membres : ${guildData.logs.members ? '✅' : '❌'}
                🛡️ Modération : ${guildData.logs.mod ? '✅' : '❌'}
                🏗️ Serveur : ${guildData.logs.server ? '✅' : '❌'}
                `;

                const embed = embeds.info(interaction, '📊 Configuration des Logs', desc)
                    .setFooter({ text: "Utilise /setup logs config pour modifier." });
                
                if (!isActive) embed.setColor(0xE74C3C); // Rouge si désactivé

                return interaction.reply({ embeds: [embed] });
            }

            // --- B. DISABLE ---
            if (sub === 'disable') {
                guildData.logs.active = false;
                guildData.logs.channelId = null;
                await guildData.save();

                return interaction.reply({ 
                    embeds: [embeds.warning(interaction, "Logs désactivés", "Je ne suivrai plus les événements de ce serveur.")]
                });
            }

            // --- C. CONFIG (Interface Interactive) ---
            if (sub === 'config') {
                const channel = interaction.options.getChannel('salon');
                
                // SÉCURITÉ : Vérif permissions bot
                if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                    return interaction.reply({ 
                        embeds: [embeds.error(interaction, "Permission refusée", `Je n'ai pas le droit d'écrire dans le salon ${channel} !`)]
                    });
                }

                // Sauvegarde initiale
                guildData.logs.channelId = channel.id;
                guildData.logs.active = true;
                await guildData.save();

                // Fonction interface
                const generateInterface = (data) => {
                    const embed = embeds.success(interaction, '⚙️ Tableau de bord des Logs', `Le salon des logs est fixé sur : ${channel}\n\n**Modules Actifs :**`)
                        .addFields(
                            { name: '📨 Messages', value: data.logs.messages ? '✅ ON' : '❌ OFF', inline: true },
                            { name: '🎙️ Vocal', value: data.logs.voice ? '✅ ON' : '❌ OFF', inline: true },
                            { name: '👋 Membres', value: data.logs.members ? '✅ ON' : '❌ OFF', inline: true },
                            { name: '🛡️ Modération', value: data.logs.mod ? '✅ ON' : '❌ OFF', inline: true },
                            { name: '🏗️ Serveur', value: data.logs.server ? '✅ ON' : '❌ OFF', inline: true }
                        );

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('logs_select')
                        .setPlaceholder('Modifier les modules...')
                        .setMinValues(0)
                        .setMaxValues(5)
                        .addOptions(
                            { label: 'Messages', description: 'Suppressions & Modifications', value: 'messages', emoji: '📨', default: data.logs.messages },
                            { label: 'Vocal', description: 'Connexions & Déplacements', value: 'voice', emoji: '🎙️', default: data.logs.voice },
                            { label: 'Membres', description: 'Arrivées & Départs', value: 'members', emoji: '👋', default: data.logs.members },
                            { label: 'Modération', description: 'Bans, Kicks & Warns', value: 'mod', emoji: '🛡️', default: data.logs.mod },
                            { label: 'Serveur', description: 'Salons, Rôles & Emojis', value: 'server', emoji: '🏗️', default: data.logs.server }
                        );

                    const row = new ActionRowBuilder().addComponents(selectMenu);
                    return { embeds: [embed], components: [row] };
                };

                const response = await interaction.reply({ 
                    ...generateInterface(guildData), 
                    fetchReply: true 
                });

                // Collecteur
                const collector = response.createMessageComponentCollector({ 
                    componentType: ComponentType.StringSelect, 
                    time: 120000 
                });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: "Pas touche ! Tu n'as pas lancé la commande.", ephemeral: true });
                    }

                    const selected = i.values;
                    
                    guildData.logs.messages = selected.includes('messages');
                    guildData.logs.voice = selected.includes('voice');
                    guildData.logs.members = selected.includes('members');
                    guildData.logs.mod = selected.includes('mod');
                    guildData.logs.server = selected.includes('server');
                    
                    await guildData.save();
                    
                    await i.update(generateInterface(guildData));
                });

                collector.on('end', () => {
                    interaction.editReply({ components: [] }).catch(() => {});
                });
            }
        }
    }
};