const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prison')
        .setDescription('Vérifie ton temps de prison ou paie la caution'),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage;
        const isSlash = interactionOrMessage.isCommand?.();

        // --- GESTION HYBRIDE SÉCURISÉE ---
        if (isSlash) {
            user = interactionOrMessage.user;
            await interactionOrMessage.deferReply({ ephemeral: false });

            replyFunc = async (payload) => {
                const { fetchReply, ephemeral, ...options } = payload; 
                return await interactionOrMessage.editReply(options);
            };
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (payload) => {
                const { ephemeral, fetchReply, ...options } = payload;
                return await interactionOrMessage.channel.send(options);
            };
            getMessage = async (msg) => msg;
        }

        // --- 1. Récupération des données ---
        const userData = await eco.get(user.id);
        const now = Date.now();
        const isJailed = userData.jailEnd > now;

        // --- 2. Si le joueur est LIBRE ---
        if (!isJailed) {
            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, "Tu es libre !", "Tu n'es pas en prison. Profite de ta liberté !")] 
            });
        }

        // --- 3. Si le joueur est EN PRISON ---
        const timeLeftMs = userData.jailEnd - now;
        const minutes = Math.floor(timeLeftMs / 60000);
        const seconds = Math.floor((timeLeftMs % 60000) / 1000);

        const caution = 750;
        const canPay = userData.cash >= caution;

        // Utilisation de embeds.error pour simuler l'état "Prison" (Rouge)
        const jailEmbed = embeds.error(interactionOrMessage, 
            `Tu es enfermé !\n\n⏳ Temps restant : **${minutes}m ${seconds}s**\n💰 Caution de sortie : **${caution} €**`
        )
        .setTitle('⛓️ Cellule de Prison')
        .setFooter({ text: "L'argent de la caution ira dans la réserve de la Police." });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pay_bail')
                .setLabel(`Payer la caution (${caution}€)`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔓')
                .setDisabled(!canPay)
        );

        // On envoie le message
        await replyFunc({ embeds: [jailEmbed], components: [row] });
        
        const msg = await getMessage();
        if (!msg) return;

        // --- 4. Gestion du bouton "Payer" ---
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'pay_bail') {
                const currentData = await eco.get(user.id);
                
                if (currentData.cash < caution) {
                    return i.reply({ 
                        embeds: [embeds.error(i, "Tu n'as pas assez d'argent sur toi !")], 
                        ephemeral: true 
                    });
                }

                await eco.addCash(user.id, -caution);
                await eco.addBank('police_treasury', caution);
                await eco.setJail(user.id, 0); 

                // Embed de libération
                const freeEmbed = embeds.success(interactionOrMessage, "Libéré !", 
                    `🔓 **Tu as payé ta caution.**\n*(Tes ${caution}€ ont été saisis par la Police)*`
                );

                await i.update({ embeds: [freeEmbed], components: [] });
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        ButtonBuilder.from(row.components[0]).setDisabled(true)
                    );
                    
                    if (isSlash) await interactionOrMessage.editReply({ components: [disabledRow] });
                    else await msg.edit({ components: [disabledRow] });
                } catch (e) {}
            }
        });
    }
};