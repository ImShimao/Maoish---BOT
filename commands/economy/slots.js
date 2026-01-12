const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Joue à la machine à sous'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        // 1. Vérif Prison
        if (eco.isJailed(user.id)) {
            const timeLeft = Math.ceil((eco.get(user.id).jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }
        
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // --- FONCTION DU JEU ---
        const playSlots = () => {
            const slots = ['🍇', '🍊', '🍐', '🍒', '🍋', '💎', '7️⃣'];
            const slot1 = slots[Math.floor(Math.random() * slots.length)];
            const slot2 = slots[Math.floor(Math.random() * slots.length)];
            const slot3 = slots[Math.floor(Math.random() * slots.length)];

            const isJackpot = (slot1 === slot2 && slot2 === slot3);
            const isTwo = (slot1 === slot2 || slot2 === slot3 || slot1 === slot3);

            let resultText, color;

            if (isJackpot) {
                resultText = "🚨 **JACKPOT !!!** 💰💰💰";
                color = 0xFFD700; // Or
            } else if (isTwo) {
                resultText = "✨ Pas mal ! Double paire.";
                color = 0xFFA500; // Orange
            } else {
                resultText = "💀 Perdu...";
                color = 0xFF0000; // Rouge
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle('🎰 Machine à sous')
                .setDescription(`
                ╔══════════╗
                ║ ${slot1} ║ ${slot2} ║ ${slot3} ║
                ╚══════════╝
                
                ${resultText}`)
                .setFooter({ text: `Joueur : ${user.username}` });

            return embed;
        };

        // Bouton Rejouer
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('replay_slots').setLabel('🎰 Relancer').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stop_slots').setLabel('Arrêter').setStyle(ButtonStyle.Danger)
        );

        // Envoi initial
        const message = await replyFunc({ embeds: [playSlots()], components: [row], fetchReply: true });

        // Collector
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

            if (i.customId === 'replay_slots') {
                await i.update({ embeds: [playSlots()] });
            }
        });

        collector.on('end', async (c, r) => {
            if (r !== 'user') try { await message.edit({ components: [] }); } catch(e){}
        });
    }
};