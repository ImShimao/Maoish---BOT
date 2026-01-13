const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

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
            getMessage = async () => await interactionOrMessage.withResponse();
        } else {
            challenger = interactionOrMessage.author;
            opponent = interactionOrMessage.mentions.users.first();
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        // --- VÉRIFICATIONS ---
        if (!opponent) return replyFunc("❌ Mentionne quelqu'un à défier !");
        if (opponent.id === challenger.id) return replyFunc("❌ Tu ne peux pas te battre contre toi-même (schizophrène ?).");
        if (opponent.bot) return replyFunc("❌ Tu ne peux pas défier un robot, ils sont trop forts.");

        // --- STATS DU COMBAT ---
        // On ajoute la propriété "defending: false" pour gérer la parade
        const game = {
            [challenger.id]: { hp: 100, name: challenger.username, user: challenger, defending: false },
            [opponent.id]: { hp: 100, name: opponent.username, user: opponent, defending: false },
            turn: challenger.id // Le challenger commence
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

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(`🥊 DUEL : ${p1.name} vs ${p2.name}`)
                .setDescription(`
                **${p1.name}** ${p1.defending ? '🛡️' : ''}
                ${getHpBar(p1.hp)} **${p1.hp}/100 PV**

                **${p2.name}** ${p2.defending ? '🛡️' : ''}
                ${getHpBar(p2.hp)} **${p2.hp}/100 PV**

                -----------------------------------
                ℹ️ *${log}*
                `)
                .setFooter({ text: `Tour de : ${game[game.turn].name}`, iconURL: game[game.turn].user.displayAvatarURL() });
        };

        // --- BOUTONS ---
        const acceptRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_duel').setLabel('ACCEPTER LE DÉFI').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
            new ButtonBuilder().setCustomId('refuse_duel').setLabel('Fuir').setStyle(ButtonStyle.Danger)
        );

        // On a maintenant 5 boutons (Max Discord par ligne)
        const fightRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('punch').setLabel('Poing').setStyle(ButtonStyle.Primary).setEmoji('👊'),
            new ButtonBuilder().setCustomId('kick').setLabel('Pied').setStyle(ButtonStyle.Danger).setEmoji('🦵'),
            new ButtonBuilder().setCustomId('headbutt').setLabel('Coup de Boule').setStyle(ButtonStyle.Secondary).setEmoji('🗿'),
            new ButtonBuilder().setCustomId('parry').setLabel('Parade').setStyle(ButtonStyle.Secondary).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('heal').setLabel('Soin').setStyle(ButtonStyle.Success).setEmoji('💊')
        );

        // --- PHASE 1 : DEMANDE DE DUEL ---
        const response = await replyFunc({ 
            content: `⚔️ **${opponent}**, tu as reçu un défi de **${challenger}** ! Acceptes-tu ?`, 
            components: [acceptRow] 
        });
        
        const message = await getMessage(response);
        if (!message) return;

        const confirmationCollector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 30000 
        });

        confirmationCollector.on('collect', async i => {
            if (i.user.id !== opponent.id) {
                return i.reply({ content: "Ce n'est pas ton défi !", flags: 64 });
            }

            if (i.customId === 'refuse_duel') {
                await i.update({ content: `🏃 **${opponent.username}** a pris la fuite !`, components: [] });
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
                    return i.reply({ content: `⏳ Attends ton tour ! C'est à **${game[game.turn].name}** de jouer.`, flags: 64 });
                }

                fightCollector.resetTimer();

                const attackerId = game.turn;
                const defenderId = attackerId === challenger.id ? opponent.id : challenger.id;
                const attacker = game[attackerId];
                const defender = game[defenderId];
                const action = i.customId;

                // IMPORTANT : Si l'attaquant avait une parade active, elle disparait quand il joue
                attacker.defending = false; 

                let log = "";
                let color = 0x3498DB; 

                // --- LOGIQUE DES ACTIONS ---
                
                // 1. POING (90% hit, 10-15 dmg)
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
                
                // 2. PIED (50% hit, 20-35 dmg)
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

                // 3. COUP DE BOULE (60% hit, 15-25 dmg, Gros risque)
                else if (action === 'headbutt') {
                    if (Math.random() < 0.60) {
                        let dmg = Math.floor(Math.random() * 11) + 15;
                        if (defender.defending) { dmg = Math.floor(dmg / 2); log = `🛡️ Bloqué ! `; }

                        defender.hp -= dmg;
                        log += `🗿 ${attacker.name} met un COUP DE BOULE ! (-${dmg} PV)`;
                        color = 0xFF4500; // Orange foncé
                    } else {
                        const selfDmg = 15; // Aïe
                        attacker.hp -= selfDmg;
                        log = `😵 ${attacker.name} rate son coup de boule et tape un mur ! (-${selfDmg} PV)`;
                        color = 0x550000;
                    }
                }

                // 4. PARADE (Active la défense pour le tour suivant)
                else if (action === 'parry') {
                    attacker.defending = true;
                    log = `🛡️ ${attacker.name} se met en garde (Dégâts reçus / 2) !`;
                    color = 0x34495E; // Bleu nuit
                }
                
                // 5. SOIN (100% hit, +10-20 PV)
                else if (action === 'heal') {
                    const heal = Math.floor(Math.random() * 11) + 10;
                    attacker.hp += heal;
                    if (attacker.hp > 100) attacker.hp = 100;
                    log = `💊 ${attacker.name} prend une potion (+${heal} PV)`;
                    color = 0x2ECC71; 
                }

                // --- VÉRIFICATION VICTOIRE (Adversaire KO) ---
                if (defender.hp <= 0) {
                    defender.hp = 0;
                    const finalEmbed = new EmbedBuilder()
                        .setColor(0xFFD700)
                        .setTitle(`👑 VICTOIRE DE ${attacker.name.toUpperCase()} !`)
                        .setDescription(`
                        **${attacker.name}** a mis K.O. **${defender.name}** !
                        
                        💀 ${defender.name} est au sol.
                        🎉 ${attacker.name} est le champion !
                        `)
                        .setThumbnail(attacker.user.displayAvatarURL());
                    
                    await i.update({ embeds: [finalEmbed], components: [] });
                    return fightCollector.stop();
                }

                // --- VÉRIFICATION SUICIDE (Attaquant KO) ---
                if (attacker.hp <= 0) {
                    attacker.hp = 0;
                    const finalEmbed = new EmbedBuilder()
                        .setColor(0xFFD700)
                        .setTitle(`🏆 VICTOIRE DE ${defender.name.toUpperCase()} !`)
                        .setDescription(`
                        😂 **${attacker.name}** s'est assommé tout seul !
                        
                        🎉 ${defender.name} gagne par défaut.
                        `);
                    
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
                        await message.edit({ content: "💤 Combat annulé (Temps écoulé).", components: [] }); 
                    } catch(e) {}
                }
            });
        };
    }
};