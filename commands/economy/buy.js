const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Acheter un objet')
        .addStringOption(o => o.setName('objet').setDescription('vip, cookie').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, item;
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            item = interactionOrMessage.options.getString('objet').toLowerCase();
            await interactionOrMessage.deferReply();
        } else {
            user = interactionOrMessage.author;
            item = args[0]?.toLowerCase();
        }

        const reply = async (txt) => {
            if (interactionOrMessage.isCommand?.()) interactionOrMessage.editReply(txt);
            else interactionOrMessage.channel.send(txt);
        };

        const data = eco.get(user.id);

        if (item === 'cookie') {
            if (data.cash < 100) return reply("❌ Pas assez d'argent (100€).");
            eco.addCash(user.id, -100);
            return reply("🍪 Tu as acheté un cookie ! Miam.");
        }
        
        else if (item === 'vip') {
            if (data.cash < 10000) return reply("❌ Pas assez d'argent (10.000€).");
            
            // Logique pour donner le rôle (nécessite que le rôle existe)
            const guild = interactionOrMessage.guild;
            const role = guild.roles.cache.find(r => r.name === 'VIP');
            
            if (!role) return reply("❌ Le rôle 'VIP' n'existe pas sur ce serveur. Demande à un admin de le créer.");
            
            try {
                const member = await guild.members.fetch(user.id);
                await member.roles.add(role);
                eco.addCash(user.id, -10000);
                return reply("👑 **Félicitations !** Tu es maintenant VIP !");
            } catch (e) {
                return reply("❌ Je n'ai pas la permission de te donner ce rôle (vérifie ma place dans la liste des rôles).");
            }
        }

        else {
            return reply("❌ Objet inconnu. Regarde le `/shop`.");
        }
    }
};