const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Braquer un membre')
        .addUserOption(option => 
            option.setName('victime')
                .setDescription('La personne à braquer')
                .setRequired(true)
        ),

    async execute(interactionOrMessage, args) {
        let robber, victimUser, replyFunc;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            robber = interactionOrMessage.user;
            victimUser = interactionOrMessage.options.getUser('victime');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            robber = interactionOrMessage.author;
            victimUser = interactionOrMessage.mentions.users.first();
            replyFunc = async (p) => { 
                const { ephemeral, ...o } = p; 
                return await interactionOrMessage.channel.send(o); 
            };
        }

        // Vérifications de base (Ephémère)
        if (!victimUser) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu dois mentionner quelqu'un à braquer.")], ephemeral: true });
        if (victimUser.id === robber.id) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas te braquer toi-même.")], ephemeral: true });
        if (victimUser.bot) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas braquer un robot.")], ephemeral: true });

        // ✅ Ajout de guildId pour les deux
        const robberData = await eco.get(robber.id, guildId);
        const victimData = await eco.get(victimUser.id, guildId);

        const now = Date.now();

        // --- 1. VÉRIFICATIONS PRISON ---
        if (robberData.jailEnd > now) {
            const timeLeft = Math.ceil((robberData.jailEnd - now) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Les barreaux t'empêchent de braquer.\nLibération dans : **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- 2. VÉRIFICATION COOLDOWN ---
        if (!robberData.cooldowns) robberData.cooldowns = {};
        const robCooldown = config.COOLDOWNS.ROB || 3600000; // 1h

        if (robberData.cooldowns.rob > now) {
            const timeLeft = Math.ceil((robberData.cooldowns.rob - now) / 60000);
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Trop chaud !", `🚓 La police te surveille... Attends **${timeLeft} min**.`)], 
                ephemeral: true 
            });
        }

        // Vérifs Argent
        if (victimData.cash < 100) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Cette personne est trop pauvre pour être volée.")], ephemeral: true });
        if (robberData.cash < 500) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Il te faut 500€ sur toi pour payer l'amende si tu te rates !")], ephemeral: true });

        // --- 3. SYSTÈME DE DÉFENSE (Bouclier) ---
        // ✅ Ajout de guildId
        if (await eco.hasItem(victimUser.id, guildId, 'shield')) {
            const breakChance = 0.20; 
            const isBroken = Math.random() < breakChance;

            // Application du cooldown au braqueur même si échec
            robberData.cooldowns.rob = now + robCooldown;
            await robberData.save();

            if (isBroken) {
                // ✅ Ajout de guildId
                await eco.removeItem(victimUser.id, guildId, 'shield');
                return replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, "🛡️ DÉFENSE BRISÉE !", `Le **Bouclier SWAT** de ${victimUser.username} t'a repoussé !\n⚠️ *Le choc a été si violent que son bouclier s'est brisé.*`).setColor(0x3498DB)] 
                });
            } else {
                return replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, "🛡️ MUR DE FER !", `Le **Bouclier SWAT** de ${victimUser.username} a bloqué ton attaque sans broncher.`).setColor(0x3498DB)] 
                });
            }
        }

        // --- 4. RÉSULTAT DU BRAQUAGE ---
        
        // Application du cooldown
        robberData.cooldowns.rob = now + robCooldown;

        const success = Math.random() < (config.PROBS?.ROB_SUCCESS || 0.5);

        if (success) {
            // Vol entre 10% et 30%
            const stolen = Math.floor(victimData.cash * (Math.random() * 0.2 + 0.1)); 
            
            // ✅ Ajout de guildId partout
            await eco.addCash(victimUser.id, guildId, -stolen);
            // Pour le braqueur, on peut utiliser addCash directement ou modifier l'objet
            await eco.addCash(robber.id, guildId, stolen);
            
            // XP & Stats
            // ✅ Ajout de guildId
            await eco.addStat(robber.id, guildId, 'crimes'); 
            const xpResult = await eco.addXP(robber.id, guildId, 50); 
            await robberData.save(); 

            // Embed Success
            const embed = embeds.success(interactionOrMessage, '🔫 Braquage réussi !', 
                `Tu as volé **${stolen} €** à ${victimUser.username}.\n✨ XP : **+50**`
            );

            let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;
            return replyFunc({ content: content, embeds: [embed] });

        } else {
            // Echec
            const amende = 500;
            // ✅ Ajout de guildId
            await eco.addCash(robber.id, guildId, -amende);
            
            // L'argent va à la police DU SERVEUR
            await eco.addBank('police_treasury', guildId, amende);
            await robberData.save();
            
            // Embed Error
            const embed = embeds.error(interactionOrMessage, '🚓 ALERTE !', 
                `La police passait par là.\nTu t'es fait attraper et tu paies **${amende} €** d'amende.\n*(Saisis par la Police)*`
            );
            return replyFunc({ embeds: [embed] });
        }
    }
};