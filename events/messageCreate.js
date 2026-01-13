const { Events, Collection, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // 1. On ignore les bots et les messages sans préfixe
        if (message.author.bot || !message.content.startsWith('+') || !message.guild) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = message.client.commands.get(commandName);

        if (!command) return;

        // --- 2. GESTION DES COOLDOWNS (ANTI-SPAM) ---
        // On vérifie si la collection 'cooldowns' existe, sinon on la crée
        if (!message.client.cooldowns) {
            message.client.cooldowns = new Collection();
        }

        const { cooldowns } = message.client;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        // TEMPS D'ATTENTE PAR DÉFAUT : 5 secondes (5000 ms)
        // Tu peux changer 5000 par ce que tu veux
        const cooldownAmount = 5000; 

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                
                // Optionnel : On réagit avec un sablier pour dire "Attends !"
                await message.react('⏳').catch(() => {});
                
                // On peut aussi envoyer un message qui s'autodétruit
                /*
                const reply = await message.reply(`⏳ Doucement ! Attends ${timeLeft.toFixed(1)} secondes.`);
                setTimeout(() => reply.delete().catch(() => {}), 2000);
                */
                
                return; // ON ARRÊTE TOUT ICI : La commande ne se lance pas.
            }
        }

        timestamps.set(message.author.id, now);
        // On supprime l'utilisateur de la liste après le délai
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);


        // --- 3. VERIFICATION SÉCURITÉ (Permissions) ---
        if (command.data.default_member_permissions) {
            if (!message.member.permissions.has(command.data.default_member_permissions)) {
                return message.reply("⛔ **Tu n'as pas la permission d'utiliser cette commande.**");
            }
        }

        // --- 4. EXÉCUTION ---
        try { 
            await command.execute(message, args); 
        } 
        catch (e) { 
            console.error(e); 
            message.reply('❌ Erreur lors de l\'exécution.'); 
        }
    },
};