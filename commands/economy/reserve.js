const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reserve')
        .setDescription('Affiche le contenu du coffre de la Police Fédérale'),

    async execute(interactionOrMessage) {
        // --- GESTION HYBRIDE ---
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { const { ephemeral, ...o } = p; return interactionOrMessage.channel.send(o); };

        // On récupère le compte spécial "police_treasury"
        const treasury = await eco.get('police_treasury');
        const amount = treasury.bank || 0;

        // Seuil pour braquer (doit correspondre à ton fichier braquage.js)
        const minHeist = 10000; 

        // Petite logique de présentation
        let status = "";
        let color = 0x3498DB; // Bleu Police par défaut

        if (amount < minHeist) {
            status = "🔒 **Sécurisée & Vide**\n*Il n'y a pas assez d'argent pour risquer un braquage.*";
            color = 0x95A5A6; // Gris (Pas intéressant)
        } else {
            status = "⚠️ **CIBLE PRIORITAIRE**\n*Le coffre est plein à craquer ! Préparez le C4 !*";
            color = 0xF1C40F; // Or (Intéressant)
        }

        const embed = new EmbedBuilder()
            .setTitle('🏦 Réserve Fédérale')
            .setColor(color)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2502/2502753.png') // Icône coffre-fort
            .addFields(
                { name: '💰 Fonds Saisis', value: `**${amount.toLocaleString()} €**`, inline: false },
                { name: '📊 État du Coffre', value: status, inline: false }
            )
            .setFooter({ text: "L'argent des amendes (Crime, Hack, Rob) atterrit ici." });

        return replyFunc({ embeds: [embed] });
    }
};