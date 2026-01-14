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

        // Gestion Hybride (Slash / Prefix)
        if (interactionOrMessage.isCommand?.()) {
            targetChannel = interactionOrMessage.options.getChannel('salon') || interactionOrMessage.channel;
            isGlobal = interactionOrMessage.options.getBoolean('tout_le_serveur');
            replyFunc = (msg) => interactionOrMessage.reply(msg);
        } else {
            // Commande Prefix (+unlock, +unlock #general, +unlock all)
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
            else await interactionOrMessage.channel.send("🔄 **Déverrouillage du serveur en cours...**");

            const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
            let count = 0;

            for (const [id, channel] of channels) {
                try {
                    // On remet la permission SendMessages à "null" (par défaut / synchronisé)
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
                    count++;
                } catch (e) {
                    // On ignore les erreurs silencieusement pour le global (ex: salons privés admins)
                }
            }

            const msg = `🔓 **FIN DE L'ALERTE !**\n${count} salons ont été rouverts au public.`;
            
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.editReply(msg);
            return interactionOrMessage.channel.send(msg);
        }

        // --- 3. MODE SIMPLE (UN SALON) ---
        if (!targetChannel) return replyFunc({ content: "❌ Salon invalide.", ephemeral: true });

        try {
            // --- VERIFICATION (Est-ce déjà unlock ?) ---
            const currentOverwrites = targetChannel.permissionOverwrites.cache.get(guild.roles.everyone.id);

            // Si :
            // 1. Il n'y a pas d'overwrites spécifiques (donc c'est par défaut)
            // 2. OU l'overwrite ne contient PAS de refus pour SendMessages
            // ALORS c'est déjà ouvert.
            if (!currentOverwrites || !currentOverwrites.deny.has(PermissionFlagsBits.SendMessages)) {
                return replyFunc({ content: `⚠️ Le salon **${targetChannel}** est déjà ouvert !`, ephemeral: true });
            }

            // Sinon on déverrouille (remise à zéro)
            await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            return replyFunc(`🔓 **${targetChannel}** a été déverrouillé.`);

        } catch (e) {
            console.log(e);
            return replyFunc({ content: "❌ Je n'ai pas la permission de gérer ce salon.", ephemeral: true });
        }
    }
};