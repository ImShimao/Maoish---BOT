const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Mendier un peu d\'argent'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.isCommand?.() ? interactionOrMessage.user : interactionOrMessage.author;
        const replyFunc = interactionOrMessage.isCommand?.() ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- SÉCURITÉ PRISON ---
        const userData = await eco.get(user.id);
        if (userData && userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            const msg = `🔒 **Tu es en PRISON !** Personne ne donne aux prisonniers.\nLibération dans : **${timeLeft} minutes**.`;
            
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply({ content: msg, ephemeral: true });
            else return interactionOrMessage.channel.send(msg);
        }

        const cooldownTime = 5 * 60 * 1000;
        const lastBeg = cooldowns.get(user.id);
        const now = Date.now();

        if (lastBeg && (now - lastBeg) < cooldownTime) {
            const minutes = Math.floor((cooldownTime - (now - lastBeg)) / 60000);
            const embed = new EmbedBuilder().setColor(0xE67E22).setDescription(`⏱️ **Patience !** Reviens mendier dans **${minutes} minutes**.`);
            return replyFunc({ embeds: [embed] });
        }

        cooldowns.set(user.id, now);
        
        // 30% de chance de réussite
        const success = Math.random() < 0.3;

        if (success) {
            const amount = Math.floor(Math.random() * 40) + 10;
            await eco.addCash(user.id, amount); 
            
            const goodReplies = [
                "Un passant généreux t'a donné",
                "Tu as trouvé par terre",
                "Grand-mère t'a glissé",
                "Un TikTokeur t'a filmé et donné",
                "Elon Musk a eu pitié et a lâché",
                "Tu as chanté 'La Reine des Neiges' et on t'a donné",
                "Un pigeon a lâché... un billet de",
                "Tu as retrouvé un vieux billet dans ton slip :",
                "MrBeast passait par là et t'a offert",
                "Tu as vendu une photo de tes pieds pour",
                "Un enfant a cru que tu étais le Père Noël et t'a donné",
                "Tu as nettoyé un pare-brise au feu rouge pour",
                "Tu as trouvé le portefeuille de ton voisin contenant",
                "Un extraterrestre a laissé tomber",
                "Tu as gagné un pari stupide et remporté",
                "La petite souris est passée (tu as perdu une dent ?) :",
                "Un touriste égaré t'a donné",
                "Tu as fouillé sous le canapé et trouvé",
                "Le vent a ramené un billet de",
                "Un abonné Twitch s'est trompé de destinataire et t'a envoyé"
            ];
            const randomText = goodReplies[Math.floor(Math.random() * goodReplies.length)];

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.SUCCESS)
                .setDescription(`💰 **${randomText} ${amount} €** !`);
            replyFunc({ embeds: [embed] });
        } else {
            const badReplies = [
                "Va travailler, feignasse !",
                "Je n'ai pas de monnaie, désolé.",
                "Laisse-moi tranquille ou j'appelle la police.",
                "Une vieille dame t'a frappé avec son sac à main.",
                "Un chien a pissé sur ta chaussure.",
                "On t'a jeté du pain comme à un canard.",
                "Même les rats te fuient.",
                "T'as cru que j'étais la Banque de France ?",
                "Quelqu'un a mis un chewing-gum dans tes cheveux.",
                "Un enfant t'a montré du doigt en rigolant.",
                "Tu as trébuché et tout le monde a ri.",
                "Ta mère t'a vu et a fait semblant de ne pas te connaître.",
                "On t'a donné un faux billet de Monopoly.",
                "Un passant t'a regardé avec dégoût.",
                "Tu as demandé à un policier... mauvaise idée.",
                "Il pleut et personne ne s'arrête.",
                "Tu as essayé de chanter mais on t'a payé pour que tu te taises (0€).",
                "J'ai vu des cailloux plus riches que toi.",
                "Va te doucher d'abord.",
                "Dégage de mon trottoir !"
            ];
            const randomText = badReplies[Math.floor(Math.random() * badReplies.length)];
            
            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR)
                .setDescription(`❌ **${randomText}**\n*(Tu n'as rien gagné)*`);
            replyFunc({ embeds: [embed] });
        }
    }
};