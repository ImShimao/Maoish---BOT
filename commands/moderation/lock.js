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

        // Gestion Hybride
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
            else await interactionOrMessage.channel.send("🔄 **Verrouillage du serveur en cours...**");

            const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
            let count = 0;

            for (const [id, channel] of channels) {
                try {
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
                    count++;
                } catch (e) { }
            }

            const msg = `🔒 **ALERTE GÉNÉRALE !**\n${count} salons ont été verrouillés par sécurité.`;
            
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.editReply(msg);
            return interactionOrMessage.channel.send(msg);
        }

        // --- 3. MODE SIMPLE (UN SALON) ---
        if (!targetChannel) return replyFunc({ content: "❌ Salon invalide.", ephemeral: true });

        try {
            // --- VERIFICATION (Est-ce déjà lock ?) ---
            // On récupère les permissions spécifiques du rôle @everyone dans ce salon
            const currentOverwrites = targetChannel.permissionOverwrites.cache.get(guild.roles.everyone.id);
            
            // Si des perms existent ET que SendMessages est DÉJÀ refusé (false)
            if (currentOverwrites && currentOverwrites.deny.has(PermissionFlagsBits.SendMessages)) {
                return replyFunc({ content: `⚠️ Le salon **${targetChannel}** est déjà verrouillé !`, ephemeral: true });
            }

            // Sinon on verrouille
            await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            return replyFunc(`🔒 **${targetChannel}** a été verrouillé.`);
        } catch (e) {
            console.log(e);
            return replyFunc({ content: "❌ Je n'ai pas la permission de gérer ce salon.", ephemeral: true });
        }
    }
};