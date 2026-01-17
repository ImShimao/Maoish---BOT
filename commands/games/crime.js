const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Tente de commettre un crime (Temps variable selon config)'),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (payload) => {
                const { ephemeral, ...options } = payload;
                return await interactionOrMessage.channel.send(options);
            };
            getMessage = async (msg) => msg;
        }

        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        if (!userData) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur profil.")], ephemeral: true });

        // --- 1. VÉRIF PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !**\nReviens dans **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- 2. GESTION COOLDOWN ---
        if (!userData.cooldowns) userData.cooldowns = {};
        const cooldownTime = config.COOLDOWNS.CRIME || 120000; // 2 min
        const now = Date.now();

        if (userData.cooldowns.crime > now) {
            const timeLeft = userData.cooldowns.crime - now;
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Calme-toi !", `La police rôde...\nRéessaie dans **${minutes}m ${seconds}s**.`)],
                ephemeral: true 
            });
        }

        // Application du cooldown
        userData.cooldowns.crime = now + cooldownTime;
        await userData.save();

        // --- 3. LOGIQUE DU CRIME ---
        const risk = Math.random();
        
        // === SCÉNARIO : ÉCHEC (ARRESTATION 40%) ===
        if (risk < 0.40) { 
            const amende = 750;
            const prisonTimeMin = 5;
            const canPay = userData.cash >= amende;

            // Utilisation de embeds.error pour l'arrestation
            const arrestEmbed = embeds.error(interactionOrMessage, 
                `La police t'a attrapé !\n\n**Choisis vite (30s) :**\n⛓️ **Prison** (${prisonTimeMin} min)\n💸 **Payer** (${amende} €)`
            )
            .setTitle('👮 ARRESTATION !')
            .setFooter({ text: "⚠️ Si tu ne réponds pas, c'est la prison directe !" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('go_jail').setLabel('Aller en cellule').setStyle(ButtonStyle.Secondary).setEmoji('⛓️'),
                new ButtonBuilder().setCustomId('pay_bribe').setLabel(`Payer (${amende}€)`).setStyle(ButtonStyle.Danger).setDisabled(!canPay)
            );

            const response = await replyFunc({ embeds: [arrestEmbed], components: [row], fetchReply: true });
            const msg = await getMessage(response);
            
            if (!msg) return;

            const collector = msg.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                filter: i => i.user.id === user.id, 
                time: 30000 
            });

            collector.on('collect', async i => {
                if (i.customId === 'pay_bribe') {
                    // ✅ Ajout de guildId
                    const freshData = await eco.get(user.id, guildId);
                    if (freshData.cash < amende) {
                        return i.reply({ embeds: [embeds.error(i, "Tu n'as plus assez d'argent !")], ephemeral: true });
                    }
                    
                    // ✅ Ajout de guildId partout
                    await eco.addCash(user.id, guildId, -amende);
                    // L'argent va à la police DU SERVEUR
                    await eco.addBank('police_treasury', guildId, amende);

                    await i.update({ 
                        embeds: [embeds.success(interactionOrMessage, "Corrupteur !", `💸 Tu as payé **${amende} €** et l'officier te laisse partir.\n*(L'argent a été saisi par la Police Fédérale)*`)], 
                        components: [] 
                    });
                } 
                else if (i.customId === 'go_jail') {
                    // ✅ Ajout de guildId
                    await eco.setJail(user.id, guildId, prisonTimeMin * 60 * 1000);
                    await i.update({ 
                        embeds: [embeds.error(interactionOrMessage, `🔒 **Cellule !** Tu as accepté ton sort. Tu es enfermé pour **${prisonTimeMin} minutes**.`)], 
                        components: [] 
                    });
                }
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    // ✅ Ajout de guildId
                    await eco.setJail(user.id, guildId, prisonTimeMin * 60 * 1000);
                    const timeoutEmbed = embeds.error(interactionOrMessage, 
                        `⏱️ **Trop lent !** Tu as hésité trop longtemps.\nLes policiers t'ont jeté en prison pour **${prisonTimeMin} minutes**.`
                    ).setTitle('⚖️ JUSTICE EXPÉDITIVE');

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
        // ✅ Ajout de guildId
        await eco.addCash(user.id, guildId, gain);

        // Stats & XP
        // ✅ Ajout de guildId
        await eco.addStat(user.id, guildId, 'crimes'); 
        const xpResult = await eco.addXP(user.id, guildId, 40); 

        const scenarios = [
            "Tu as braqué une petite vieille.", "Tu as hacké un distributeur de boissons.",
            "Tu as volé les roues d'une voiture de police.", "Tu as cambriolé une supérette.",
            "Tu as volé un sac à main de luxe."
        ];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        // Utilisation de embeds.success
        const embed = embeds.success(interactionOrMessage, "Crime Réussi !", 
            `😈 ${scenario}\n\n💰 Gain : **+${gain} €**\n✨ XP : **+40**`
        );

        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;

        replyFunc({ content: content, embeds: [embed] });
    }
};