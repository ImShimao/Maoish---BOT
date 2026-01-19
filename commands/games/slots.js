const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js');

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
        const guildId = interactionOrMessage.guild.id;
        
        // --- CONFIGURATION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            betInput = args[0];
            replyFunc = async (payload) => {
                const { ephemeral, ...options } = payload; 
                return await interactionOrMessage.channel.send(options);
            };
            getMessage = async (msg) => msg;
        }

        // --- SÉCURITÉ PRISON ---
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
            // Re-vérification du solde à chaque lancé
            const currentData = await eco.get(user.id, guildId);
            if (currentData.cash < bet) return null; // Signal d'arrêt (fonds insuffisants)

            // 1. On retire la mise
            await eco.addCash(user.id, guildId, -bet);

            // 2. Tirage (Pondéré ? Non, full random pour l'instant)
            const slots = ['🍇', '🍊', '🍒', '🍋', '💎', '🔔', '7️⃣'];
            const r = () => slots[Math.floor(Math.random() * slots.length)];
            
            const s1 = r();
            const s2 = r();
            const s3 = r();

            // 3. Calcul des Gains
            let gain = 0;
            let message = "";
            let color = 0x2B2D31; // Gris (Perdu)

            // A. JACKPOT ROYAL (777) -> x50
            if (s1 === '7️⃣' && s2 === '7️⃣' && s3 === '7️⃣') {
                gain = bet * 50;
                message = "🚨 **JACKPOT ROYAL !!!** (x50)";
                color = 0xFFD700; // Or
            }
            // B. TRIPLE FRUITS -> x5
            else if (s1 === s2 && s2 === s3) {
                gain = bet * 5;
                message = "🔥 **SUPER ! 3 IDENTIQUES !** (x5)";
                color = 0x2ECC71; // Vert
            }
            // C. PAIRE -> x2
            else if (s1 === s2 || s2 === s3 || s1 === s3) {
                gain = bet * 2;
                message = "✅ **Paire !** (x2)";
                color = 0x3498DB; // Bleu
            }
            // D. PERDU
            else {
                // L'argent perdu va dans la caisse de police (taxe casino)
                await eco.addBank('police_treasury', guildId, Math.floor(bet * 0.5));
                message = "💀 **Perdu...**";
                color = 0xE74C3C; // Rouge
            }

            // 4. Paiement
            if (gain > 0) await eco.addCash(user.id, guildId, gain);

            // 5. Construction de l'Embed Visuel
            const finalBalance = currentData.cash - bet + gain;
            
            const machineVisual = `
            ╔═════════════╗
            ║ 🎰 **SLOTS** 🎰 ║
            ╠═════════════╣
            ║  ${s1}  |  ${s2}  |  ${s3}  ║
            ╠═════════════╣
            ║      🔴      ║
            ╚═════════════╝`;

            const embed = embeds.info(interactionOrMessage, '🎰 Machine à Sous', 
                `${machineVisual}\n\n` +
                `💸 Mise : **${bet.toLocaleString('fr-FR')} €**\n` +
                `${message}\n` +
                `💰 Gain : **${gain.toLocaleString('fr-FR')} €**`
            ).setColor(color).setFooter({ text: `Solde : ${finalBalance.toLocaleString('fr-FR')} €` });

            return embed;
        };

        // --- PREMIER LANCÉ ---
        const firstEmbed = await playSlots();
        if (!firstEmbed) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez d'argent pour miser **${bet} €**.`)] });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('replay_slots').setLabel(`🎰 Relancer (${bet}€)`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stop_slots').setLabel('Arrêter').setStyle(ButtonStyle.Secondary)
        );

        const response = await replyFunc({ embeds: [firstEmbed], components: [row], fetchReply: true });
        const message = await getMessage(response);
        if (!message) return;

        // --- COLLECTOR (Rejouer) ---
        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'stop_slots') {
                await i.update({ content: '✅ Partie terminée.', components: [] });
                return collector.stop();
            }
            
            if (i.customId === 'replay_slots') {
                const newEmbed = await playSlots();
                
                if (!newEmbed) {
                    await i.reply({ embeds: [embeds.error(interactionOrMessage, "Fonds insuffisants !", "Tu es à sec mon pote.")], ephemeral: true });
                    await i.message.edit({ components: [] }); // On retire les boutons car il ne peut plus jouer
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