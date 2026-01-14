const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hack')
        .setDescription('Pirater le compte bancaire d\'un joueur (PC Portable requis)')
        .addUserOption(o => o.setName('cible').setDescription('Qui pirater ?').setRequired(true)),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const targetUser = interactionOrMessage.isCommand?.() 
            ? interactionOrMessage.options.getUser('cible') 
            : interactionOrMessage.mentions.users.first();
        
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        if (!targetUser || targetUser.bot || targetUser.id === user.id) return replyFunc("❌ Cible invalide.");

        const hackerData = await eco.get(user.id);
        const victimData = await eco.get(targetUser.id);
        const now = Date.now();

        // 1. Vérifications (Prison & Cooldown)
        if (hackerData.jailEnd > now) return replyFunc("🔒 Tu ne peux pas hacker depuis la prison (pas de Wi-Fi).");

        // Cooldown de 10 minutes pour le Hack
        if (!hackerData.cooldowns) hackerData.cooldowns = {};
        if (!hackerData.cooldowns.hack) hackerData.cooldowns.hack = 0;

        if (hackerData.cooldowns.hack > now) {
            const timeLeft = Math.ceil((hackerData.cooldowns.hack - now) / 60000);
            return replyFunc(`⏳ **Proxy saturé.** Attends encore **${timeLeft} minutes** avant de relancer une attaque.`);
        }

        // 2. Vérification Outil
        if (!await eco.hasItem(user.id, 'laptop')) {
            return replyFunc("❌ Tu as besoin d'un **💻 PC Portable** pour hacker ! Achète-le au `/shop`.");
        }

        // 3. Vérification Richesse Victime
        if (victimData.cash < 500) return replyFunc(`❌ **${targetUser.username}** est trop pauvre, ça ne vaut pas la bande passante.`);

        // 4. Anti-Spam (Application immédiate)
        hackerData.cooldowns.hack = now + (10 * 60 * 1000); // 10 minutes
        await hackerData.save();

        // 5. Logique du Hack
        // 40% de chance de réussite (le Laptop est puissant mais le firewall aussi)
        const success = Math.random() < 0.40;

        if (success) {
            // SUCCÈS : On vole entre 10% et 25% du cash de la victime
            const percent = Math.random() * 0.15 + 0.10; 
            const stolen = Math.floor(victimData.cash * percent);

            await eco.addCash(targetUser.id, -stolen);
            await eco.addCash(user.id, stolen);

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.SUCCESS || 0x2ECC71)
                .setTitle('💻 Piratage Réussi')
                .setDescription(`Tu as contourné le pare-feu de **${targetUser.username}** !\n\n💸 Gain : **${stolen} €** transférés sur ton compte crypté.`)
                .setFooter({ text: 'Anonymous Protocol' });

            return replyFunc({ embeds: [embed] });

        } else {
            // ÉCHEC : Amende (VPN Leak)
            const fine = 1000; // Amende salée
            await eco.addCash(user.id, -fine);
            
            // Petit message drôle pour l'échec
            const fails = [
                "Ton VPN a lâché ! La cyber-police t'a tracé.",
                "Tu as cliqué sur une pub par erreur... Virus !",
                "Le mot de passe n'était pas '123456' finalement.",
                "La cible a activé la double authentification. Zut !"
            ];
            const failReason = fails[Math.floor(Math.random() * fails.length)];

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR || 0xE74C3C)
                .setTitle('💻 Accès Refusé')
                .setDescription(`🚫 **Échec du piratage !**\n${failReason}\n\nTu as dû payer **${fine} €** pour effacer tes traces.`)
                .setFooter({ text: 'System Error' });

            return replyFunc({ embeds: [embed] });
        }
    }
};