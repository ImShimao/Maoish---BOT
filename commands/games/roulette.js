const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Mise sur une couleur (Rouge/Noir/Vert)')
        .addStringOption(opt => opt.setName('mise').setDescription('Combien tu paries ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, betInput, replyFunc;
        
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            betInput = args[0] || "0";
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- 1. Vérif Prison (CORRIGÉ) ---
        if (await eco.isJailed(user.id)) {
            const userData = await eco.get(user.id);
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }

        // --- GESTION MISE (CORRIGÉ) ---
        const userData = await eco.get(user.id); // AWAIT
        let bet = 0;

        if (['all', 'tout', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc("❌ Mise invalide.");
        if (userData.cash < bet) return replyFunc(`❌ Tu n'as pas assez de cash (${userData.cash} €).`);

        // --- FONCTIONS ---
        // On doit récupérer le solde à chaque fois pour l'affichage, donc on passe data en paramètre ou on refait un get
        const getBetEmbed = async () => {
             const d = await eco.get(user.id);
             return new EmbedBuilder()
                .setColor(0x2F3136)
                .setTitle(`🎡 Roulette - Mise : ${bet} €`)
                .setDescription('Choisis ta couleur !\n🔴 **Rouge** (x2)\n⚫ **Noir** (x2)\n🟢 **Vert** (x15)')
                .setFooter({ text: `Solde actuel : ${d.cash} €` });
        };

        const getBetButtons = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('red').setLabel('Rouge 🔴').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('black').setLabel('Noir ⚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('green').setLabel('Vert 🟢').setStyle(ButtonStyle.Success)
        );

        const message = await replyFunc({ embeds: [await getBetEmbed()], components: [getBetButtons()], fetchReply: true });

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            // RE-VÉRIF SOLDE AU CLICK (Important)
            const currentData = await eco.get(user.id);
            if (currentData.cash < bet) {
                return i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
            }

            await eco.addCash(user.id, -bet); // On prend l'argent

            const choice = i.customId;
            const roll = Math.floor(Math.random() * 37);
            
            let win = false;
            let multiplier = 0;

            if (choice === 'green' && roll === 0) { win = true; multiplier = 15; }
            else if (choice === 'red' && roll !== 0 && roll % 2 !== 0) { win = true; multiplier = 2; }
            else if (choice === 'black' && roll !== 0 && roll % 2 === 0) { win = true; multiplier = 2; }

            const gain = win ? bet * multiplier : 0;
            if (win) await eco.addCash(user.id, gain);

            // Résultat
            const newData = await eco.get(user.id);
            let colorHex = (roll === 0) ? 0x00FF00 : (roll % 2 !== 0 ? 0xFF0000 : 0x000000);
            const status = win ? `🎉 **GAGNÉ !** (+${gain} €)` : `❌ **PERDU...** (-${bet} €)`;

            const resultEmbed = new EmbedBuilder()
                .setColor(colorHex)
                .setTitle(`Résultat : ${roll}`)
                .setDescription(status)
                .setFooter({ text: `Nouveau solde : ${newData.cash} €` });

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop();
        });
    }
};