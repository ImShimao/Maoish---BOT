const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const User = require('../../models/User');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-eco')
        .setDescription('🛠️ Réinitialisation ciblée de l\'économie du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // --- 1. MENU DE SÉLECTION ---
        const menuEmbed = embeds.warning(interaction, '♻️ Réinitialisation Économique', 
            `**Attention, tu es sur le point de supprimer des données !**\n` +
            `Cette action affectera **TOUS les membres** de ce serveur.\n\n` +
            `Que veux-tu réinitialiser ?`
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('reset_choice')
            .setPlaceholder('Sélectionne une option...')
            .addOptions([
                {
                    label: 'Argent uniquement',
                    description: 'Remet le Cash et la Banque à 0 pour tout le monde.',
                    value: 'money',
                    emoji: '💰'
                },
                {
                    label: 'Inventaires uniquement',
                    description: 'Supprime tous les objets achetés/trouvés.',
                    value: 'inventory',
                    emoji: '🎒'
                },
                {
                    label: 'Jobs & XP uniquement',
                    description: 'Reset les métiers, niveaux et expérience.',
                    value: 'jobs_xp',
                    emoji: '⭐'
                },
                {
                    label: 'HARD RESET (TOUT)',
                    description: 'Supprime ABSOLUMENT TOUT (Argent, Items, Jobs, XP, Stats...).',
                    value: 'all_eco',
                    emoji: '☢️'
                },
                {
                    label: 'Annuler',
                    description: 'Ne rien faire.',
                    value: 'cancel',
                    emoji: '❌'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({ 
            embeds: [menuEmbed], 
            components: [row], 
            fetchReply: true 
        });

        // --- 2. COLLECTEUR ---
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            filter: i => i.user.id === interaction.user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            const choice = i.values[0];

            if (choice === 'cancel') {
                await i.update({ content: "✅ Opération annulée.", embeds: [], components: [] });
                return collector.stop();
            }

            // --- 3. PRÉPARATION DE LA REQUÊTE ---
            let confirmMsg = "";
            let updateQuery = {};

            if (choice === 'money') {
                confirmMsg = "Tu vas supprimer **l'ARGENT (Cash + Banque)** de tout le monde.";
                updateQuery = { cash: 0, bank: 0 };
            } 
            else if (choice === 'inventory') {
                confirmMsg = "Tu vas supprimer **les INVENTAIRES** de tout le monde.";
                updateQuery = { inventory: {} };
            } 
            else if (choice === 'jobs_xp') {
                confirmMsg = "Tu vas supprimer **les MÉTIERS, l'XP et les NIVEAUX**.";
                updateQuery = { 
                    xp: 0, 
                    level: 1, 
                    job: { name: null, startedAt: 0 } 
                };
            }
            else if (choice === 'all_eco') {
                confirmMsg = "⚠️ Tu vas effectuer un **HARD RESET TOTAL** (Argent, Items, Jobs, XP, Stats, Prison...).";
                // C'est ici que la magie opère : on remet TOUS les champs du UserSchema à zéro/null
                updateQuery = { 
                    cash: 0, 
                    bank: 0, 
                    inventory: {},
                    xp: 0,
                    level: 1,
                    job: { name: null, startedAt: 0 },
                    streak: 0,          // Daily streak
                    partner: null,      // Divorce tout le monde
                    jailEnd: 0,         // Libère tout le monde
                    // Reset des stats de jeu
                    stats: {
                        crimes: 0, fish: 0, mine: 0, hunts: 0,
                        digs: 0, begs: 0, hacks: 0, works: 0, dailies: 0
                    },
                    // Reset des cooldowns pour que tout le monde puisse rejouer direct
                    cooldowns: {
                        work: 0, daily: 0, rob: 0, mine: 0, fish: 0,
                        crime: 0, beg: 0, hack: 0, hunt: 0, dig: 0, braquage: 0
                    }
                };
            }

            const confirmBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`confirm_${choice}`).setLabel('JE CONFIRME').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_final').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
            );

            await i.update({ 
                embeds: [embeds.error(interaction, "⚠️ DERNIÈRE CHANCE", `**${confirmMsg}**\n\nEs-tu vraiment sûr ? C'est irréversible.`)], 
                components: [confirmBtn] 
            });

            // --- 4. COLLECTEUR BOUTON (Confirmation) ---
            const btnCollector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button,
                filter: btn => btn.user.id === interaction.user.id,
                time: 15000 
            });

            btnCollector.on('collect', async btn => {
                if (btn.customId === 'cancel_final') {
                    await btn.update({ content: "✅ Ouf ! Annulé au dernier moment.", embeds: [], components: [] });
                    return btnCollector.stop();
                }

                if (btn.customId.startsWith('confirm_')) {
                    // --- EXÉCUTION DE LA BDD ---
                    const guildId = interaction.guild.id;
                    
                    try {
                        // On met à jour tous les documents qui ont ce guildId
                        const res = await User.updateMany({ guildId: guildId }, { $set: updateQuery });

                        await btn.update({ 
                            embeds: [embeds.success(interaction, "♻️ Reset Terminé", 
                                `L'opération a été effectuée avec succès.\n` +
                                `📊 **Comptes impactés :** ${res.modifiedCount}`
                            )], 
                            components: [] 
                        });

                    } catch (error) {
                        console.error(error);
                        await btn.update({ content: "❌ Erreur base de données.", embeds: [], components: [] });
                    }
                    btnCollector.stop();
                    collector.stop();
                }
            });
        });

        collector.on('end', (c, r) => {
            if (r === 'time') interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};