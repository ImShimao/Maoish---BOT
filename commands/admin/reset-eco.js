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
                    label: 'TOUTE l\'économie',
                    description: 'Supprime l\'Argent ET les Inventaires.',
                    value: 'all_eco',
                    emoji: '📉'
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

            // --- 3. DEMANDE DE CONFIRMATION (Bouton Rouge) ---
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
            else if (choice === 'all_eco') {
                confirmMsg = "Tu vas supprimer **TOUTE L'ÉCONOMIE (Argent + Items)**.";
                updateQuery = { cash: 0, bank: 0, inventory: {} };
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