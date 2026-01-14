const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

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
        let robber, victimUser;

        // --- GESTION HYBRIDE ET RÉPONSE SÉCURISÉE ---
        if (interactionOrMessage.isCommand?.()) {
            robber = interactionOrMessage.user;
            victimUser = interactionOrMessage.options.getUser('victime');
        } else {
            robber = interactionOrMessage.author;
            victimUser = interactionOrMessage.mentions.users.first();
        }

        // Fonction de réponse hybride
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { 
                const { ephemeral, ...o } = p; 
                return interactionOrMessage.channel.send(o); 
            };

        // Helper pour les Embeds simples
        const sendEmbed = (text, color, ephemeral = false) => {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(text)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });
            return replyFunc({ embeds: [embed], ephemeral: ephemeral });
        };

        // Vérifications de base (Ephémère)
        if (!victimUser) return sendEmbed("❌ Tu dois mentionner quelqu'un à braquer.", config.COLORS.ERROR, true);
        if (victimUser.id === robber.id) return sendEmbed("❌ Tu ne peux pas te braquer toi-même.", config.COLORS.ERROR, true);
        if (victimUser.bot) return sendEmbed("❌ Tu ne peux pas braquer un robot.", config.COLORS.ERROR, true);

        const robberData = await eco.get(robber.id);
        const now = Date.now();

        // --- 1. VÉRIFICATIONS PRISON (Ephémère) ---
        if (robberData.jailEnd > now) {
            const timeLeft = Math.ceil((robberData.jailEnd - now) / 60000);
            return sendEmbed(`🔒 **Tu es en PRISON !** Les barreaux t'empêchent de braquer.\nLibération dans : **${timeLeft} minutes**.`, config.COLORS.ERROR, true);
        }

        // SÉCURITÉ OBJET COOLDOWNS
        if (!robberData.cooldowns) robberData.cooldowns = {};

        // Utilisation de la CONFIG
        const robCooldown = config.COOLDOWNS.ROB || 3600000; // 1h par défaut

        // --- 2. VÉRIFICATION COOLDOWN (Ephémère) ---
        if (robberData.cooldowns.rob > now) {
            const timeLeft = Math.ceil((robberData.cooldowns.rob - now) / 60000);
            return sendEmbed(`🚓 La police te surveille... Attends **${timeLeft} min**.`, 0xE67E22, true);
        }

        const victimData = await eco.get(victimUser.id);
        
        // Vérifs Argent (Ephémère)
        if (victimData.cash < 100) return sendEmbed("❌ Cette personne est trop pauvre pour être volée.", config.COLORS.ERROR, true);
        if (robberData.cash < 500) return sendEmbed("❌ Il te faut 500€ sur toi pour payer l'amende si tu te rates !", config.COLORS.ERROR, true);

        // =========================================================
        // --- 3. SYSTÈME DE DÉFENSE (Objets) ---
        // =========================================================

        // Bouclier
        if (await eco.hasItem(victimUser.id, 'shield')) {
            const breakChance = 0.20; 
            const isBroken = Math.random() < breakChance;

            // Application du cooldown au braqueur même si échec
            robberData.cooldowns.rob = now + robCooldown;
            await robberData.save();

            if (isBroken) {
                await eco.removeItem(victimUser.id, 'shield');
                return sendEmbed(`🛡️ **IMPOSSIBLE !** Le **Bouclier SWAT** de ${victimUser.username} t'a repoussé !\n⚠️ *Le choc a été si violent que son bouclier s'est brisé.*`, 0x3498DB);
            } else {
                return sendEmbed(`🛡️ **MUR DE FER !** Le **Bouclier SWAT** de ${victimUser.username} a bloqué ton attaque sans broncher.`, 0x3498DB);
            }
        }

        // =========================================================
        // --- 4. RÉSULTAT DU BRAQUAGE ---
        // =========================================================
        
        // Application du cooldown pour la tentative
        robberData.cooldowns.rob = now + robCooldown;

        // Chance de réussite (Défaut 50%)
        const success = Math.random() < (config.PROBS?.ROB_SUCCESS || 0.5);

        if (success) {
            // Vol entre 10% et 30% de la victime
            const stolen = Math.floor(victimData.cash * (Math.random() * 0.2 + 0.1)); 
            
            await eco.addCash(victimUser.id, -stolen);
            robberData.cash += stolen; 
            
            // --- AJOUT XP ET STATS ---
            await eco.addStat(robber.id, 'crimes'); 
            const xpResult = await eco.addXP(robber.id, 50); // +50 XP (Gros gain)

            await robberData.save(); 

            // Construction manuelle de la réponse pour inclure le Level Up
            const embed = new EmbedBuilder()
                .setColor(config.COLORS.SUCCESS)
                .setDescription(`🔫 **Braquage réussi !**\nTu as volé **${stolen} €** à ${victimUser.username}.\n✨ XP : **+50**`)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });

            let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : "";
            
            return replyFunc({ content: content, embeds: [embed] });

        } else {
            const amende = 500;
            // On retire l'argent au braqueur
            await eco.addCash(robber.id, -amende);
            
            // --- AJOUT AU COFFRE DE LA POLICE ---
            await eco.addBank('police_treasury', amende);

            await robberData.save();
            
            // Pas d'XP en cas d'échec
            return sendEmbed(`🚓 **ALERTE !** La police passait par là.\nTu t'es fait attraper et tu paies **${amende} €** d'amende.\n*(Saisis par la Police)*`, config.COLORS.ERROR);
        }
    }
};