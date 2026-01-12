const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Mise sur Pile ou Face (Double ou rien)')
        .addIntegerOption(o => o.setName('mise').setDescription('Combien tu paries ?').setRequired(true))
        .addStringOption(o => 
            o.setName('choix')
             .setDescription('Pile ou Face ?')
             .setRequired(true)
             .addChoices({ name: 'Pile', value: 'pile' }, { name: 'Face', value: 'face' })),

    async execute(interactionOrMessage, args) {
        let user, bet, choice, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            bet = interactionOrMessage.options.getInteger('mise');
            choice = interactionOrMessage.options.getString('choix');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            if (!args[0] || isNaN(args[0]) || !args[1]) return interactionOrMessage.reply("❌ Usage: `+coinflip 100 pile`");
            bet = parseInt(args[0]);
            choice = args[1].toLowerCase();
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        if (bet <= 0) return replyFunc("❌ Mise invalide.");
        
        const userData = eco.get(user.id);
        if (userData.cash < bet) return replyFunc(`❌ Tu n'as pas assez de cash (${userData.cash}€) !`);

        // Tirage
        const result = Math.random() < 0.5 ? 'pile' : 'face';
        const win = (choice === result);

        // IMAGES
        const imagePile = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/1_Euro_Coin_Common_Face_2007.jpg/512px-1_Euro_Coin_Common_Face_2007.jpg';
        const imageFace = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/1_euro_France_2012.png/512px-1_euro_France_2012.png';
        const finalImage = result === 'pile' ? imagePile : imageFace;

        let message = "";
        let color = 0x000000;

        if (win) {
            eco.addCash(user.id, bet); 
            message = `🎉 **GAGNÉ !** C'était bien **${result}**.\nTu remportes **${bet} €** !`;
            color = 0x2ECC71; 
        } else {
            eco.addCash(user.id, -bet); 
            message = `💀 **PERDU...** C'était **${result}**.\nTu perds ta mise de **${bet} €**.`;
            color = 0xFF0000; 
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🪙 Coinflip : ${choice.toUpperCase()} vs ${result.toUpperCase()}`)
            .setDescription(message)
            .setThumbnail(finalImage) // C'est ça qui manquait !
            .setFooter({ text: `Nouveau solde : ${eco.get(user.id).cash} €` });

        await replyFunc({ embeds: [embed] });
    }
};