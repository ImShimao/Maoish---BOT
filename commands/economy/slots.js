const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Joue à la machine à sous'),

    async execute(interactionOrMessage) {
        let user, replyFunc;
        
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // 1. Vérif Prison (CORRIGÉ)
        if (await eco.isJailed(user.id)) {
            const userData = await eco.get(user.id);
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }

        const playSlots = () => {
            const slots = ['🍇', '🍊', '🍐', '🍒', '🍋', '💎', '7️⃣'];
            const slot1 = slots[Math.floor(Math.random() * slots.length)];
            const slot2 = slots[Math.floor(Math.random() * slots.length)];
            const slot3 = slots[Math.floor(Math.random() * slots.length)];

            const isJackpot = (slot1 === slot2 && slot2 === slot3);
            const isTwo = (slot1 === slot2 || slot2 === slot3 || slot1 === slot3);

            let resultText, color;

            if (isJackpot) { resultText = "🚨 **JACKPOT !!!** 💰💰💰"; color = 0xFFD700; } 
            else if (isTwo) { resultText = "✨ Pas mal ! Double paire."; color = 0xFFA500; } 
            else { resultText = "💀 Perdu..."; color = 0xFF0000; }

            return new EmbedBuilder()
                .setColor(color)
                .setTitle('🎰 Machine à sous')
                .setDescription(`╔══════════╗\n║ ${slot1} ║ ${slot2} ║ ${slot3} ║\n╚══════════╝\n${resultText}`)
                .setFooter({ text: `Joueur : ${user.username}` });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('replay_slots').setLabel('🎰 Relancer').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stop_slots').setLabel('Arrêter').setStyle(ButtonStyle.Danger)
        );

        const message = await replyFunc({ embeds: [playSlots()], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'stop_slots') {
                await i.update({ content: '✅ Casino fermé.', components: [] });
                return collector.stop();
            }
            await i.update({ embeds: [playSlots()] });
        });
    }
};