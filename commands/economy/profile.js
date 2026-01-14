const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Affiche ton identité, ton équipement et tes stats')
        .addUserOption(o => o.setName('user').setDescription('Voir le profil d\'un membre')),

    async execute(interactionOrMessage) {
        const target = interactionOrMessage.options?.getUser('user') || interactionOrMessage.user || interactionOrMessage.author;
        const data = await eco.get(target.id);
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        // --- CALCULS XP ---
        const nextLevelXP = data.level * 500;
        const progressBar = "🟩".repeat(Math.floor((data.xp / nextLevelXP) * 10)) + "⬜".repeat(10 - Math.floor((data.xp / nextLevelXP) * 10));

        // --- ÉQUIPEMENT (Vérification inventaire) ---
        const tools = [];
        if (data.inventory.get('pickaxe')) tools.push('⛏️ Pioche');
        if (data.inventory.get('fishing_rod')) tools.push('🎣 Canne');
        if (data.inventory.get('rifle')) tools.push('🔫 Fusil');
        if (data.inventory.get('laptop')) tools.push('💻 Laptop');
        if (data.inventory.get('shield')) tools.push('🛡️ Bouclier');

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.MAIN)
            .setTitle(`👤 Profil de ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🎖️ Niveau', value: `Niveau **${data.level}**\n${progressBar} (${data.xp}/${nextLevelXP} XP)`, inline: false },
                { name: '💍 Union', value: data.partner ? `Marié(e) à <@${data.partner}>` : 'Célibataire', inline: true },
                { name: '🎒 Équipement', value: tools.length > 0 ? tools.join('\n') : '*Aucun outil*', inline: true },
                { name: '📊 Statistiques', value: 
                    `🐟 Pêches : **${data.stats.fish}**\n` +
                    `⛏️ Mines : **${data.stats.mine}**\n` +
                    `🔫 Chasses : **${data.stats.hunts}**\n` +
                    `😈 Crimes : **${data.stats.crimes}**`, 
                    inline: false 
                }
            )
            .setFooter({ text: 'Finances disponibles via /bank' });

        replyFunc({ embeds: [embed] });
    }
};