const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duel')
        .setDescription('Affronte un autre joueur dans un combat épique ! 🥊')
        .addUserOption(option => 
            option.setName('adversaire')
                .setDescription('Qui veux-tu défier ?')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let challenger, opponent, replyFunc, getMessage;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            challenger = interactionOrMessage.user;
            opponent = interactionOrMessage.options.getUser('adversaire');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            challenger = interactionOrMessage.author;
            opponent = interactionOrMessage.mentions.users.first();
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        // --- VÉRIFICATIONS ---
        if (!opponent) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mentionne quelqu'un à défier !")] });
        if (opponent.id === challenger.id) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas te battre contre toi-même.")] });
        if (opponent.bot) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas défier un robot.")] });

        // --- STATS DU COMBAT ---
        const game = {
            [challenger.id]: { hp: 100, name: challenger.username, user: challenger, defending: false },
            [opponent.id]: { hp: 100, name: opponent.username, user: opponent, defending: false },
            turn: challenger.id 
        };

        // --- FONCTIONS GRAPHIQUES ---
        const getHpBar = (current, max = 100) => {
            const totalBars = 10;
            const filled = Math.round((current / max) * totalBars);
            const empty = totalBars - filled;
            return '🟩'.repeat(filled > 0 ? filled : 0) + '🟥'.repeat(empty > 0 ? empty : 0);
        };

        const getDuelEmbed = (log = "Le combat commence !", color = 0xFFFF00) => {
            const p1 = game[challenger.id];
            const p2 = game[opponent.id];

            // Utilisation de embeds.info pour le HUD
            // On met null en description car on construit une description complexe manuellement
            return embeds.info(interactionOrMessage, `🥊 DUEL : ${p1.name} vs ${p2.name}`, 
                `**${p1.name}** ${p1.defending ? '🛡️' : ''}\n` +
                `${getHpBar(p1.hp)} **${p1.hp}/100 PV**\n\n` +
                `**${p2.name}** ${p2.defending ? '🛡️' : ''}\n` +
                `${getHpBar(p2.hp)} **${p2.hp}/100 PV**\n\n` +
                `-----------------------------------\n` +
                `ℹ️ *${log}*`
            )
            .setColor(color)
            .setFooter({ text: `Tour de : ${game[game.turn].name}`, iconURL: game[game.turn].user.displayAvatarURL() });
        };

        // --- BOUTONS ---
        const acceptRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_duel').setLabel('ACCEPTER').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
            new ButtonBuilder().setCustomId('refuse_duel').setLabel('Fuir').setStyle(ButtonStyle.Danger)
        );

        const fightRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('punch').setLabel('Poing').setStyle(ButtonStyle.Primary).setEmoji('👊'),
            new ButtonBuilder().setCustomId('kick').setLabel('Pied').setStyle(ButtonStyle.Danger).setEmoji('🦵'),
            new ButtonBuilder().setCustomId('headbutt').setLabel('Coup de Boule').setStyle(ButtonStyle.Secondary).setEmoji('🗿'),
            new ButtonBuilder().setCustomId('parry').setLabel('Parade').setStyle(ButtonStyle.Secondary).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('heal').setLabel('Soin').setStyle(ButtonStyle.Success).setEmoji('💊')
        );

        // --- PHASE 1 : DEMANDE DE DUEL ---
        // Utilisation de embeds.warning pour la demande
        const challengeEmbed = embeds.warning(interactionOrMessage, '⚔️ Défi lancé !', `**${opponent}**, tu as reçu un défi de **${challenger}** !\nAcceptes-tu le combat ?`);
        
        const response = await replyFunc({ content: `${opponent}`, embeds: [challengeEmbed], components: [acceptRow], fetchReply: true });
        
        const message = await getMessage(response);
        if (!message) return;

        const confirmationCollector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 30000 
        });

        confirmationCollector.on('collect', async i => {
            if (i.user.id !== opponent.id) {
                return i.reply({ content: "Ce n'est pas ton défi !", ephemeral: true });
            }

            if (i.customId === 'refuse_duel') {
                await i.update({ 
                    content: null, 
                    embeds: [embeds.error(interactionOrMessage, "Défi refusé", `🏃 **${opponent.username}** a pris la fuite !`)], 
                    components: [] 
                });
                return confirmationCollector.stop();
            }

            if (i.customId === 'accept_duel') {
                confirmationCollector.stop();
                startCombat(i); 
            }
        });

        // --- PHASE 2 : LE COMBAT ---
        const startCombat = async (interaction) => {
            await interaction.update({ 
                content: null, 
                embeds: [getDuelEmbed()], 
                components: [fightRow] 
            });

            const fightCollector = message.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            fightCollector.on('collect', async i => {
                // Vérif tour
                if (i.user.id !== game.turn) {
                    return i.reply({ content: `⏳ Attends ton tour ! C'est à **${game[game.turn].name}** de jouer.`, ephemeral: true });
                }

                fightCollector.resetTimer();

                const attackerId = game.turn;
                const defenderId = attackerId === challenger.id ? opponent.id : challenger.id;
                const attacker = game[attackerId];
                const defender = game[defenderId];
                const action = i.customId;

                attacker.defending = false; // La parade saute quand on joue

                let log = "";
                let color = 0x3498DB; 

                // --- LOGIQUE DES ACTIONS ---
                if (action === 'punch') {
                    if (Math.random() < 0.90) {
                        let dmg = Math.floor(Math.random() * 6) + 10;
                        if (defender.defending) { dmg = Math.floor(dmg / 2); log = `🛡️ Bloqué ! `; }
                        
                        defender.hp -= dmg;
                        log += `👊 ${attacker.name} met une droite ! (-${dmg} PV)`;
                        color = 0xE67E22; 
                    } else {
                        log = `💨 ${attacker.name} a raté son coup de poing !`;
                        color = 0x95A5A6; 
                    }
                } 
                else if (action === 'kick') {
                    if (Math.random() < 0.50) {
                        let dmg = Math.floor(Math.random() * 16) + 20;
                        if (defender.defending) { dmg = Math.floor(dmg / 2); log = `🛡️ Bloqué ! `; }

                        defender.hp -= dmg;
                        log += `🦵 BOOM ! ${attacker.name} écrase ${defender.name} ! (-${dmg} PV)`;
                        color = 0xFF0000; 
                    } else {
                        const selfDmg = 5;
                        attacker.hp -= selfDmg;
                        log = `🤕 ${attacker.name} glisse et tombe ! (-${selfDmg} PV)`;
                        color = 0x95A5A6;
                    }
                }
                else if (action === 'headbutt') {
                    if (Math.random() < 0.60) {
                        let dmg = Math.floor(Math.random() * 11) + 15;
                        if (defender.defending) { dmg = Math.floor(dmg / 2); log = `🛡️ Bloqué ! `; }

                        defender.hp -= dmg;
                        log += `🗿 ${attacker.name} met un COUP DE BOULE ! (-${dmg} PV)`;
                        color = 0xFF4500; 
                    } else {
                        const selfDmg = 15; 
                        attacker.hp -= selfDmg;
                        log = `😵 ${attacker.name} rate son coup de boule et tape un mur ! (-${selfDmg} PV)`;
                        color = 0x550000;
                    }
                }
                else if (action === 'parry') {
                    attacker.defending = true;
                    log = `🛡️ ${attacker.name} se met en garde (Dégâts reçus / 2) !`;
                    color = 0x34495E; 
                }
                else if (action === 'heal') {
                    const heal = Math.floor(Math.random() * 11) + 10;
                    attacker.hp += heal;
                    if (attacker.hp > 100) attacker.hp = 100;
                    log = `💊 ${attacker.name} prend une potion (+${heal} PV)`;
                    color = 0x2ECC71; 
                }

                // --- VÉRIFICATION VICTOIRE ---
                if (defender.hp <= 0) {
                    defender.hp = 0;
                    // Utilisation de embeds.success
                    const finalEmbed = embeds.success(interactionOrMessage, `👑 VICTOIRE DE ${attacker.name.toUpperCase()} !`,
                        `**${attacker.name}** a mis K.O. **${defender.name}** !\n\n💀 ${defender.name} est au sol.\n🎉 ${attacker.name} est le champion !`
                    )
                    .setThumbnail(attacker.user.displayAvatarURL())
                    .setColor(0xFFD700);
                    
                    await i.update({ embeds: [finalEmbed], components: [] });
                    return fightCollector.stop();
                }

                // --- VÉRIFICATION SUICIDE ---
                if (attacker.hp <= 0) {
                    attacker.hp = 0;
                    const finalEmbed = embeds.success(interactionOrMessage, `🏆 VICTOIRE DE ${defender.name.toUpperCase()} !`,
                        `😂 **${attacker.name}** s'est assommé tout seul !\n\n🎉 ${defender.name} gagne par défaut.`
                    )
                    .setColor(0xFFD700);
                    
                    await i.update({ embeds: [finalEmbed], components: [] });
                    return fightCollector.stop();
                }

                // --- SUITE DU COMBAT ---
                game.turn = defenderId;
                await i.update({ embeds: [getDuelEmbed(log, color)], components: [fightRow] });
            });

            fightCollector.on('end', async (c, reason) => {
                if (reason === 'time') {
                    try { 
                        await message.edit({ 
                            embeds: [embeds.error(interactionOrMessage, "Temps écoulé", "Le combat a été annulé car personne ne jouait.")], 
                            components: [] 
                        }); 
                    } catch(e) {}
                }
            });
        };
    }
};