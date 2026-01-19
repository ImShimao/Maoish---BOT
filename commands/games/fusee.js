const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fusee')
        .setDescription('Arrête la fusée avant qu\'elle n\'explose ! 🚀')
        .addStringOption(o => o.setName('mise').setDescription('Combien parier ? (ou "all")').setRequired(true)),

    async execute(interactionOrMessage) {
        let user, betInput, replyFunc, getMessage;
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            betInput = args[1] || "0";
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        // On récupère les infos (lecture seule ici)
        const userData = await eco.get(user.id, guildId);

        // --- 1. SÉCURITÉ ---
        if (userData.jailEnd > Date.now()) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "🔒 **Tu es en PRISON !**", "Pas de fusée pour les détenus.")],
                ephemeral: true 
            });
        }

        // --- 2. GESTION DE LA MISE ---
        let bet = 0;
        const cleanInput = betInput.toLowerCase();
        
        if (['all', 'tout', 'tapis', 'max'].includes(cleanInput)) {
            bet = userData.cash;
        } else {
            if (cleanInput.includes('k')) bet = parseFloat(cleanInput) * 1000;
            else if (cleanInput.includes('m')) bet = parseFloat(cleanInput) * 1000000;
            else bet = parseInt(cleanInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide.")] });
        if (bet < 10) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise minimum : 10 €")] });
        
        // --- PAIEMENT SÉCURISÉ ---
        // On tente de retirer l'argent directement. Si addCash renvoie le nouveau solde, c'est bon.
        // Mais pour être sûr à 100% (anti-race condition), l'idéal est d'utiliser eco.transfer ou une méthode atomique.
        // Ici, on garde ta structure mais on revérifie juste avant.
        if (userData.cash < bet) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Fonds insuffisants !\nTu as seulement **${userData.cash} €**.`)] });
        }
        
        await eco.addCash(user.id, guildId, -bet);

        // --- 3. CONFIGURATION DU CRASH ---
        // Formule de Pareto pour le crash
        let crashPoint = 1.00 / (1 - Math.random());
        
        // 🔥 MODIFICATION : Minimum 1.05x
        if (crashPoint < 1.05) crashPoint = 1.05; 
        
        if (crashPoint > 50) crashPoint = 50; // Plafond max (optionnel)
        crashPoint = parseFloat(crashPoint.toFixed(2));

        let currentMultiplier = 1.0;
        let gameActive = true;
        
        // --- 4. SYSTÈME VISUEL ---
        const getVisualTrack = (multiplier, exploded) => {
            const r = exploded ? "💥" : "🚀";
            const e = "⬛"; // Vide

            let lvl = 0;
            if (multiplier >= 1.0) lvl = 1;
            if (multiplier >= 2.0) lvl = 2;
            if (multiplier >= 5.0) lvl = 3;
            if (multiplier >= 10.0) lvl = 4;
            if (multiplier >= 25.0) lvl = 5;

            return `
            ${lvl === 5 ? `✨ ${r}` : `✨ ${e}`}
            ${lvl === 4 ? `🌌 ${r}` : `🌌 ${e}`}
            ${lvl === 3 ? `🌑 ${r}` : `🌑 ${e}`}
            ${lvl === 2 ? `☁️ ${r}` : `☁️ ${e}`}
            ${lvl === 1 ? `⛰️ ${r}` : `⛰️ ${e}`}
            `;
        };

        const generateEmbed = (exploded = false, win = false) => {
            const displayMult = exploded ? crashPoint : currentMultiplier;
            const currentWin = Math.floor(bet * displayMult);
            const visual = getVisualTrack(displayMult, exploded);

            const bigNumber = `# ${displayMult.toFixed(2)}x`;

            if (exploded) {
                return embeds.error(interactionOrMessage, 
                    `💥 CRASH à ${crashPoint.toFixed(2)}x !`,
                    `${visual}\n\n📉 **Tu as perdu ta mise.**\n💸 Mise : **${bet} €**\n❌ Multiplicateur : **${crashPoint.toFixed(2)}x**`
                ).setTitle('🚀 Mission Échouée');
            } 
            else if (win) {
                return embeds.success(interactionOrMessage, `✅ CASHOUT à ${currentMultiplier.toFixed(2)}x !`, 
                    `${visual}\n\n💰 **GAIN : +${currentWin} €**\n💸 Mise : **${bet} €**\n📈 Multiplicateur : **${currentMultiplier.toFixed(2)}x**`
                );
            } 
            else {
                return embeds.info(interactionOrMessage, '🚀 Fusée en vol...', 
                    `${visual}\n${bigNumber}\n💰 Gain potentiel : **${currentWin} €**`
                )
                .setColor(0x3498DB)
                .setFooter({ text: `Mise : ${bet} € | Clique pour sauter !` });
            }
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('stop_crash')
                .setLabel('SAUTER MAINTENANT')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🪂')
        );

        // --- LANCEMENT ---
        let message;
        try {
            const response = await replyFunc({ embeds: [generateEmbed()], components: [row], fetchReply: true });
            message = await getMessage(response);
        } catch (e) {
            await eco.addCash(user.id, guildId, bet); // Remboursement
            return console.error("Erreur lancement fusée:", e);
        }

        if (!message) return;

        // --- 5. COLLECTOR ---
        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            try { await i.deferUpdate(); } catch (e) {} 

            if (i.customId === 'stop_crash') {
                if (!gameActive) return;

                gameActive = false;
                clearInterval(interval);
                collector.stop();

                const winAmount = Math.floor(bet * currentMultiplier);
                // Crédit du gain
                await eco.addCash(user.id, guildId, winAmount);
                
                try {
                    await message.edit({ embeds: [generateEmbed(false, true)], components: [] });
                } catch(e) {} 
            }
        });

        // --- 6. BOUCLE DE JEU ---
        let intervalTime = 1500; 

        const interval = setInterval(async () => {
            if (!gameActive) {
                clearInterval(interval);
                return;
            }

            // CRASH
            if (currentMultiplier >= crashPoint) {
                gameActive = false;
                clearInterval(interval);
                collector.stop(); 
                
                // Argent perdu -> Police Treasury
                await eco.addBank('police_treasury', guildId, bet);

                const embed = generateEmbed(true, false);
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('stop_crash').setLabel('💥 CRASHED').setStyle(ButtonStyle.Danger).setDisabled(true)
                    );
                    await message.edit({ embeds: [embed], components: [disabledRow] });
                } catch (e) { }
                return;
            }

            // MONTÉE
            const baseGrowth = 0.15 + (currentMultiplier * 0.08);
            const turbulence = (Math.random() - 0.5) / 5;
            let step = baseGrowth + turbulence;
            if (step < 0.05) step = 0.05;

            currentMultiplier += step;

            try {
                if (gameActive) await message.edit({ embeds: [generateEmbed()] });
            } catch (e) {
                clearInterval(interval);
                collector.stop();
                gameActive = false;
            }

        }, intervalTime);
    }
};