const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prison')
        .setDescription('Vérifie ton temps de prison ou paie la caution'),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage;
        const isSlash = interactionOrMessage.isCommand?.();
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

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
        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
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

        // --- CALCUL DYNAMIQUE DE LA CAUTION (ANTI-INFLATION) ---
        // La caution vaut 5% de la richesse totale (Cash + Banque), avec un minimum de 750€.
        const totalWealth = userData.cash + userData.bank;
        let caution = Math.floor(totalWealth * 0.05);
        if (caution < 750) caution = 750;

        const canPay = userData.cash >= caution;
        const fmt = (n) => n.toLocaleString('fr-FR');

        // Utilisation de embeds.error pour simuler l'état "Prison" (Rouge)
        const jailEmbed = embeds.error(interactionOrMessage, 
            `Tu es enfermé !\n\n⏳ Temps restant : **${minutes}m ${seconds}s**\n💰 Caution de sortie : **${fmt(caution)} €**`
        )
        .setTitle('⛓️ Cellule de Prison')
        .setFooter({ text: "L'argent de la caution est proportionnel à ta richesse." });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pay_bail')
                .setLabel(`Payer la caution (${fmt(caution)}€)`)
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
                // ✅ Ajout de guildId
                const currentData = await eco.get(user.id, guildId);
                
                if (currentData.cash < caution) {
                    return i.reply({ 
                        embeds: [embeds.error(i, "Tu n'as pas assez d'argent sur toi ! (L'inflation, c'est dur...)")], 
                        ephemeral: true 
                    });
                }

                // ✅ Ajout de guildId partout
                await eco.addCash(user.id, guildId, -caution);
                // Si la police est commune, on garde 'police_treasury'
                // Si tu veux une police par serveur : 'police_treasury' restera lié à ce guildId grâce à eco.addBank
                await eco.addBank('police_treasury', guildId, caution);
                await eco.setJail(user.id, guildId, 0); 

                // Embed de libération
                const freeEmbed = embeds.success(interactionOrMessage, "Libéré !", 
                    `🔓 **Tu as payé ta caution.**\n*(Tes ${fmt(caution)}€ ont été saisis par la Police)*`
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