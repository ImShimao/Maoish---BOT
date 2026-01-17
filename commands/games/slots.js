const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Joue à la machine à sous (Mise par défaut : 20€)')
        .addStringOption(option => 
            option.setName('mise')
                .setDescription('La somme à parier (ou "all")')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let user, replyFunc, getMessage, betInput;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;
        
        // --- CONFIGURATION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            betInput = args[0]; // Correction: args[0] car on a split le content avant
            replyFunc = async (payload) => {
                const { ephemeral, ...options } = payload; 
                return await interactionOrMessage.channel.send(options);
            };
            getMessage = async (msg) => msg;
        }

        // --- SÉCURITÉ PRISON ---
        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de casino pour toi.\nLibération dans : **${timeLeft} minutes**.`)],
                ephemeral: true 
            });
        }

        // --- GESTION DE LA MISE ---
        let bet = 20; // Mise par défaut

        if (betInput) {
            if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
                bet = userData.cash;
            } else {
                bet = parseInt(betInput);
            }
        }

        if (isNaN(bet) || bet <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide.")], ephemeral: true });
        
        // --- FONCTION DU JEU ---
        const playSlots = async () => {
            // On recharge les données pour avoir le solde à jour
            // ✅ Ajout de guildId
            const currentData = await eco.get(user.id, guildId);
            
            if (currentData.cash < bet) return null; // Pas assez d'argent

            // On retire la mise
            // ✅ Ajout de guildId
            await eco.addCash(user.id, guildId, -bet);

            const slots = ['🍇', '🍊', '🍐', '🍒', '🍋', '💎', '7️⃣'];
            const slot1 = slots[Math.floor(Math.random() * slots.length)];
            const slot2 = slots[Math.floor(Math.random() * slots.length)];
            const slot3 = slots[Math.floor(Math.random() * slots.length)];

            const isJackpot = (slot1 === slot2 && slot2 === slot3);
            const isTwo = (slot1 === slot2 || slot2 === slot3 || slot1 === slot3);

            let resultText, gain = 0;
            let embedResult;

            if (isJackpot) { 
                gain = Math.floor(bet * 10); // Jackpot x10
                // ✅ Ajout de guildId
                await eco.addCash(user.id, guildId, gain);
                
                resultText = `🚨 **JACKPOT !!!** 💰 +${gain} €`;
                // Embed Or (Jackpot)
                embedResult = embeds.success(interactionOrMessage, '🎰 Machine à sous', 
                    `Mise : ${bet} €\n\n╔══════════╗\n║ ${slot1} ║ ${slot2} ║ ${slot3} ║\n╚══════════╝\n\n${resultText}`
                ).setColor(0xFFD700);
            } 
            else if (isTwo) { 
                gain = Math.floor(bet * 2); // Paire x2
                // ✅ Ajout de guildId
                await eco.addCash(user.id, guildId, gain);

                resultText = `✨ **Paire !** +${gain} €`; 
                // Embed Orange (Paire)
                embedResult = embeds.warning(interactionOrMessage, '🎰 Machine à sous', 
                    `Mise : ${bet} €\n\n╔══════════╗\n║ ${slot1} ║ ${slot2} ║ ${slot3} ║\n╚══════════╝\n\n${resultText}`
                ).setColor(0xFFA500);
            } 
            else { 
                // Perdu -> Argent à la police du serveur
                // ✅ Ajout de guildId
                await eco.addBank('police_treasury', guildId, bet);
                
                resultText = "💀 Perdu..."; 
                // Embed Rouge (Perdu)
                embedResult = embeds.error(interactionOrMessage, 
                    `Mise : ${bet} €\n\n╔══════════╗\n║ ${slot1} ║ ${slot2} ║ ${slot3} ║\n╚══════════╝\n\n${resultText}`
                ).setTitle('🎰 Machine à sous');
            }

            const finalBalance = currentData.cash - bet + gain;
            embedResult.setFooter({ text: `Solde : ${finalBalance} €` });

            return embedResult;
        };

        // Premier lancé
        const firstEmbed = await playSlots();
        if (!firstEmbed) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez d'argent pour miser **${bet} €**.`)] });

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
                    await i.reply({ embeds: [embeds.error(interactionOrMessage, "Tu n'as plus assez d'argent !")], ephemeral: true });
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