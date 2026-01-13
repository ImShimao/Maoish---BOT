const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Braquer un membre')
        .addUserOption(o => o.setName('victime').setDescription('Qui voler ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        const robber = interactionOrMessage.user || interactionOrMessage.author;
        const victimUser = interactionOrMessage.isCommand?.() ? interactionOrMessage.options.getUser('victime') : interactionOrMessage.mentions.users.first();
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        // Petite fonction interne pour créer un embed rapide
        const sendEmbed = (text, color) => {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(text)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });
            return replyFunc({ embeds: [embed] });
        };

        if (!victimUser || victimUser.id === robber.id || victimUser.bot) return sendEmbed("❌ Cible invalide.", config.COLORS.ERROR);

        const robberData = await eco.get(robber.id);
        const now = Date.now();

        if (robberData.jailEnd > now) return sendEmbed("🔒 Les barreaux t'empêchent de braquer.", config.COLORS.ERROR);

        if (robberData.cooldowns.rob > now) {
            const timeLeft = Math.ceil((robberData.cooldowns.rob - now) / 60000);
            // On peut laisser le cooldown en texte simple ou en embed, ici je mets embed orange
            return sendEmbed(`🚓 La police te surveille... Attends **${timeLeft} min**.`, 0xE67E22);
        }

        const victimData = await eco.get(victimUser.id);
        if (victimData.cash < 100) return sendEmbed("❌ Cette personne est trop pauvre pour être volée.", config.COLORS.ERROR);
        if (robberData.cash < 500) return sendEmbed("❌ Il te faut 500€ sur toi pour payer l'amende au cas où !", config.COLORS.ERROR);

        // Protection Cadenas
        if (await eco.hasItem(victimUser.id, 'lock')) {
            if (Math.random() < 0.5) {
                await eco.removeItem(victimUser.id, 'lock');
                return sendEmbed(`🛡️ **ÉCHEC !** Le **Cadenas** de ${victimUser.username} t'a repoussé !`, 0x3498DB); // Bleu
            }
        }

        robberData.cooldowns.rob = now + (config.COOLDOWNS.ROB || 3600000);
        const success = Math.random() < (config.PROBS?.ROB_SUCCESS || 0.5);

        if (success) {
            const stolen = Math.floor(victimData.cash * (Math.random() * 0.2 + 0.1));
            await eco.addCash(victimUser.id, -stolen); // La victime n'est pas chargée ici, donc eco.addCash c'est ok
            robberData.cash += stolen; // On modifie directement l'objet chargé
            await robberData.save();   // On sauvegarde tout (cash + cooldown) d'un coup

            // SUCCÈS : VERT
            return sendEmbed(`🔫 **Braquage réussi !**\nTu as volé **${stolen} €** à ${victimUser.username}.`, config.COLORS.SUCCESS);
        } else {
            const amende = 500;
            await eco.addCash(robber.id, -amende);
            await robberData.save();
            
            // ÉCHEC : ROUGE
            return sendEmbed(`🚓 **ALERTE !** Tu t'es fait pincer.\nAmende payée : **${amende} €**.`, config.COLORS.ERROR);
        }
    }
};