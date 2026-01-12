const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Travaille pour gagner un salaire'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        const userData = await eco.get(user.id);
        const now = Date.now();

        if (userData.jailEnd > now) {
            return replyFunc(`🔒 Travaille ton éducation en prison d'abord.`);
        }

        if (userData.cooldowns.work > now) {
            const timeLeft = Math.ceil((userData.cooldowns.work - now) / 60000);
            return replyFunc(`😫 **Fatigué !** Repose-toi encore **${timeLeft} minutes**.`);
        }

        const salary = Math.floor(Math.random() * 150) + 50;
        const jobs = ["Nettoyage 🚽", "Service VIP 🍸", "Sécurité 👮", "Comptabilité 🪙"];
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        userData.cash += salary;
        userData.cooldowns.work = now + (config.COOLDOWNS.WORK || 1800000);
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.SUCCESS)
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setDescription(`**${job}**\n\nSalaire : **+${salary} €**`)
            .setFooter({ text: config.FOOTER_TEXT || config.FOOTER });

        await replyFunc({ embeds: [embed] });
    }
};