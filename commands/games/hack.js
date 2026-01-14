const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hack')
        .setDescription('Pirater le compte bancaire d\'un joueur (PC Portable requis)')
        .addUserOption(o => o.setName('cible').setDescription('Qui pirater ?').setRequired(true)),

    async execute(interactionOrMessage) {
        let user, targetUser, replyFunc;

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

        if (!targetUser || targetUser.bot || targetUser.id === user.id) return replyFunc({ content: "❌ Cible invalide.", ephemeral: true });

        const hackerData = await eco.get(user.id);
        const victimData = await eco.get(targetUser.id);
        const now = Date.now();
        const fine = 2500; // Le coût de l'amende en cas d'échec

        // --- 1. VÉRIFICATION PRISON ---
        if (hackerData.jailEnd > now) return replyFunc({ content: "🔒 Tu ne peux pas hacker depuis la prison (pas de Wi-Fi).", ephemeral: true });

        // --- 2. VÉRIFICATION COOLDOWN ---
        if (!hackerData.cooldowns) hackerData.cooldowns = {};
        
        if (hackerData.cooldowns.hack > now) {
            const timeLeft = Math.ceil((hackerData.cooldowns.hack - now) / 60000);
            return replyFunc({ content: `⏳ **Proxy saturé.** Attends encore **${timeLeft} minutes** avant de relancer une attaque.`, ephemeral: true });
        }

        // --- 3. VÉRIFICATION MATÉRIEL ---
        if (!await eco.hasItem(user.id, 'laptop')) {
            return replyFunc({ content: "❌ Tu as besoin d'un **💻 PC Portable** pour hacker ! Achète-le au `/shop`.", ephemeral: true });
        }

        // --- 4. VÉRIFICATION SOLVABILITÉ ---
        // On vérifie si le hacker a assez de cash pour payer l'amende
        if (hackerData.cash < fine) {
            return replyFunc({ 
                content: `❌ **Risque trop élevé !**\nTu as besoin d'au moins **${fine} €** en liquide pour couvrir tes traces (payer l'amende) en cas d'échec.`, 
                ephemeral: true 
            });
        }

        // --- 5. VÉRIFICATION VICTIME ---
        if (victimData.bank < 500) return replyFunc({ content: `❌ Le compte bancaire de **${targetUser.username}** est vide ou trop sécurisé (Moins de 500€).`, ephemeral: true });

        // --- 6. APPLICATION DU COOLDOWN ---
        const cooldownAmount = config.COOLDOWNS.HACK || 7200000; // 2h par défaut
        hackerData.cooldowns.hack = now + cooldownAmount;
        await hackerData.save();

        // --- 7. LOGIQUE HACK ---
        const success = Math.random() < 0.40; // 40% de chance

        if (success) {
            const stolen = Math.floor(victimData.bank * (Math.random() * 0.10 + 0.10)); // 10% à 20% de la banque
            await eco.addBank(targetUser.id, -stolen);
            await eco.addBank(user.id, stolen);

            // --- AJOUT XP ET STATS ---
            await eco.addStat(user.id, 'hacks'); // Statistique 'hacks'
            const xpResult = await eco.addXP(user.id, 60); // Gros gain d'XP (60)

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.SUCCESS || 0x2ECC71)
                .setTitle('💻 Piratage Bancaire Réussi')
                .setDescription(`Tu as infiltré la banque de **${targetUser.username}** !\n\n💸 Gain : **${stolen} €** transférés sur ton compte bancaire.\n✨ XP : **+60**`)
                .setFooter({ text: 'Anonymous Protocol' });

            // Notification Level Up
            let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : "";

            return replyFunc({ content: content, embeds: [embed] });
        } else {
            // Echec : Le joueur paie l'amende (on sait qu'il a l'argent grâce à la vérif étape 4)
            await eco.addCash(user.id, -fine);

            // --- AJOUT AU COFFRE DE LA POLICE ---
            await eco.addBank('police_treasury', fine); 
            
            const fails = [
                "Ton VPN a lâché ! La cyber-police t'a tracé.",
                "Tu as cliqué sur une pub par erreur... Virus !",
                "Le pare-feu de la banque était trop puissant.",
                "La cible a activé la double authentification (2FA). Zut !"
            ];
            const failReason = fails[Math.floor(Math.random() * fails.length)];

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR || 0xE74C3C)
                .setTitle('💻 Accès Refusé')
                .setDescription(`🚫 **Échec du piratage !**\n${failReason}\n\nTu as dû payer **${fine} €** pour effacer tes traces numériques.\n*(Fonds saisis par la Cyber-Police)*`);

            return replyFunc({ embeds: [embed] });
        }
    }
};