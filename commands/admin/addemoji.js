const { SlashCommandBuilder, PermissionFlagsBits, parseEmoji } = require('discord.js');
const { default: axios } = require('axios'); // ✅ Import d'Axios pour vérifier les liens
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addemoji')
        .setDescription('Ajoute un emoji au serveur via un lien ou un autre emoji')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addStringOption(option => 
            option.setName('emoji')
                .setDescription('L\'emoji à voler ou l\'URL de l\'image')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Le nom du nouvel emoji (Optionnel)')),

    async execute(interactionOrMessage, args) {
        let input, nameInput, replyFunc;

        // --- GESTION HYBRIDE (Slash / Prefix) ---
        if (interactionOrMessage.isCommand?.()) {
            input = interactionOrMessage.options.getString('emoji');
            nameInput = interactionOrMessage.options.getString('nom');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Permissions manuelles pour le prefixe
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu dois avoir la permission `Gérer les émojis`.")] 
                });
            }
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Utilisation : `+addemoji <emoji ou url> [nom]`")] 
                });
            }
            input = args[0];
            nameInput = args[1] || null;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        let url, finalName;

        // --- ANALYSE DE L'ENTRÉE ---
        const parsed = parseEmoji(input);

        // Cas 1 : Emoji Custom (<:pepe:123456...>)
        if (parsed && parsed.id) {
            url = `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? 'gif' : 'png'}`;
            finalName = nameInput || parsed.name;
        } 
        // Cas 2 : URL (http...)
        else if (input.startsWith('http')) {
            url = input;
            finalName = nameInput || 'emoji_custom';

            // 🛡️ SÉCURITÉ : VÉRIFICATION DU TYPE DE FICHIER
            try {
                // On fait une requête légère pour voir les headers du lien
                const response = await axios.head(url);
                const contentType = response.headers['content-type'];

                // Si ce n'est pas une image, on stoppe tout
                if (!contentType || !contentType.startsWith('image/')) {
                    return replyFunc({ 
                        embeds: [embeds.error(interactionOrMessage, "Ce n'est pas une image !", 
                        "Le lien fourni renvoie vers une **page web** (HTML) et non une image.\n\n👉 **Solution :** Fais `Clic Droit` sur l'image > `Copier l'adresse de l'image`.")] 
                    });
                }
            } catch (err) {
                // Si le lien est inaccessible, on prévient
                return replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, "Lien inaccessible", "Je n'arrive pas à accéder à cette URL. Vérifie le lien.")] 
                });
            }

        } else {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Format invalide", "Fournis un emoji custom ou une URL d'image valide.")] 
            });
        }

        // --- NETTOYAGE DU NOM ---
        if (finalName.length > 32) finalName = finalName.substring(0, 32);
        finalName = finalName.replace(/[^a-zA-Z0-9_]/g, '_');

        // --- CRÉATION ---
        try {
            const emoji = await interactionOrMessage.guild.emojis.create({ attachment: url, name: finalName });
            
            const embed = embeds.success(interactionOrMessage, 'Emoji ajouté !', `L'emoji ${emoji} (**${emoji.name}**) a été ajouté.`)
                .setThumbnail(url);

            return replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error); // Garde le log serveur pour le debug

            let errorMsg = "Une erreur inconnue est survenue.";
            
            // Gestion des erreurs Discord spécifiques
            if (error.code === 50046) errorMsg = "Format de fichier invalide (Probablement une page Web au lieu d'une image).";
            if (error.code === 50035) errorMsg = "L'image est trop lourde (Max 256kb) ou corrompue.";
            if (error.code === 30008) errorMsg = "Plus de place pour les émojis sur ce serveur !";
            if (error.code === 50013) errorMsg = "Je n'ai pas la permission `Gérer les émojis`.";

            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Echec de l'ajout", errorMsg)] 
            });
        }
    }
};