const { SlashCommandBuilder, PermissionFlagsBits, parseEmoji } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

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

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            input = interactionOrMessage.options.getString('emoji');
            nameInput = interactionOrMessage.options.getString('nom');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Prefix : +addemoji <emoji/url> [nom]
            // On vérifie les permissions MANUELLEMENT pour le préfixe
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu dois avoir la permission `Gérer les émojis` pour faire ça.")] 
                });
            }

            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Utilisation : `+addemoji <emoji ou url> [nom]`")] 
                });
            }

            input = args[0];
            nameInput = args[1] || null; // Le deuxième mot sera le nom si présent
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        let url, finalName;

        // --- ANALYSE DE L'ENTRÉE ---
        const parsed = parseEmoji(input);

        // Cas 1 : C'est un emoji custom Discord (<:pepe:123456...>)
        if (parsed && parsed.id) {
            url = `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? 'gif' : 'png'}`;
            finalName = nameInput || parsed.name; // Si pas de nom fourni, on garde l'original
        } 
        // Cas 2 : C'est une URL directe (http...)
        else if (input.startsWith('http')) {
            url = input;
            finalName = nameInput || 'emoji_custom';
        } 
        else {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Format invalide", "Merci de fournir un **Emoji Custom** ou une **URL d'image valide**.")] 
            });
        }

        // --- NETTOYAGE DU NOM ---
        // Discord limite les noms d'emojis à 32 caractères et alphanumeric + underscore
        if (finalName.length > 32) finalName = finalName.substring(0, 32);
        finalName = finalName.replace(/[^a-zA-Z0-9_]/g, '_'); // Remplace les caractères spéciaux par _

        // --- CRÉATION ---
        try {
            const emoji = await interactionOrMessage.guild.emojis.create({ attachment: url, name: finalName });
            
            // Embed Succès avec l'image en thumbnail
            const embed = embeds.success(interactionOrMessage, 'Emoji ajouté !', `L'emoji ${emoji} (**${emoji.name}**) a été ajouté au serveur.`)
                .setThumbnail(url);

            return replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            
            let errorMsg = "Une erreur inconnue est survenue.";
            // Erreurs Discord courantes
            if (error.code === 50035) errorMsg = "L'image est trop lourde (Max 256kb) ou le format est invalide.";
            if (error.code === 30008) errorMsg = "Le serveur a atteint sa limite d'emojis.";
            if (error.code === 50013) errorMsg = "Je n'ai pas la permission `Gérer les émojis` pour faire ça.";

            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Echec de l'ajout", errorMsg)] 
            });
        }
    }
};