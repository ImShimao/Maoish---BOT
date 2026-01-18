const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../config'); // ✅ On pointe vers config.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverlist')
        .setDescription('Liste des serveurs (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // ✅ Vérification sécurisée via config.js
        if (interaction.user.id !== config.OWNER_ID) {
            return interaction.reply({ 
                embeds: [embeds.error(interaction, 'Accès Refusé', 'Cette commande est réservée au développeur.')],
                ephemeral: true 
            });
        }

        const guilds = interaction.client.guilds.cache;
        
        // On limite l'affichage pour éviter les erreurs (max 4096 caractères dans une description)
        const displayLimit = 25;
        const list = guilds.map(g => `• **${g.name}** | \`${g.memberCount}\` membres | ID: \`${g.id}\``)
                           .slice(0, displayLimit)
                           .join('\n');
        
        const embed = embeds.info(interaction, 'Liste des Serveurs', `Total : **${guilds.size}** serveurs\n\n${list}`);
        
        if (guilds.size > displayLimit) {
            embed.setFooter({ text: `Et ${guilds.size - displayLimit} autres serveurs...` });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};