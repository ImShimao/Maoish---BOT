const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Tente de commettre un crime (2 min de recharge)'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- 1. CHARGEMENT DES DONNÉES ---
        const userData = await eco.get(user.id);

        // --- 2. VÉRIF PRISON ---
        // On vérifie directement dans userData qu'on vient de charger
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Impossible de commettre un crime. Reviens dans **${timeLeft} minutes**.`);
        }

        // --- 3. GESTION COOLDOWN (2 Minutes) ---
        const cooldownTime = 2 * 60 * 1000; // 2 minutes
        const now = Date.now();

        if (userData.cooldowns.crime > now) {
            const timeLeft = userData.cooldowns.crime - now;
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            return replyFunc(`⏳ **Calme-toi !** La police rôde dans le coin... Réessaie dans **${minutes}m ${seconds}s**.`);
        }

        // --- 4. APPLICATION DU COOLDOWN ---
        // On applique le délai tout de suite pour éviter le spam
        userData.cooldowns.crime = now + cooldownTime;
        await userData.save();


        // --- 5. LOGIQUE DU CRIME ---
        const risk = Math.random();
        
        // === CAS D'ÉCHEC : ARRESTATION ===
        if (risk < 0.40) { // 40% de malchance
            
            const amende = 750;
            const prisonTimeMin = 5;
            const canPay = userData.cash >= amende;

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('👮 ARRESTATION !')
                .setDescription(`La police t'a attrapé !\n\nTu as le choix :\n🏛️ **Aller en prison** (${prisonTimeMin} minutes)\n💸 **Payer un pot-de-vin** (${amende} €)`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('go_jail')
                    .setLabel('Aller en cellule')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⛓️'),
                new ButtonBuilder()
                    .setCustomId('pay_bribe')
                    .setLabel(`Payer (${amende}€)`)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!canPay)
            );

            const msg = await replyFunc({ embeds: [embed], components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                filter: i => i.user.id === user.id, 
                time: 30000 
            });

            collector.on('collect', async i => {
                if (i.customId === 'pay_bribe') {
                    const currentData = await eco.get(user.id);
                    if (currentData.cash < amende) {
                        return i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
                    }
                    await eco.addCash(user.id, -amende);
                    await i.update({ content: `💸 **Ouf !** Tu as payé **${amende} €** et l'officier te laisse partir.`, embeds: [], components: [] });
                } 
                else if (i.customId === 'go_jail') {
                    await eco.setJail(user.id, prisonTimeMin * 60 * 1000);
                    await i.update({ content: `🔒 **Direction la cellule !** Tu es enfermé pour **${prisonTimeMin} minutes**.`, embeds: [], components: [] });
                }
                collector.stop();
            });

            // Si le joueur ne répond pas -> Prison auto
            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await eco.setJail(user.id, prisonTimeMin * 60 * 1000);
                    try { await msg.edit({ content: "⏱️ **Trop lent !** La police t'embarque. (5 min de prison)", embeds: [], components: [] }); } catch (e) {}
                }
            });
            return;
        }

        // === CAS DE RÉUSSITE ===
        const gain = Math.floor(Math.random() * 800) + 200;
        await eco.addCash(user.id, gain);

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