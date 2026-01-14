const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

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
            
            // 1. IMPORTANT : On fait patienter Discord tout de suite pour éviter le crash "Unknown Interaction"
            // On met ephemeral: true si tu veux que seul le joueur voie le message, sinon false.
            // Ici je mets false (public) car c'est drôle de voir qui est en prison.
            await interactionOrMessage.deferReply({ ephemeral: false });

            // replyFunc utilise maintenant editReply car on a déjà "defer" (répondu qu'on arrive)
            replyFunc = async (payload) => {
                const { fetchReply, ephemeral, ...options } = payload; 
                // On retire 'ephemeral' et 'fetchReply' car editReply ne les supporte pas de la même façon
                return await interactionOrMessage.editReply(options);
            };

            // Pour récupérer le message, on utilise fetchReply directement
            getMessage = async () => await interactionOrMessage.fetchReply();

        } else {
            user = interactionOrMessage.author;
            // Mode Prefix classique
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
            const embed = new EmbedBuilder()
                .setColor(0x2ECC71) // Vert
                .setTitle('🕊️ Tu es libre !')
                .setDescription("Tu n'es pas en prison. Profite de ta liberté !");
            
            return replyFunc({ embeds: [embed] });
        }

        // --- 3. Si le joueur est EN PRISON ---
        const timeLeftMs = userData.jailEnd - now;
        const minutes = Math.floor(timeLeftMs / 60000);
        const seconds = Math.floor((timeLeftMs % 60000) / 1000);

        const caution = 750;
        const canPay = userData.cash >= caution;

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C) // Rouge
            .setTitle('⛓️ Cellule de Prison')
            .setDescription(`Tu es enfermé !\n\n⏳ Temps restant : **${minutes}m ${seconds}s**\n💰 Caution de sortie : **${caution} €**`)
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
        await replyFunc({ embeds: [embed], components: [row] });
        
        // On récupère le message envoyé pour écouter les boutons
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
                // On revérifie les données en temps réel
                const currentData = await eco.get(user.id);
                
                if (currentData.cash < caution) {
                    return i.reply({ content: "❌ Tu n'as pas assez d'argent !", ephemeral: true });
                }

                // Paiement & Libération
                await eco.addCash(user.id, -caution);
                await eco.addBank('police_treasury', caution); // Ajout au braquage
                await eco.setJail(user.id, 0); 

                // Confirmation
                await i.update({ 
                    content: "🔓 **Tu as payé ta caution !** Tu es libre.\n*(Tes 750€ ont été saisis par la Police Fédérale)*", 
                    embeds: [], 
                    components: [] 
                });
                collector.stop();
            }
        });

        // Nettoyage à la fin du temps
        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                try {
                    // On désactive le bouton après 1 minute
                    const disabledRow = new ActionRowBuilder().addComponents(
                        ButtonBuilder.from(row.components[0]).setDisabled(true)
                    );
                    
                    if (isSlash) await interactionOrMessage.editReply({ components: [disabledRow] });
                    else await msg.edit({ components: [disabledRow] });
                } catch (e) {
                    // Ignorer si le message a été supprimé
                }
            }
        });
    }
};