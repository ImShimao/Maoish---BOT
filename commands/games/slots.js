const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Joue à la machine à sous')
        // MODIFICATION : Ajout de l'option de mise
        .addStringOption(option => 
            option.setName('mise')
                .setDescription('La somme à parier (ou "all"). Défaut: 20')
                .setRequired(false)),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage, betInput;
        
        // --- CONFIGURATION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            betInput = args[1];
            
            replyFunc = async (payload) => {
                const { ephemeral, ...options } = payload; 
                return await interactionOrMessage.channel.send(options);
            };
            getMessage = async (msg) => msg;
        }

        // --- SÉCURITÉ PRISON ---
        const userData = await eco.get(user.id);
        if (!userData) return replyFunc({ content: "❌ Erreur de profil.", ephemeral: true });

        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ content: `🔒 **Tu es en PRISON !** Pas de casino pour toi.\nLibération dans : **${timeLeft} minutes**.`, ephemeral: true });
        }

        // --- ANTI-SPAM ---
        if (cooldowns.has(user.id)) {
            const expirationTime = cooldowns.get(user.id) + 5000;
            const now = Date.now();
            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                return replyFunc({ content: `⏳ **Doucement !** Attends encore ${timeLeft}s.`, ephemeral: true });
            }
        }
        cooldowns.set(user.id, Date.now());
        setTimeout(() => cooldowns.delete(user.id), 5000);

        // --- GESTION DE LA MISE ---
        let bet = 20; // Mise par défaut

        if (betInput) {
            if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
                bet = userData.cash;
            } else {
                bet = parseInt(betInput);
            }
        }

        if (isNaN(bet) || bet <= 0) return replyFunc({ content: "❌ Mise invalide.", ephemeral: true });
        
        // --- 4. FONCTION DU JEU ---
        const playSlots = async () => {
            // On recharge les données pour avoir le solde à jour
            const currentData = await eco.get(user.id);
            
            if (currentData.cash < bet) return null; // Pas assez d'argent

            await eco.addCash(user.id, -bet);

            const slots = ['🍇', '🍊', '🍐', '🍒', '🍋', '💎', '7️⃣'];
            const slot1 = slots[Math.floor(Math.random() * slots.length)];
            const slot2 = slots[Math.floor(Math.random() * slots.length)];
            const slot3 = slots[Math.floor(Math.random() * slots.length)];

            const isJackpot = (slot1 === slot2 && slot2 === slot3);
            const isTwo = (slot1 === slot2 || slot2 === slot3 || slot1 === slot3);

            let resultText, color, gain = 0;

            if (isJackpot) { 
                gain = Math.floor(bet * 10); // Jackpot x10 (Plus généreux car risque plus élevé avec "all")
                resultText = `🚨 **JACKPOT !!!** 💰 +${gain} €`; 
                color = 0xFFD700; 
            } 
            else if (isTwo) { 
                gain = Math.floor(bet * 1.5); 
                resultText = `✨ **Paire !** +${gain} €`; 
                color = 0xFFA500; 
            } 
            else { 
                resultText = "💀 Perdu..."; 
                color = 0xFF0000; 
            }

            if (gain > 0) await eco.addCash(user.id, gain);

            const finalBalance = currentData.cash - bet + gain;

            return new EmbedBuilder()
                .setColor(color)
                .setTitle('🎰 Machine à sous')
                .setDescription(`Mise : ${bet} €\n\n╔══════════╗\n║ ${slot1} ║ ${slot2} ║ ${slot3} ║\n╚══════════╝\n\n${resultText}`)
                .setFooter({ text: `Solde : ${finalBalance} €` });
        };

        const firstEmbed = await playSlots();
        if (!firstEmbed) return replyFunc({ content: `❌ Tu n'as pas assez d'argent pour miser **${bet} €**.`, ephemeral: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('replay_slots').setLabel(`🎰 Relancer (${bet}€)`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stop_slots').setLabel('Arrêter').setStyle(ButtonStyle.Danger)
        );

        const response = await replyFunc({ embeds: [firstEmbed], components: [row], fetchReply: true });
        const message = await getMessage(response);
        if (!message) return;

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
                const newEmbed = await playSlots();
                
                if (!newEmbed) {
                    await i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
                    return collector.stop();
                }
                
                await i.update({ embeds: [newEmbed] });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                try {
                   if (interactionOrMessage.isCommand?.()) await interactionOrMessage.editReply({ components: [] });
                   else await message.edit({ components: [] });
                } catch (e) {}
            }
        });
    }
};