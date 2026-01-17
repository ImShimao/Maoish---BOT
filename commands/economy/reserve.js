const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reserve')
        .setDescription('Affiche le contenu et l\'état de sécurité de la Réserve Fédérale'),

    async execute(interactionOrMessage) {
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { const { ephemeral, ...o } = p; return interactionOrMessage.channel.send(o); };

        // Récupération des données
        // ✅ On cherche le compte 'police_treasury' SPÉCIFIQUE À CE SERVEUR
        const treasury = await eco.get('police_treasury', guildId);
        
        // Sécurité : Si le compte n'existe pas encore (nouveau serveur), il a 0€
        const amount = treasury ? treasury.bank : 0;

        // Configuration des seuils
        const minHeist = 10000;          
        const maxCapacity = 1000000000;  // 1 Milliard

        // Calcul de la barre de progression
        const percentage = Math.min((amount / maxCapacity) * 100, 100);
        const progress = Math.round(percentage / 10); // Sur 10 segments
        const emptyProgress = 10 - progress;
        const progressBar = '🟩'.repeat(progress) + '⬛'.repeat(emptyProgress);

        // Logique d'état
        let statusText = "";
        let statusEmoji = "";
        let color = 0x3498DB; 
        let footerText = "Capacité Maximale du Coffre : 1 Milliard €";

        if (amount >= maxCapacity) {
            statusText = "PLEIN À CRAQUER (MAX)";
            statusEmoji = "💰";
            color = 0x2ECC71; // Vert
            footerText = "Le coffre est plein ! L'argent excédentaire est brûlé.";
        } else if (amount < minHeist) {
            statusText = "SÉCURISÉ (Fonds Insuffisants)";
            statusEmoji = "🔒";
            color = 0x95A5A6; // Gris
            footerText = "Le coffre est presque vide, inutile de tenter quoi que ce soit.";
        } else if (amount < maxCapacity * 0.5) {
            statusText = "VULNÉRABLE (Niveau Moyen)";
            statusEmoji = "⚠️";
            color = 0xF1C40F; // Jaune
        } else {
            statusText = "CRITIQUE (Cible Prioritaire)";
            statusEmoji = "🚨";
            color = 0xE74C3C; // Rouge
            footerText = "ALERTE GÉNÉRALE : RISQUE DE BRAQUAGE IMMINENT.";
        }

        // Création de l'embed avec l'usine (base info + modifs)
        const embed = embeds.info(interactionOrMessage, '🏛️ RÉSERVE FÉDÉRALE', `*Système de surveillance v4.0 - Accès autorisé*`)
            .setColor(color)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2502/2502753.png')
            .addFields(
                { 
                    name: '💵 Fonds Actuels', 
                    value: `\`\`\`css\n${amount.toLocaleString('fr-FR')} € / ${maxCapacity.toLocaleString('fr-FR')} €\`\`\``, 
                    inline: false 
                },
                { 
                    name: `${statusEmoji} État de Sécurité`, 
                    value: `**${statusText}**`, 
                    inline: true 
                },
                { 
                    name: '📊 Remplissage', 
                    value: `${progressBar} **${percentage.toFixed(2)}%**`, 
                    inline: true 
                }
            )
            .setFooter({ text: footerText, iconURL: 'https://cdn-icons-png.flaticon.com/512/925/925748.png' });

        return replyFunc({ embeds: [embed] });
    }
};