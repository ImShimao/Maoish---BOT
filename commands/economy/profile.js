const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Affiche ton identité, ton équipement et tes stats')
        .addUserOption(o => o.setName('user').setDescription('Voir le profil d\'un membre')),

    async execute(interactionOrMessage) {
        // Gestion hybride (Slash / Message)
        const target = interactionOrMessage.options?.getUser('user') || interactionOrMessage.user || interactionOrMessage.author;
        
        // On récupère les données
        const data = await eco.get(target.id);
        
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        // --- CALCULS XP ---
        const nextLevelXP = data.level * 500;
        // Barre de progression visuelle (10 blocs)
        const percent = Math.min(Math.max(data.xp / nextLevelXP, 0), 1);
        const progress = Math.floor(percent * 10);
        const progressBar = "🟩".repeat(progress) + "⬜".repeat(10 - progress);

        // --- ÉQUIPEMENT (Vérification inventaire) ---
        const tools = [];
        if (data.inventory.get('pickaxe')) tools.push('⛏️ Pioche');
        if (data.inventory.get('fishing_rod')) tools.push('🎣 Canne');
        if (data.inventory.get('rifle')) tools.push('🔫 Fusil');
        if (data.inventory.get('shovel')) tools.push('🥄 Pelle'); // J'ai ajouté la pelle si tu l'as
        if (data.inventory.get('laptop')) tools.push('💻 Laptop');
        if (data.inventory.get('lockpick')) tools.push('🔓 Crochet'); // Et le crochet

        // --- STATISTIQUES ---
        // On utilise || 0 pour éviter d'afficher "undefined" si la stat est nouvelle
        const s = data.stats || {};
        const statsDisplay = 
            `🐟 Pêches : **${s.fish || 0}**\n` +
            `⛏️ Mines : **${s.mine || 0}**\n` +
            `🔫 Chasses : **${s.hunts || 0}**\n` +
            `🏺 Fouilles : **${s.digs || 0}**\n` + 
            `🥺 Mendiant : **${s.begs || 0}**\n` +
            `💻 Hacks : **${s.hacks || 0}**\n` +
            `😈 Crimes : **${s.crimes || 0}**\n` +
            `💼 Travail : **${s.works || 0}**`;

        const embed = new EmbedBuilder()
            .setColor(config.COLORS?.MAIN || 0x0099FF)
            .setTitle(`👤 Profil de ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🎖️ Niveau', value: `Niveau **${data.level}**\n${progressBar} (${data.xp}/${nextLevelXP} XP)`, inline: false },
                { name: '💍 Union', value: data.partner ? `Marié(e) à <@${data.partner}>` : 'Célibataire', inline: true },
                { name: '🎒 Équipement', value: tools.length > 0 ? tools.join('\n') : '*Aucun outil*', inline: true },
                { name: '📊 Statistiques', value: statsDisplay, inline: false }
            )
            .setFooter({ text: 'Finances disponibles via /bank' });

        replyFunc({ embeds: [embed] });
    }
};