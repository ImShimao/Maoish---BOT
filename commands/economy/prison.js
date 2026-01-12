const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prison')
        .setDescription('Vérifie ton temps de prison ou paie la caution'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- 1. Vérifier si l'utilisateur est libre ---
        const isJailed = await eco.isJailed(user.id);
        if (!isJailed) {
            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('🕊️ Tu es libre !')
                .setDescription("Tu n'es pas en prison. Profite de ta liberté !");
            return replyFunc({ embeds: [embed] });
        }

        // --- 2. Si l'utilisateur est en prison ---
        const userData = await eco.get(user.id);
        const timeLeftMs = userData.jailEnd - Date.now();
        const minutes = Math.floor(timeLeftMs / 60000);
        const seconds = Math.floor((timeLeftMs % 60000) / 1000);

        const caution = 750;
        const canPay = userData.cash >= caution;

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C) // Rouge
            .setTitle('⛓️ Cellule de Prison')
            .setDescription(`Tu es enfermé !\n\n⏳ Temps restant : **${minutes}m ${seconds}s**\n💰 Caution de sortie : **${caution} €**`)
            .setFooter({ text: "La liberté a un prix..." });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pay_bail')
                .setLabel(`Payer la caution (${caution}€)`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔓')
                .setDisabled(!canPay)
        );

        const msg = await replyFunc({ embeds: [embed], components: [row], withResponse: true });

        // --- 3. Gestion du bouton "Payer" ---
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'pay_bail') {
                const currentData = await eco.get(user.id);
                if (currentData.cash < caution) {
                    return i.reply({ content: "❌ Tu n'as pas assez d'argent !", ephemeral: true });
                }

                // Paiement
                await eco.addCash(user.id, -caution);
                // Libération (On met jailEnd à 0 = temps passé)
                await eco.setJail(user.id, 0); 

                await i.update({ 
                    content: "🔓 **Tu as payé ta caution !** Tu es libre.", 
                    embeds: [], 
                    components: [] 
                });
                collector.stop();
            }
        });
    }
};