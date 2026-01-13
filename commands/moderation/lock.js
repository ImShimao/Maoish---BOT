const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verrouille un salon ou tout le serveur')
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Le salon à verrouiller (Vide = Actuel)')
                .addChannelTypes(ChannelType.GuildText))
        .addBooleanOption(option => 
            option.setName('tout_le_serveur')
                .setDescription('⚠️ Verrouiller TOUS les salons textuels ?'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interactionOrMessage, args) {
        // --- 1. INITIALISATION ---
        let targetChannel, isGlobal, replyFunc;
        const guild = interactionOrMessage.guild;

        // Gestion Hybride (Slash / Prefix)
        if (interactionOrMessage.isCommand?.()) {
            targetChannel = interactionOrMessage.options.getChannel('salon') || interactionOrMessage.channel;
            isGlobal = interactionOrMessage.options.getBoolean('tout_le_serveur');
            replyFunc = (msg) => interactionOrMessage.reply(msg);
        } else {
            // Commande Prefix (+lock, +lock #general, +lock all)
            replyFunc = (msg) => interactionOrMessage.channel.send(msg);
            
            if (args && (args[0] === 'all' || args[0] === '*' || args[0] === 'server')) {
                isGlobal = true;
            } else {
                targetChannel = interactionOrMessage.mentions.channels.first() || interactionOrMessage.channel;
            }
        }

        // --- 2. MODE GLOBAL (TOUT LE SERVEUR) ---
        if (isGlobal) {
            // On prévient que ça commence
            if (interactionOrMessage.isCommand?.()) await interactionOrMessage.deferReply();
            else await interactionOrMessage.channel.send("🔄 **Verrouillage du serveur en cours...**");

            const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
            let count = 0;

            for (const [id, channel] of channels) {
                try {
                    // On refuse l'envoi de messages pour @everyone
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
                    count++;
                } catch (e) {
                    console.log(`Erreur lock ${channel.name}: ${e.message}`);
                }
            }

            const msg = `🔒 **ALERTE GÉNÉRALE !**\n${count} salons ont été verrouillés par sécurité.`;
            
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.editReply(msg);
            return interactionOrMessage.channel.send(msg);
        }

        // --- 3. MODE SIMPLE (UN SALON) ---
        if (!targetChannel) return replyFunc("❌ Salon invalide.");

        try {
            await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            return replyFunc(`🔒 **${targetChannel}** a été verrouillé.`);
        } catch (e) {
            return replyFunc("❌ Je n'ai pas la permission de gérer ce salon.");
        }
    }
};