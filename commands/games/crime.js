const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Tente de commettre un crime (2 min de recharge)'),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage;

        // --- GESTION HYBRIDE SÉCURISÉE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        // Helper pour les Embeds rapides
        const sendEmbed = (text, color) => {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(text)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });
            return replyFunc({ embeds: [embed] });
        };

        const userData = await eco.get(user.id);

        // --- VÉRIF PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return sendEmbed(`🔒 **Tu es en PRISON !**\nReviens dans **${timeLeft} minutes**.`, config.COLORS.ERROR);
        }

        // --- GESTION COOLDOWN ---
        const cooldownTime = 2 * 60 * 1000;
        const now = Date.now();

        if (userData.cooldowns.crime > now) {
            const timeLeft = userData.cooldowns.crime - now;
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            return sendEmbed(`⏳ **Calme-toi !** La police rôde...\nRéessaie dans **${minutes}m ${seconds}s**.`, 0xE67E22);
        }

        userData.cooldowns.crime = now + cooldownTime;
        await userData.save();

        // --- LOGIQUE DU CRIME ---
        const risk = Math.random();
        
        // === ÉCHEC ===
        if (risk < 0.40) {
            const amende = 750;
            const prisonTimeMin = 5;
            const canPay = userData.cash >= amende;

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR)
                .setTitle('👮 ARRESTATION !')
                .setDescription(`La police t'a attrapé !\n\n**Choisis ton destin :**\n⛓️ **Prison** (${prisonTimeMin} min)\n💸 **Payer** (${amende} €)`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('go_jail').setLabel('Aller en cellule').setStyle(ButtonStyle.Secondary).setEmoji('⛓️'),
                new ButtonBuilder().setCustomId('pay_bribe').setLabel(`Payer (${amende}€)`).setStyle(ButtonStyle.Danger).setDisabled(!canPay)
            );

            // ENVOI SÉCURISÉ
            const response = await replyFunc({ embeds: [embed], components: [row], withResponse: true });
            const msg = await getMessage(response);
            if (!msg) return;

            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === user.id, time: 30000 });

            collector.on('collect', async i => {
                if (i.customId === 'pay_bribe') {
                    const currentData = await eco.get(user.id);
                    if (currentData.cash < amende) return i.reply({ content: "❌ Tu n'as plus assez d'argent !", flags: 64 });
                    
                    await eco.addCash(user.id, -amende);
                    await i.update({ embeds: [new EmbedBuilder().setColor(config.COLORS.SUCCESS).setDescription(`💸 **Ouf !** Tu as payé **${amende} €** et l'officier te laisse partir.`)], components: [] });
                } 
                else if (i.customId === 'go_jail') {
                    await eco.setJail(user.id, prisonTimeMin * 60 * 1000);
                    await i.update({ embeds: [new EmbedBuilder().setColor(config.COLORS.ERROR).setDescription(`🔒 **Cellule !** Tu es enfermé pour **${prisonTimeMin} minutes**.`)] , components: [] });
                }
                collector.stop();
            });
            return;
        }

        // === RÉUSSITE ===
        const gain = Math.floor(Math.random() * 800) + 200;
        await eco.addCash(user.id, gain);

        const scenarios = ["Tu as braqué une petite vieille.", "Tu as hacké un distributeur.", "Tu as volé les roues d'une voiture de police."];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        sendEmbed(`😈 **Crime Réussi !**\n${scenario}\n💰 Gain : **+${gain} €**`, config.COLORS.SUCCESS);
    }
};