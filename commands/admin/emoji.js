const { SlashCommandBuilder, PermissionFlagsBits, parseEmoji } = require('discord.js');
const { default: axios } = require('axios');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Gérer les émojis du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        
        // --- SOUS-COMMANDE : AJOUTER ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Ajouter un nouvel émoji')
                .addStringOption(o => o.setName('source').setDescription('L\'émoji à voler ou l\'URL de l\'image').setRequired(true))
                .addStringOption(o => o.setName('nom').setDescription('Le nom de l\'émoji (Optionnel)')))
        
        // --- SOUS-COMMANDE : SUPPRIMER ---
        .addSubcommand(sub => 
            sub.setName('delete')
                .setDescription('Supprimer un émoji existant')
                .addStringOption(o => o.setName('cible').setDescription('L\'émoji à supprimer (Nom, ID, ou l\'émoji lui-même)').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // ====================================================
        // ➕ AJOUTER UN ÉMOJI
        // ====================================================
        if (sub === 'add') {
            const input = interaction.options.getString('source');
            const nameInput = interaction.options.getString('nom');
            
            let url, finalName;

            // 1. Analyse : Est-ce un émoji Discord ? (<:pepe:1234...>)
            const parsed = parseEmoji(input);

            if (parsed && parsed.id) {
                // C'est un émoji, on construit l'URL du CDN Discord
                url = `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? 'gif' : 'png'}`;
                finalName = nameInput || parsed.name;
            } 
            else if (input.startsWith('http')) {
                // C'est une URL
                url = input;
                finalName = nameInput || 'emoji_custom';

                // 2. Vérification Axios (Est-ce bien une image ?)
                try {
                    await interaction.deferReply(); // On diffère car la requête peut prendre 1-2s
                    const response = await axios.head(url);
                    const contentType = response.headers['content-type'];

                    if (!contentType || !contentType.startsWith('image/')) {
                        return interaction.editReply({ 
                            embeds: [embeds.error(interaction, "Ce n'est pas une image", "Le lien fourni ne semble pas être une image valide.")] 
                        });
                    }
                } catch (err) {
                    // Si on a déjà différé (deferReply), on doit utiliser editReply
                    const payload = { embeds: [embeds.error(interaction, "Lien inaccessible", "Impossible d'accéder à cette URL.")] };
                    return interaction.deferred ? interaction.editReply(payload) : interaction.reply(payload);
                }
            } else {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Format invalide", "Merci de fournir un émoji valide ou un lien HTTP.")], 
                    ephemeral: true 
                });
            }

            // 3. Nettoyage du nom (Alphanumérique + underscore uniquement)
            if (finalName.length > 32) finalName = finalName.substring(0, 32);
            finalName = finalName.replace(/[^a-zA-Z0-9_]/g, '_');

            // 4. Création
            try {
                // ✅ CORRECTION ICI : On n'appelle la création qu'une seule fois
                const emoji = await interaction.guild.emojis.create({ attachment: url, name: finalName });

                const embed = embeds.success(interaction, 'Emoji ajouté !', `L'émoji ${emoji} (**${emoji.name}**) a été ajouté au serveur.`)
                    .setThumbnail(url);

                if (interaction.deferred) return interaction.editReply({ embeds: [embed] });
                return interaction.reply({ embeds: [embed] });

            } catch (error) {
                let errorMsg = "Erreur inconnue.";
                if (error.code === 50035) errorMsg = "L'image est trop lourde (Max 256kb).";
                if (error.code === 30008) errorMsg = "Le serveur a atteint la limite d'émojis !";
                if (error.code === 50013) errorMsg = "Je n'ai pas la permission `Gérer les émojis`.";

                const payload = { embeds: [embeds.error(interaction, "Echec", errorMsg)] };
                if (interaction.deferred) return interaction.editReply(payload);
                return interaction.reply(payload);
            }
        }

        // ====================================================
        // 🗑️ SUPPRIMER UN ÉMOJI
        // ====================================================
        if (sub === 'delete') {
            const target = interaction.options.getString('cible');
            let emojiToDelete;

            // 1. Recherche par ID ou Format (<:nom:id>)
            const parsed = parseEmoji(target);
            if (parsed && parsed.id) {
                emojiToDelete = interaction.guild.emojis.resolve(parsed.id);
            }

            // 2. Recherche par Nom ou ID brut
            if (!emojiToDelete) {
                emojiToDelete = interaction.guild.emojis.cache.find(e => e.id === target || e.name === target);
            }

            if (!emojiToDelete) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Introuvable", "Je ne trouve pas cet émoji sur ce serveur.")], 
                    ephemeral: true 
                });
            }

            // 3. Suppression
            try {
                const name = emojiToDelete.name;
                const url = emojiToDelete.url; // On garde l'image pour l'embed
                await emojiToDelete.delete();

                const embed = embeds.success(interaction, 'Emoji supprimé', `L'émoji **${name}** a été supprimé.`)
                    .setThumbnail(url);
                
                return interaction.reply({ embeds: [embed] });

            } catch (error) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Erreur", "Je n'ai pas pu supprimer cet émoji (Probablement un problème de permissions).")], 
                    ephemeral: true 
                });
            }
        }
    }
};