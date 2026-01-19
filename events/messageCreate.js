const { Events, Collection, EmbedBuilder } = require('discord.js');
const eco = require('../utils/eco.js');
const leveling = require('../utils/leveling.js'); // Assure-toi d'importer leveling si tu l'utilises directement, ou via eco
const config = require('../config.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // 1. On ignore les bots et les messages hors serveurs
        if (message.author.bot || !message.guild) return;

        // --- A. SYSTÈME XP PAR MESSAGE (TEXTE) ---
        // On donne de l'XP si ce n'est PAS une commande
        if (!message.content.startsWith(config.PREFIX)) {
            try {
                const guildId = message.guild.id; // ✅ On récupère l'ID du serveur

                // ✅ On passe guildId ici
                const userData = await eco.get(message.author.id, guildId);
                const now = Date.now();
                const xpCooldown = 60000; // 1 minute

                if (!userData.lastXpMessage || (now - userData.lastXpMessage) > xpCooldown) {
                    const xpToGive = Math.floor(Math.random() * 11) + 15; // 15 à 25 XP
                    
                    // ✅ Et on passe guildId ici aussi (via eco ou leveling selon ton import)
                    // Si 'addXP' est dans eco.js :
                    const result = await eco.addXP(message.author.id, guildId, xpToGive);
                    // Si 'addXP' est dans leveling.js :
                    // const result = await leveling.addXP(message.author.id, guildId, xpToGive);
                    
                    userData.lastXpMessage = now;
                    await userData.save();

                    if (result && result.leveledUp) {
                        await message.channel.send(`🎉 **Bravo <@${message.author.id}> !** Tu passes au **Niveau ${result.newLevel}** !`);
                    }
                }
            } catch (err) {
                console.error("Erreur système XP message:", err);
            }
        }

        // --- B. GESTION DES COMMANDES ---
        if (!message.content.startsWith('+')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = message.client.commands.get(commandName);

        if (!command) return;

        // Cooldowns
        if (!message.client.cooldowns) {
            message.client.cooldowns = new Collection();
        }

        const { cooldowns } = message.client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = 5000; // 5 secondes

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                await message.react('⏳').catch(() => {});
                return;
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        // Permissions
        if (command.data.default_member_permissions) {
            if (!message.member.permissions.has(command.data.default_member_permissions)) {
                return message.reply("⛔ **Tu n'as pas la permission d'utiliser cette commande.**");
            }
        }

        // Exécution sécurisée
        try { 
            await command.execute(message, args); 
        } 
        catch (e) { 
            console.error(`Erreur commande ${commandName}:`, e); 
            // On s'assure d'envoyer un VRAI message non vide
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ Une erreur est survenue lors de l\'exécution de la commande.');
            
            await message.reply({ embeds: [errorEmbed] }).catch(() => message.channel.send('❌ Erreur critique.'));
        }
    },
};