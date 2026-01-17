const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hack')
        .setDescription('Pirater le compte bancaire d\'un joueur (PC Portable requis)')
        .addUserOption(o => o.setName('cible').setDescription('Qui pirater ?').setRequired(true)),

    async execute(interactionOrMessage) {
        let user, targetUser, replyFunc;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            targetUser = interactionOrMessage.options.getUser('cible');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            targetUser = interactionOrMessage.mentions.users.first();
            replyFunc = async (p) => { 
                const { ephemeral, ...o } = p; 
                return await interactionOrMessage.channel.send(o); 
            };
        }

        if (!targetUser || targetUser.bot || targetUser.id === user.id) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Cible invalide.")], ephemeral: true });
        }

        // ✅ Ajout de guildId pour les deux
        const hackerData = await eco.get(user.id, guildId);
        const victimData = await eco.get(targetUser.id, guildId);
        
        const now = Date.now();
        const fine = 2500; // Le coût de l'amende

        // --- 1. VÉRIFICATION PRISON ---
        if (hackerData.jailEnd > now) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "🔒 Tu ne peux pas hacker depuis la prison (pas de Wi-Fi).")], ephemeral: true });
        }

        // --- 2. VÉRIFICATION COOLDOWN ---
        if (!hackerData.cooldowns) hackerData.cooldowns = {};
        
        if (hackerData.cooldowns.hack > now) {
            const timeLeft = Math.ceil((hackerData.cooldowns.hack - now) / 60000);
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Proxy saturé", `Attends encore **${timeLeft} minutes** avant de relancer une attaque.`)], 
                ephemeral: true 
            });
        }

        // --- 3. VÉRIFICATION MATÉRIEL ---
        // ✅ Ajout de guildId
        if (!await eco.hasItem(user.id, guildId, 'laptop')) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "❌ Tu as besoin d'un **💻 PC Portable** pour hacker ! Achète-le au `/shop`.")], 
                ephemeral: true 
            });
        }

        // --- 4. VÉRIFICATION SOLVABILITÉ ---
        if (hackerData.cash < fine) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `❌ **Risque trop élevé !**\nTu as besoin d'au moins **${fine} €** en liquide pour couvrir tes traces.`)], 
                ephemeral: true 
            });
        }

        // --- 5. VÉRIFICATION VICTIME ---
        if (victimData.bank < 500) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `Le compte bancaire de **${targetUser.username}** est vide ou trop sécurisé (Moins de 500€).`)], 
                ephemeral: true 
            });
        }

        // --- 6. APPLICATION DU COOLDOWN ---
        const cooldownAmount = config.COOLDOWNS.HACK || 7200000; // 2h
        hackerData.cooldowns.hack = now + cooldownAmount;
        await hackerData.save();

        // --- 7. LOGIQUE HACK ---
        const success = Math.random() < 0.40; // 40% de chance

        if (success) {
            const stolen = Math.floor(victimData.bank * (Math.random() * 0.10 + 0.10)); // 10-20%
            
            // ✅ Ajout de guildId partout
            await eco.addBank(targetUser.id, guildId, -stolen);
            await eco.addBank(user.id, guildId, stolen);

            // --- XP ET STATS ---
            // ✅ Ajout de guildId
            await eco.addStat(user.id, guildId, 'hacks'); 
            const xpResult = await eco.addXP(user.id, guildId, 60); 

            // Utilisation de embeds.success
            const embed = embeds.success(interactionOrMessage, '💻 Piratage Bancaire Réussi', 
                `Tu as infiltré la banque de **${targetUser.username}** !\n\n💸 Gain : **${stolen} €** transférés sur ton compte.\n✨ XP : **+60**`
            )
            .setFooter({ text: 'Anonymous Protocol' });

            let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;

            return replyFunc({ content: content, embeds: [embed] });
        } else {
            // Echec : Le joueur paie l'amende
            // ✅ Ajout de guildId
            await eco.addCash(user.id, guildId, -fine);
            // L'argent va à la police DU SERVEUR
            await eco.addBank('police_treasury', guildId, fine); 
            
            const fails = [
                "Ton VPN a lâché ! La cyber-police t'a tracé.", "Tu as cliqué sur une pub par erreur... Virus !",
                "Le pare-feu de la banque était trop puissant.", "La cible a activé la double authentification (2FA). Zut !"
            ];
            const failReason = fails[Math.floor(Math.random() * fails.length)];

            // Utilisation de embeds.error
            const embed = embeds.error(interactionOrMessage, 
                `🚫 **Échec du piratage !**\n${failReason}\n\nTu as dû payer **${fine} €** pour effacer tes traces numériques.\n*(Fonds saisis par la Cyber-Police)*`
            )
            .setTitle('💻 Accès Refusé');

            return replyFunc({ embeds: [embed] });
        }
    }
};