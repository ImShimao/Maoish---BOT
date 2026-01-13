const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverrouille un salon ou tout le serveur')
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Le salon à déverrouiller (Vide = Actuel)')
                .addChannelTypes(ChannelType.GuildText))
        .addBooleanOption(option => 
            option.setName('tout_le_serveur')
                .setDescription('⚠️ Déverrouiller TOUS les salons textuels ?'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interactionOrMessage, args) {
        // --- 1. INITIALISATION ---
        let targetChannel, isGlobal, replyFunc;
        const guild = interactionOrMessage.guild;

        if (interactionOrMessage.isCommand?.()) {
            targetChannel = interactionOrMessage.options.getChannel('salon') || interactionOrMessage.channel;
            isGlobal = interactionOrMessage.options.getBoolean('tout_le_serveur');
            replyFunc = (msg) => interactionOrMessage.reply(msg);
        } else {
            replyFunc = (msg) => interactionOrMessage.channel.send(msg);
            
            if (args && (args[0] === 'all' || args[0] === '*' || args[0] === 'server')) {
                isGlobal = true;
            } else {
                targetChannel = interactionOrMessage.mentions.channels.first() || interactionOrMessage.channel;
            }
        }

        // --- 2. MODE GLOBAL ---
        if (isGlobal) {
            if (interactionOrMessage.isCommand?.()) await interactionOrMessage.deferReply();
            else await interactionOrMessage.channel.send("🔄 **Déverrouillage du serveur en cours...**");

            const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
            let count = 0;

            for (const [id, channel] of channels) {
                try {
                    // "null" remet la permission par défaut (neutre), ce qui retire le verrouillage
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
                    count++;
                } catch (e) {
                    console.log(`Erreur unlock ${channel.name}: ${e.message}`);
                }
            }

            const msg = `🔓 **LEVÉE DE L'ALERTE !**\n${count} salons ont été réouverts aux membres.`;
            
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.editReply(msg);
            return interactionOrMessage.channel.send(msg);
        }

        // --- 3. MODE SIMPLE ---
        if (!targetChannel) return replyFunc("❌ Salon invalide.");

        try {
            await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            return replyFunc(`🔓 **${targetChannel}** a été déverrouillé.`);
        } catch (e) {
            return replyFunc("❌ Je n'ai pas la permission de gérer ce salon.");
        }
    }
};