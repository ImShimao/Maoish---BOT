const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Joue à la machine à sous (Coût: 20€)'),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage;
        
        // --- GESTION HYBRIDE (SLASH / PREFIX) ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
            // CORRECTIF CRASH : On force la récupération du message via withResponse()
            getMessage = async () => await interactionOrMessage.withResponse();
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
            // Pour les commandes classiques, send() renvoie déjà le message
            getMessage = async (msg) => msg;
        }

        // 1. Vérif Prison
        const userData = await eco.get(user.id); // Correction: On récupère userData avant
        if (userData.jailEnd > Date.now()) { // Correction: Vérification date vs maintenant
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc(`🔒 **Tu es en PRISON !** Pas de casino pour toi (Encore ${timeLeft} min).`);
        }

        const betPrice = 20;

        // Fonction du jeu
        const playSlots = async () => {
            const currentData = await eco.get(user.id);
            if (currentData.cash < betPrice) return null; // Pas assez d'argent

            await eco.addCash(user.id, -betPrice);

            const slots = ['🍇', '🍊', '🍐', '🍒', '🍋', '💎', '7️⃣'];
            const slot1 = slots[Math.floor(Math.random() * slots.length)];
            const slot2 = slots[Math.floor(Math.random() * slots.length)];
            const slot3 = slots[Math.floor(Math.random() * slots.length)];

            const isJackpot = (slot1 === slot2 && slot2 === slot3);
            const isTwo = (slot1 === slot2 || slot2 === slot3 || slot1 === slot3);

            let resultText, color, gain = 0;

            if (isJackpot) { 
                gain = 300;
                resultText = `🚨 **JACKPOT !!!** 💰 +${gain} €`; 
                color = 0xFFD700; 
            } 
            else if (isTwo) { 
                gain = 50;
                resultText = `✨ **Paire !** +${gain} €`; 
                color = 0xFFA500; 
            } 
            else { 
                resultText = "💀 Perdu..."; 
                color = 0xFF0000; 
            }

            if (gain > 0) await eco.addCash(user.id, gain);

            // Petit fix visuel pour le solde
            return new EmbedBuilder()
                .setColor(color)
                .setTitle('🎰 Machine à sous')
                .setDescription(`Coût : ${betPrice} €\n\n╔══════════╗\n║ ${slot1} ║ ${slot2} ║ ${slot3} ║\n╚══════════╝\n\n${resultText}`)
                .setFooter({ text: `Solde : ${currentData.cash - betPrice + gain} €` });
        };

        const firstEmbed = await playSlots();
        if (!firstEmbed) return replyFunc(`❌ Tu n'as pas assez d'argent (Coût : ${betPrice} €).`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('replay_slots').setLabel('🎰 Relancer (20€)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stop_slots').setLabel('Arrêter').setStyle(ButtonStyle.Danger)
        );

        // --- ENVOI INITIAL ---
        const response = await replyFunc({ embeds: [firstEmbed], components: [row], withResponse: true });
        
        // --- LE CORRECTIF EST ICI ---
        // On s'assure d'avoir le véritable objet Message pour créer le collecteur
        const message = await getMessage(response);

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
            
            const newEmbed = await playSlots();
            if (!newEmbed) {
                // Pour l'erreur flags, on utilise flags: 64 pour éviter le warning deprecated
                await i.reply({ content: "❌ Tu n'as plus d'argent !", flags: 64 });
                return collector.stop();
            }
            
            await i.update({ embeds: [newEmbed] });
        });
    }
};