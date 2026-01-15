const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Fait parler le bot (Admin uniquement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Sécurité Discord (Slash)
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Ce que le bot doit dire')
                .setRequired(true)),
            
    async execute(interactionOrMessage, args) {
        let text;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            text = interactionOrMessage.options.getString('message');
            
            // 1. Confirmation discrète (Ephémère)
            // On utilise l'embed success pour confirmer à l'admin que c'est fait
            await interactionOrMessage.reply({ 
                embeds: [embeds.success(interactionOrMessage, "Message envoyé", "Le bot a parlé.")],
                ephemeral: true 
            });

            // 2. Envoi du vrai message
            await interactionOrMessage.channel.send(text);

        } else {
            // Version Préfixe : +say <texte>
            
            // 🚨 SÉCURITÉ CRITIQUE : On vérifie que c'est un Admin
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Seuls les administrateurs peuvent utiliser cette commande.")] 
                });
            }

            if (!args || args.length === 0) return;
            text = args.join(' ');

            // Suppression du message de l'admin (+say ...) pour l'effet "fantomatique"
            try { 
                if (interactionOrMessage.deletable) await interactionOrMessage.delete(); 
            } catch (e) { 
                console.error("Impossible de supprimer le message :", e); 
            }

            await interactionOrMessage.channel.send(text);
        }
    }
};