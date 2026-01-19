const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hack')
        .setDescription('Pirater le compte bancaire d\'un membre (Nécessite un Laptop)')
        .addUserOption(option => 
            option.setName('victime')
                .setDescription('La cible du piratage')
                .setRequired(true)
        ),

    async execute(interactionOrMessage, args) {
        let hacker, victimUser, replyFunc;
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            hacker = interactionOrMessage.user;
            victimUser = interactionOrMessage.options.getUser('victime');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            hacker = interactionOrMessage.author;
            victimUser = interactionOrMessage.mentions.users.first();
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- 1. CONTRÔLES DE BASE ---
        if (!victimUser) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu dois cibler quelqu'un.")] });
        if (victimUser.id === hacker.id) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas te pirater toi-même.")] });
        if (victimUser.bot) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Impossible de pirater un système bot.")] });

        const hackerData = await eco.get(hacker.id, guildId);
        const victimData = await eco.get(victimUser.id, guildId);
        const now = Date.now();

        // Vérif Prison
        if (hackerData.jailEnd > now) {
            const timeLeft = Math.ceil((hackerData.jailEnd - now) / 60000);
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `🔒 **Pas de réseau en prison !** Reviens dans : **${timeLeft} minutes**.`)] });
        }

        // Vérif Matériel (Laptop requis)
        if (!await eco.hasItem(hacker.id, guildId, 'laptop')) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Matériel manquant", "Tu as besoin d'un **💻 PC Portable** pour hacker ! \n*(Achète-le au /shop)*")] });
        }

        // Vérif Cooldown
        if (!hackerData.cooldowns) hackerData.cooldowns = {};
        const hackCooldown = config.COOLDOWNS.HACK || 7200000; // 2h par défaut

        if (hackerData.cooldowns.hack > now) {
            const timeLeft = Math.ceil((hackerData.cooldowns.hack - now) / 60000);
            const timeDisplay = timeLeft > 60 ? `${Math.floor(timeLeft/60)}h ${timeLeft%60}min` : `${timeLeft} min`;
            return replyFunc({ embeds: [embeds.warning(interactionOrMessage, "IP Grillée", `Ton VPN recharge... Attends **${timeDisplay}**.`)] });
        }

        // Vérif Argent
        if (victimData.bank < 500) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Cible inintéressante", "Ce compte bancaire est presque vide.")] });
        if (hackerData.cash < 500) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Risque trop élevé", "Il te faut **500 €** en cash pour couvrir tes traces (VPN) en cas d'échec.")] });

        // Application Cooldown
        hackerData.cooldowns.hack = now + hackCooldown;
        await hackerData.save();

        // --- 2. SYSTÈME DE DÉFENSE (La nouveauté !) ---

        // A. ANTIVIRUS (35% chance de détection)
        if (await eco.hasItem(victimUser.id, guildId, 'antivirus')) {
            if (Math.random() < 0.35) {
                const fine = 300; // Frais de nettoyage de traces
                await eco.addCash(hacker.id, guildId, -fine);

                return replyFunc({ 
                    embeds: [embeds.error(interactionOrMessage, "🦠 VIRUS DÉTECTÉ", 
                        `L'**Antivirus** de ${victimUser.username} a repéré ton intrusion !\n` +
                        `Tu coupes la connexion en urgence et paies **${fine} €** pour effacer tes logs.`)] 
                });
            }
        }

        // B. CADENAS (Clé 2FA - Usage unique, bloque à 100%)
        if (await eco.hasItem(victimUser.id, guildId, 'lock')) {
            await eco.removeItem(victimUser.id, guildId, 'lock');
            
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "🔒 2FA ACTIVÉ", 
                    `Tu as le mot de passe, mais la **Clé de sécurité (Cadenas)** de ${victimUser.username} a bloqué l'accès.\n` +
                    `*La clé a été grillée par l'attaque, mais le compte est sauf.*`)] 
            });
        }

        // C. PARE-FEU / FIREWALL (75% blocage, 10% surchauffe)
        if (await eco.hasItem(victimUser.id, guildId, 'firewall')) {
            if (Math.random() < 0.75) {
                const fireBreak = Math.random() < 0.10;
                let msg = `Le **Pare-feu** de ${victimUser.username} a rejeté toutes tes requêtes !`;

                if (fireBreak) {
                    await eco.removeItem(victimUser.id, guildId, 'firewall');
                    msg += `\n🔥 *L'attaque était si intense que son Pare-feu a surchauffé et a grillé !*`;
                }

                return replyFunc({ embeds: [embeds.error(interactionOrMessage, "🔥 ACCÈS REJETÉ", msg)] });
            }
        }

        // --- 3. RÉSULTAT DU HACK ---

        const success = Math.random() < 0.40; // 40% de réussite brute

        if (success) {
            // Gain : 5% à 20% de la BANQUE
            const percent = Math.random() * 0.15 + 0.05;
            const stolen = Math.floor(victimData.bank * percent);

            await eco.addBank(victimUser.id, guildId, -stolen);
            await eco.addCash(hacker.id, guildId, stolen);

            await eco.addStat(hacker.id, guildId, 'hacks');
            const xpResult = await eco.addXP(hacker.id, guildId, 100);

            const embed = embeds.success(interactionOrMessage, '💻 HACK RÉUSSI', 
                `Tu as contourné les sécurités de ${victimUser.username}...\n` +
                `💰 Transfert : **${stolen} €** virés sur ton compte !`
            );
            if (xpResult.leveledUp) embed.setFooter({ text: `LEVEL UP ! Tu es niveau ${xpResult.newLevel}` });

            return replyFunc({ embeds: [embed] });

        } else {
            // ÉCHEC CRITIQUE
            const amende = 500;
            await eco.addCash(hacker.id, guildId, -amende);
            await eco.addBank('police_treasury', guildId, amende);

            // Risque : Le Laptop grille (5%)
            const laptopBreak = Math.random() < 0.05; 
            let msg = `Le système t'a repéré. Tu as dû payer **${amende} €** pour disparaître.`;

            if (laptopBreak) {
                await eco.removeItem(hacker.id, guildId, 'laptop');
                msg += `\n💀 **FATAL ERROR !** Ton **Laptop** a reçu une décharge électrique et a grillé !`;
            }

            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, '🚫 ACCÈS REFUSÉ', msg)] 
            });
        }
    }
};