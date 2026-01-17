const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('💥 Supprime et recrée ce salon (Nettoyage total)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interactionOrMessage) {
        const channel = interactionOrMessage.channel;
        const user = interactionOrMessage.user || interactionOrMessage.author;

        // --- GESTION HYBRIDE & SÉCURITÉ ---
        // Si c'est un message classique (+nuke), on vérifie les perms manuellement
        if (!interactionOrMessage.isCommand?.()) {
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu dois avoir la permission `Gérer les salons` pour faire ça.")] 
                });
            }
        }

        // --- ACTION ---
        try {
            // 1. On clone le salon avant de le supprimer pour garder les perms/topic/etc.
            // On ajoute une raison pour les logs du serveur (Audit Log)
            const position = channel.position;
            const newChannel = await channel.clone({ reason: `Nuke demandé par ${user.tag}` });
            
            // 2. On supprime l'ancien
            await channel.delete();
            
            // 3. On remet le nouveau à la bonne position (parfois Discord le met tout en bas sinon)
            await newChannel.setPosition(position);

            // 4. On envoie l'embed "NUKED" dans le nouveau salon
            // On utilise embeds.success pour avoir la structure de base, mais on override tout pour le style NUKE
            const embed = embeds.success(interactionOrMessage, '☢️ CHANNEL NUKED ☢️', `Ce salon a été nettoyé par ${user}.`)
                .setColor(0xFF0000) // Rouge pur
                .setImage('https://media.giphy.com/media/XUFPGrX5Zis6Y/giphy.gif'); // Gif d'explosion

            await newChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            // On ne peut pas répondre ici car le salon a peut-être été supprimé à moitié ou erreur API
        }
    }
};