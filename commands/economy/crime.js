const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Commettre un crime (Risque de Prison !)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // 1. Vérif Prison
        if (eco.isJailed(user.id)) {
            const timeLeft = Math.ceil((eco.get(user.id).jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }

        // 2. Logique
        const risk = Math.random();
        
        // 40% de chance d'aller en prison ou amende
        if (risk < 0.40) {
            const jailTimeMin = 5;
            eco.setJail(user.id, jailTimeMin * 60 * 1000); // 5 minutes en ms
            
            // On retire aussi un peu d'argent (frais d'avocat)
            const fine = 200;
            eco.addCash(user.id, -fine);

            return replyFunc(`🚓 **ARRESTATION !** La police t'a attrapé en plein délit.\n⚖️ **Peine :** ${jailTimeMin} minutes de prison et -${fine} €.`);
        }

        // 60% de chance de réussir
        const gain = Math.floor(Math.random() * 800) + 200; // Entre 200 et 1000
        eco.addCash(user.id, gain);

        const scenarios = [
            "Tu as braqué une petite vieille.",
            "Tu as hacké un distributeur de billets.",
            "Tu as volé les roues d'une voiture de police.",
            "Tu as revendu des informations confidentielles."
        ];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        replyFunc(`😈 **Crime Réussi !** ${scenario}\n💰 Gain : **+${gain} €**`);
    }
};