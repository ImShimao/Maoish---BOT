const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild'); // Ton modèle Mongoose
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Système d\'avertissements complet')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        // 1. ADD
        .addSubcommand(sub => 
            sub.setName('add')
               .setDescription('Donner un avertissement à un membre')
               .addUserOption(opt => opt.setName('membre').setDescription('Le membre à avertir').setRequired(true))
               .addStringOption(opt => opt.setName('raison').setDescription('La raison du warn').setRequired(true)))
        // 2. LIST
        .addSubcommand(sub => 
            sub.setName('list')
               .setDescription('Voir le casier judiciaire d\'un membre')
               .addUserOption(opt => opt.setName('membre').setDescription('Le membre').setRequired(true)))
        // 3. REMOVE
        .addSubcommand(sub => 
            sub.setName('remove')
               .setDescription('Retirer un avertissement spécifique')
               .addUserOption(opt => opt.setName('membre').setDescription('Le membre concerné').setRequired(true))
               .addIntegerOption(opt => opt.setName('numero').setDescription('Le numéro du warn (voir /warn list)').setRequired(true)))
        // 4. CLEAR
        .addSubcommand(sub => 
            sub.setName('clear')
               .setDescription('Supprimer TOUS les avertissements d\'un membre')
               .addUserOption(opt => opt.setName('membre').setDescription('Le membre à nettoyer').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('membre');
        
        // --- 1. CHARGEMENT DB ---
        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) {
            guildData = new Guild({ guildId: interaction.guild.id });
            await guildData.save();
        }

        // ==========================================
        // 🔴 SUBCOMMAND : ADD
        // ==========================================
        if (sub === 'add') {
            const reason = interaction.options.getString('raison');
            
            // Création de l'objet warn
            const newWarn = {
                userId: target.id,
                reason: reason,
                moderatorId: interaction.user.id,
                date: Date.now()
            };

            // Ajout et Sauvegarde
            guildData.warns.push(newWarn);
            await guildData.save();

            // DM au membre (Try/Catch pour éviter le crash si MP fermés)
            try { 
                await target.send({
                    embeds: [embeds.warning(interaction, `Avertissement reçu sur ${interaction.guild.name}`, `**Raison :** ${reason}\n**Modérateur :** ${interaction.user.tag}`)]
                });
            } catch(e) { /* MP bloqués, tant pis */ }

            // Réponse publique
            const embed = embeds.warning(interaction, 'Membre Averti', null)
                .addFields(
                    { name: '👤 Membre', value: `${target} (\`${target.id}\`)`, inline: true },
                    { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
                    { name: '📝 Raison', value: reason, inline: false }
                );

            return interaction.reply({ embeds: [embed] });
        }

        // ==========================================
        // 📜 SUBCOMMAND : LIST
        // ==========================================
        if (sub === 'list') {
            // Filtrage des warns du membre
            const userWarns = guildData.warns.filter(w => w.userId === target.id);
            
            if (userWarns.length === 0) {
                return interaction.reply({ 
                    embeds: [embeds.info(interaction, `Casier vierge`, `✅ **${target.tag}** n'a aucun avertissement. Bravo !`)]
                });
            }

            // Construction de la liste
            let descriptionList = userWarns.map((w, index) => {
                const date = `<t:${Math.floor(w.date/1000)}:d>`; // Format : 27/11/2025
                return `**#${index + 1}** • ${date} • <@${w.moderatorId}>\n└ *${w.reason}*`;
            }).join('\n\n');

            // Embed Info
            const embed = embeds.info(interaction, `Casier de ${target.username}`, descriptionList)
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: `Total : ${userWarns.length} avertissement(s)` });
            
            return interaction.reply({ embeds: [embed] });
        }

        // ==========================================
        // 🗑️ SUBCOMMAND : REMOVE
        // ==========================================
        if (sub === 'remove') {
            const indexToRemove = interaction.options.getInteger('numero') - 1; // -1 car l'humain compte à partir de 1
            const userWarns = guildData.warns.filter(w => w.userId === target.id);
            
            // Validation
            if (indexToRemove < 0 || indexToRemove >= userWarns.length) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Introuvable", `Ce numéro de warn n'existe pas. Fais \`/warn list\` pour vérifier.`)],
                    ephemeral: true 
                });
            }

            // Suppression logique
            // On retrouve l'objet exact dans le tableau global pour le supprimer
            const warnToDelete = userWarns[indexToRemove];
            const globalIndex = guildData.warns.indexOf(warnToDelete);
            
            if (globalIndex > -1) {
                guildData.warns.splice(globalIndex, 1);
                await guildData.save();
                
                return interaction.reply({ 
                    embeds: [embeds.success(interaction, "Avertissement retiré", `Le warn **#${indexToRemove + 1}** de **${target.tag}** a été supprimé.\nRaison originale : *${warnToDelete.reason}*`)]
                });
            } else {
                return interaction.reply({ embeds: [embeds.error(interaction, "Erreur interne", "Impossible de retrouver ce warn dans la base.")], ephemeral: true });
            }
        }

        // ==========================================
        // ☢️ SUBCOMMAND : CLEAR
        // ==========================================
        if (sub === 'clear') {
            const originalLength = guildData.warns.length;
            
            // On garde tout ce qui n'est PAS à l'utilisateur cible
            guildData.warns = guildData.warns.filter(w => w.userId !== target.id);
            
            const deletedCount = originalLength - guildData.warns.length;
            
            if (deletedCount === 0) {
                return interaction.reply({ 
                    embeds: [embeds.warning(interaction, "Déjà propre", `**${target.tag}** n'avait aucun avertissement à supprimer.`)],
                    ephemeral: true 
                });
            }

            await guildData.save();
            
            return interaction.reply({ 
                embeds: [embeds.success(interaction, "Casier nettoyé", `🧹 J'ai supprimé **${deletedCount}** avertissements pour **${target.tag}**.`)]
            });
        }
    }
};