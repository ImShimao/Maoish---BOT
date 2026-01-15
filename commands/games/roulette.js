const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Mise sur une couleur (Rouge/Noir/Vert)')
        .addStringOption(opt => opt.setName('mise').setDescription('Combien tu paries ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, betInput, replyFunc, getMessage;
        
        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            betInput = args[0] || "0";
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        const userData = await eco.get(user.id);

        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de roulette pour toi.\nLibération dans : **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- GESTION MISE ---
        let bet = 0;

        if (['all', 'tout', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide.")] });
        if (userData.cash < bet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez de cash (${userData.cash} €).`)] });

        // --- INTERFACE DE MISE ---
        const getBetButtons = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('red').setLabel('Rouge 🔴').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('black').setLabel('Noir ⚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('green').setLabel('Vert 🟢').setStyle(ButtonStyle.Success)
        );

        // Utilisation de embeds.info pour le panneau de choix
        const betEmbed = embeds.info(interactionOrMessage, `🎡 Roulette - Mise : ${bet} €`, 
            'Choisis ta couleur !\n🔴 **Rouge** (x2)\n⚫ **Noir** (x2)\n🟢 **Vert** (x15)'
        )
        .setColor(0x2F3136)
        .setFooter({ text: `Solde actuel : ${userData.cash} €` });

        // Envoi Initial
        const response = await replyFunc({ embeds: [betEmbed], components: [getBetButtons()], fetchReply: true });
        const message = await getMessage(response);
        if (!message) return;

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            // RE-VÉRIF SOLDE AU CLICK
            const currentData = await eco.get(user.id);
            if (currentData.cash < bet) {
                return i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
            }

            // On retire la mise
            await eco.addCash(user.id, -bet); 

            const choice = i.customId;
            const roll = Math.floor(Math.random() * 37); // 0 à 36
            
            let win = false;
            let multiplier = 0;

            // Logique Roulette Européenne (0 = Vert)
            if (choice === 'green' && roll === 0) { win = true; multiplier = 15; }
            else if (choice === 'red' && roll !== 0 && roll % 2 !== 0) { win = true; multiplier = 2; }
            else if (choice === 'black' && roll !== 0 && roll % 2 === 0) { win = true; multiplier = 2; }

            // Résultat
            let resultEmbed;
            
            if (win) {
                const gain = bet * multiplier;
                await eco.addCash(user.id, gain);
                
                // Embed Succès
                let colorHex = (roll === 0) ? 0x00FF00 : (roll % 2 !== 0 ? 0xFF0000 : 0x000000);
                
                resultEmbed = embeds.success(interactionOrMessage, `Résultat : ${roll}`, `🎉 **GAGNÉ !**\nLa boule est tombée sur le **${roll}**.\n💰 Gain : **+${gain} €**`)
                    .setColor(colorHex);

            } else {
                // Perdu -> Argent à la police
                await eco.addBank('police_treasury', bet);

                let colorHex = (roll === 0) ? 0x00FF00 : (roll % 2 !== 0 ? 0xFF0000 : 0x000000);

                resultEmbed = embeds.error(interactionOrMessage, `❌ **PERDU...**\nLa boule est tombée sur le **${roll}**.\n📉 Perte : **-${bet} €**`)
                    .setTitle(`Résultat : ${roll}`)
                    .setColor(colorHex);
            }

            const newData = await eco.get(user.id);
            resultEmbed.setFooter({ text: `Nouveau solde : ${newData.cash} €` });

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop();
        });
    }
};