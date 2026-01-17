const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

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

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            targetChannel = interactionOrMessage.options.getChannel('salon') || interactionOrMessage.channel;
            isGlobal = interactionOrMessage.options.getBoolean('tout_le_serveur');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Préfixe
            // 1. Permissions (Vital !)
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu dois avoir la permission `Gérer les salons` pour faire ça.")] 
                });
            }

            // 2. Arguments
            if (args && (args[0] === 'all' || args[0] === '*' || args[0] === 'server')) {
                isGlobal = true;
            } else {
                targetChannel = interactionOrMessage.mentions.channels.first() || interactionOrMessage.channel;
            }
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- 2. MODE GLOBAL (TOUT LE SERVEUR) ---
        if (isGlobal) {
            let msg;
            // Feedback "En cours"
            const loadingEmbed = embeds.warning(interactionOrMessage, "Déverrouillage en cours...", "Réouverture de tous les salons textuels, veuillez patienter.");
            
            if (interactionOrMessage.isCommand?.()) {
                await interactionOrMessage.deferReply();
                msg = await interactionOrMessage.editReply({ embeds: [loadingEmbed] });
            } else {
                msg = await interactionOrMessage.channel.send({ embeds: [loadingEmbed] });
            }

            // Action
            const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
            let count = 0;

            for (const [id, channel] of channels) {
                try {
                    // On remet la permission à NULL (Défaut) pour laisser passer les messages normalement
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
                    count++;
                } catch (e) { }
            }

            const successEmbed = embeds.success(interactionOrMessage, 'FIN DE L\'ALERTE', `🔓 **${count}** salons ont été rouverts au public.`);
            
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.editReply({ embeds: [successEmbed] });
            return msg.edit({ embeds: [successEmbed] });
        }

        // --- 3. MODE SIMPLE (UN SALON) ---
        if (!targetChannel) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Salon invalide.")] });

        try {
            // --- VERIFICATION (Est-ce déjà unlock ?) ---
            const currentOverwrites = targetChannel.permissionOverwrites.cache.get(guild.roles.everyone.id);

            // Si :
            // 1. Il n'y a pas d'overwrites spécifiques (donc c'est par défaut)
            // 2. OU l'overwrite ne contient PAS de refus pour SendMessages
            // ALORS c'est déjà ouvert.
            if (!currentOverwrites || !currentOverwrites.deny.has(PermissionFlagsBits.SendMessages)) {
                return replyFunc({ 
                    embeds: [embeds.warning(interactionOrMessage, "Déjà ouvert", `Le salon ${targetChannel} est déjà accessible !`)],
                    ephemeral: true 
                });
            }

            // Sinon on déverrouille (remise à zéro)
            await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            
            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, 'Salon Déverrouillé', `🔓 **${targetChannel}** est maintenant ouvert au public.`)] 
            });

        } catch (e) {
            console.log(e);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Erreur", "Je n'ai pas la permission de gérer ce salon.")] 
            });
        }
    }
};