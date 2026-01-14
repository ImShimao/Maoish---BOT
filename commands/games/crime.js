const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Tente de commettre un crime (Temps variable selon config)'),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage;

        // --- GESTION HYBRIDE SÉCURISÉE (SLASH / PREFIX) ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            // Pour prefix : on nettoie l'option ephemeral pour éviter les erreurs
            replyFunc = async (payload) => {
                const { ephemeral, ...options } = payload;
                return await interactionOrMessage.channel.send(options);
            };
            getMessage = async (msg) => msg;
        }

        const userData = await eco.get(user.id);
        if (!userData) return replyFunc({ content: "❌ Erreur profil.", ephemeral: true });

        // --- 1. VÉRIF PRISON (Ephémère) ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            
            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR || 0xE74C3C)
                .setDescription(`🔒 **Tu es en PRISON !**\nReviens dans **${timeLeft} minutes**.`)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });
                
            return replyFunc({ embeds: [embed], ephemeral: true });
        }

        // --- 2. GESTION COOLDOWN (Ephémère) ---
        if (!userData.cooldowns) userData.cooldowns = {};

        const cooldownTime = config.COOLDOWNS.CRIME || 120000; // 2 min par défaut
        const now = Date.now();

        if (userData.cooldowns.crime > now) {
            const timeLeft = userData.cooldowns.crime - now;
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            const embed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setDescription(`⏳ **Calme-toi !** La police rôde...\nRéessaie dans **${minutes}m ${seconds}s**.`)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });
                
            return replyFunc({ embeds: [embed], ephemeral: true });
        }

        // On applique le cooldown tout de suite
        userData.cooldowns.crime = now + cooldownTime;
        await userData.save();

        // --- 3. LOGIQUE DU CRIME ---
        const risk = Math.random();
        
        // === SCÉNARIO : ÉCHEC (ARRESTATION 40%) ===
        if (risk < 0.40) { 
            const amende = 750;
            const prisonTimeMin = 5;
            const canPay = userData.cash >= amende;

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR || 0xE74C3C)
                .setTitle('👮 ARRESTATION !')
                .setDescription(`La police t'a attrapé !\n\n**Choisis vite (30s) :**\n⛓️ **Prison** (${prisonTimeMin} min)\n💸 **Payer** (${amende} €)`)
                .setFooter({ text: "⚠️ Si tu ne réponds pas, c'est la prison directe !" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('go_jail').setLabel('Aller en cellule').setStyle(ButtonStyle.Secondary).setEmoji('⛓️'),
                new ButtonBuilder().setCustomId('pay_bribe').setLabel(`Payer (${amende}€)`).setStyle(ButtonStyle.Danger).setDisabled(!canPay)
            );

            const response = await replyFunc({ embeds: [embed], components: [row], fetchReply: true });
            const msg = await getMessage(response);
            
            if (!msg) return;

            const collector = msg.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                filter: i => i.user.id === user.id, 
                time: 30000 
            });

            collector.on('collect', async i => {
                if (i.customId === 'pay_bribe') {
                    const freshData = await eco.get(user.id);
                    if (freshData.cash < amende) {
                        return i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
                    }
                    
                    // 1. On retire l'argent au joueur
                    await eco.addCash(user.id, -amende);
                    
                    // 2. On ajoute l'argent au coffre de la police (NOUVEAU)
                    await eco.addBank('police_treasury', amende);

                    await i.update({ 
                        embeds: [new EmbedBuilder().setColor(config.COLORS.SUCCESS || 0x2ECC71).setDescription(`💸 **Corrupteur !** Tu as payé **${amende} €** et l'officier te laisse partir.\n*(L'argent a été saisi par la Police Fédérale)*`)], 
                        components: [] 
                    });
                } 
                else if (i.customId === 'go_jail') {
                    await eco.setJail(user.id, prisonTimeMin * 60 * 1000);
                    await i.update({ 
                        embeds: [new EmbedBuilder().setColor(config.COLORS.ERROR || 0xE74C3C).setDescription(`🔒 **Cellule !** Tu as accepté ton sort. Tu es enfermé pour **${prisonTimeMin} minutes**.`)] , 
                        components: [] 
                    });
                }
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await eco.setJail(user.id, prisonTimeMin * 60 * 1000);
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(config.COLORS.ERROR || 0xE74C3C)
                        .setTitle('⚖️ JUSTICE EXPÉDITIVE')
                        .setDescription(`⏱️ **Trop lent !** Tu as hésité trop longtemps.\nLes policiers t'ont jeté en prison pour **${prisonTimeMin} minutes**.`);

                    try {
                        if (interactionOrMessage.isCommand?.()) {
                            await interactionOrMessage.editReply({ embeds: [timeoutEmbed], components: [] });
                        } else {
                            await msg.edit({ embeds: [timeoutEmbed], components: [] });
                        }
                    } catch (e) {}
                }
            });
            return;
        }

        // === SCÉNARIO : RÉUSSITE ===
        const gain = Math.floor(Math.random() * 800) + 200;
        await eco.addCash(user.id, gain);

        // --- AJOUTS XP & STATS ---
        await eco.addStat(user.id, 'crimes'); // Stat 'crimes'
        const xpResult = await eco.addXP(user.id, 40); // 40 XP car risqué

        const scenarios = [
            "Tu as braqué une petite vieille.",
            "Tu as hacké un distributeur de boissons.",
            "Tu as volé les roues d'une voiture de police.",
            "Tu as cambriolé une supérette.",
            "Tu as volé un sac à main de luxe."
        ];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.SUCCESS || 0x2ECC71)
            .setDescription(`😈 **Crime Réussi !**\n${scenario}\n\n💰 Gain : **+${gain} €**\n✨ XP : **+40**`)
            .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });

        // Notification Level Up
        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;

        replyFunc({ content: content, embeds: [embed] });
    }
};