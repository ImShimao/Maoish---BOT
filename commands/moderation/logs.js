const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const Guild = require('../../models/Guild');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Gère le système de logs du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 1. SETUP
        .addSubcommand(sub => 
            sub.setName('setup')
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
                .setDescription('Désactiver complètement le système de logs')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        
        // Récupération / Création DB
        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) {
            guildData = new Guild({ guildId: interaction.guild.id });
            await guildData.save();
        }

        // --- SOUS-COMMANDE : INFOS ---
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
            `;

            const embed = embeds.info(interaction, '📊 Configuration des Logs', desc)
                .setFooter({ text: "Fais /logs setup pour modifier ça." });
            
            if (!isActive) embed.setColor(0xE74C3C); // Rouge si désactivé

            return interaction.reply({ embeds: [embed] });
        }

        // --- SOUS-COMMANDE : DISABLE ---
        if (sub === 'disable') {
            guildData.logs.active = false;
            guildData.logs.channelId = null;
            await guildData.save();

            return interaction.reply({ 
                embeds: [embeds.warning(interaction, "Logs désactivés", "Je ne suivrai plus les événements de ce serveur.")]
            });
        }

        // --- SOUS-COMMANDE : SETUP (Tableau de bord) ---
        if (sub === 'setup') {
            const channel = interaction.options.getChannel('salon');
            
            // SÉCURITÉ : On vérifie si le bot peut écrire dans ce salon
            if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Permission refusée", `Je n'ai pas le droit d'écrire dans le salon ${channel} !`)]
                });
            }

            // Sauvegarde initiale
            guildData.logs.channelId = channel.id;
            guildData.logs.active = true;
            await guildData.save();

            // Fonction pour générer l'interface dynamique
            const generateInterface = (data) => {
                const embed = embeds.success(interaction, '⚙️ Tableau de bord des Logs', `Le salon des logs est fixé sur : ${channel}\n\n**Modules Actifs :**`)
                    .addFields(
                        { name: '📨 Messages', value: data.logs.messages ? '✅ ON' : '❌ OFF', inline: true },
                        { name: '🎙️ Vocal', value: data.logs.voice ? '✅ ON' : '❌ OFF', inline: true },
                        { name: '👋 Membres', value: data.logs.members ? '✅ ON' : '❌ OFF', inline: true },
                        { name: '🛡️ Modération', value: data.logs.mod ? '✅ ON' : '❌ OFF', inline: true }
                    );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('logs_select')
                    .setPlaceholder('Modifier les modules...')
                    .setMinValues(0)
                    .setMaxValues(4)
                    .addOptions(
                        { label: 'Messages', description: 'Suppressions & Modifications', value: 'messages', emoji: '📨', default: data.logs.messages },
                        { label: 'Vocal', description: 'Connexions & Déplacements', value: 'voice', emoji: '🎙️', default: data.logs.voice },
                        { label: 'Membres', description: 'Arrivées & Départs', value: 'members', emoji: '👋', default: data.logs.members },
                        { label: 'Modération', description: 'Bans, Kicks & Warns', value: 'mod', emoji: '🛡️', default: data.logs.mod }
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
                time: 120000 // 2 minutes
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "Pas touche ! Tu n'as pas lancé la commande.", ephemeral: true });
                }

                const selected = i.values;
                
                // Mise à jour des booléens selon la sélection
                // Si 'messages' est dans la liste sélectionnée, on met TRUE, sinon FALSE
                guildData.logs.messages = selected.includes('messages');
                guildData.logs.voice = selected.includes('voice');
                guildData.logs.members = selected.includes('members');
                guildData.logs.mod = selected.includes('mod');
                
                await guildData.save();
                
                // Mise à jour visuelle
                await i.update(generateInterface(guildData));
            });

            collector.on('end', () => {
                // On retire le menu à la fin pour faire propre
                interaction.editReply({ components: [] }).catch(() => {});
            });
        }
    }
};