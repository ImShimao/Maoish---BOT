const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Demande quelqu\'un en mariage (Nécessite une 💍 Bague)')
        .addUserOption(option => 
            option.setName('partenaire')
                .setDescription('L\'amour de ta vie')
                .setRequired(true)),

    async execute(interactionOrMessage) {
        let proposer, targetUser, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            proposer = interactionOrMessage.user;
            targetUser = interactionOrMessage.options.getUser('partenaire');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            proposer = interactionOrMessage.author;
            targetUser = interactionOrMessage.mentions.users.first();
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- 1. VÉRIFICATIONS DE BASE ---
        if (!targetUser) return replyFunc("❌ Il faut mentionner quelqu'un !");
        if (proposer.id === targetUser.id) return replyFunc("❌ Tu ne peux pas t'épouser toi-même (c'est triste...).");
        if (targetUser.bot) return replyFunc("❌ Tu ne peux pas épouser un robot !");

        // --- 2. VÉRIFICATION DE LA BAGUE (IMPORTANT) ---
        // Assure-toi que l'ID de la bague dans items.js est bien 'ring'
        const hasRing = await eco.hasItem(proposer.id, 'ring');
        if (!hasRing) {
            return replyFunc("❌ **Tu n'as pas de Bague !** 💍\nVa en acheter une au `/shop` avant de faire ta demande.");
        }

        // --- 3. VÉRIFICATION MARIAGE EXISTANT ---
        const proposerData = await eco.get(proposer.id);
        const targetData = await eco.get(targetUser.id);

        if (proposerData.partner) {
            return replyFunc("❌ **Tu es déjà marié !** (Infidèle va...) Divorces d'abord.");
        }
        if (targetData.partner) {
            return replyFunc(`❌ **${targetUser.username} est déjà marié(e) !** Tu arrives trop tard.`);
        }

        // --- 4. LA DEMANDE (Message + Boutons) ---
        const embed = new EmbedBuilder()
            .setColor(0xE91E63) // Rose
            .setTitle('💍 Demande en Mariage')
            .setDescription(`**${targetUser}**, **${proposer}** demande ta main !\n\n*Acceptes-tu de l'épouser pour le meilleur et pour le pire ?*`)
            .setFooter({ text: 'Tu as 60 secondes pour répondre.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_marry').setLabel('OUI, je le veux ! 💖').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('refuse_marry').setLabel('Non désolé... 💔').setStyle(ButtonStyle.Danger)
        );

        // On mentionne la cible pour qu'elle voie le message
        const msg = await replyFunc({ content: `${targetUser}`, embeds: [embed], components: [row], withResponse: true });

        // --- 5. GESTION DE LA RÉPONSE ---
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === targetUser.id, // Seul le partenaire peut cliquer
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'accept_marry') {
                // Re-vérification bague au dernier moment (au cas où il l'aurait vendue entre temps)
                if (!await eco.hasItem(proposer.id, 'ring')) {
                    return i.reply({ content: "❌ L'autre n'a plus la bague ! Arnaque !", ephemeral: true });
                }

                // 1. On retire la bague au proposant
                await eco.removeItem(proposer.id, 'ring');

                // 2. On marie les deux
                await eco.setPartner(proposer.id, targetUser.id);

                const successEmbed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setTitle('💒 VIVE LES MARIÉS ! 💒')
                    .setDescription(`🎉 **${proposer}** et **${targetUser}** sont maintenant mariés !\n\nLa bague 💍 a été passée au doigt.`);

                await i.update({ content: null, embeds: [successEmbed], components: [] });
            } 
            else if (i.customId === 'refuse_marry') {
                const sadEmbed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setDescription(`💔 **${targetUser}** a refusé la demande de ${proposer}...\n\n(Tu as gardé ta bague au moins).`);
                
                await i.update({ content: null, embeds: [sadEmbed], components: [] });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                try {
                    await msg.edit({ content: "⏱️ **Le silence est une réponse...** La demande a expiré.", components: [] });
                } catch (e) {}
            }
        });
    }
};