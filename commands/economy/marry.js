const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Demander quelqu\'un en mariage (Nécessite une Bague)')
        .addUserOption(o => o.setName('elu').setDescription('Ton âme sœur').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, partner, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            partner = interactionOrMessage.options.getUser('elu');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            partner = interactionOrMessage.mentions.users.first();
            replyFunc = (p) => interactionOrMessage.channel.send(p);
            if (!partner) return replyFunc("❌ Tu dois mentionner quelqu'un !");
        }

        if (user.id === partner.id) return replyFunc("❌ Tu ne peux pas t'épouser toi-même (triste).");
        if (partner.bot) return replyFunc("❌ Les robots n'ont pas de sentiments.");

        // Vérifications
        const userData = eco.get(user.id);
        const partnerData = eco.get(partner.id);

        if (userData.partner) return replyFunc(`❌ Tu es déjà marié à <@${userData.partner}> ! Infidèle !`);
        if (partnerData.partner) return replyFunc(`❌ ${partner.username} est déjà pris(e).`);
        
        if (!eco.hasItem(user.id, 'ring')) {
            return replyFunc("❌ **Il te faut une Bague !**\nAchète une `💍 Bague` au `/shop` pour faire ta demande.");
        }

        // Demande
        const embed = new EmbedBuilder()
            .setColor(0xE91E63)
            .setTitle('💍 Demande en Mariage')
            .setDescription(`${user} demande la main de ${partner} !\n\n**${partner.username}, acceptes-tu cette union ?**`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('yes').setLabel('OUI ! Je le veux').setStyle(ButtonStyle.Success).setEmoji('💍'),
            new ButtonBuilder().setCustomId('no').setLabel('Non désolé...').setStyle(ButtonStyle.Danger)
        );

        const msg = await replyFunc({ content: `${partner}`, embeds: [embed], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === partner.id, // Seul le partenaire peut répondre
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'no') {
                await i.update({ content: `💔 **Râteau.** ${partner.username} a refusé...`, components: [], embeds: [] });
                return collector.stop();
            }

            if (i.customId === 'yes') {
                // Mariage validé
                eco.setPartner(user.id, partner.id);
                // On consomme la bague ? (Optionnel, ici on la garde en souvenir ou on l'enlève)
                // eco.removeItem(user.id, 'ring'); 
                
                const successEmbed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setTitle('💒 VIVE LES MARIÉS !')
                    .setDescription(`🎉 Félicitations à **${user.username}** et **${partner.username}** qui sont maintenant mariés !`)
                    .setImage('https://media.giphy.com/media/xT8qB5sar8diTE19rW/giphy.gif'); // GIF festif

                await i.update({ content: null, embeds: [successEmbed], components: [] });
                return collector.stop();
            }
        });
    }
};