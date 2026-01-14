const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Tente de commettre un crime (2 min de recharge)'),

    async execute(interactionOrMessage) {
        let user, replyFunc, getMessage;

        // --- GESTION HYBRIDE SÉCURISÉE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            // Pour slash : on force le fetchReply pour avoir l'objet Message pour le collector
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            // Pour prefix : on nettoie l'option ephemeral qui ferait planter
            replyFunc = async (payload) => {
                const { ephemeral, ...options } = payload;
                return await interactionOrMessage.channel.send(options);
            };
            getMessage = async (msg) => msg;
        }

        // Helper pour les Embeds rapides
        const sendEmbed = (text, color) => {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(text)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });
            return replyFunc({ embeds: [embed] });
        };

        const userData = await eco.get(user.id);
        if (!userData) return replyFunc({ content: "❌ Erreur profil.", ephemeral: true });

        // --- 1. VÉRIF PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return sendEmbed(`🔒 **Tu es en PRISON !**\nReviens dans **${timeLeft} minutes**.`, config.COLORS.ERROR);
        }

        // --- 2. GESTION COOLDOWN ---
        const cooldownTime = 2 * 60 * 1000; // 2 minutes
        const now = Date.now();

        if (userData.cooldowns.crime > now) {
            const timeLeft = userData.cooldowns.crime - now;
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            return sendEmbed(`⏳ **Calme-toi !** La police rôde...\nRéessaie dans **${minutes}m ${seconds}s**.`, 0xE67E22);
        }

        // On applique le cooldown tout de suite
        userData.cooldowns.crime = now + cooldownTime;
        await userData.save();

        // --- 3. LOGIQUE DU CRIME ---
        const risk = Math.random();
        
        // === SCÉNARIO : ÉCHEC (ARRESTATION 40%) ===
        if (risk < 0.40) { 
            const amende = 750;
            const prisonTimeMin = 5;
            const canPay = userData.cash >= amende;

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR)
                .setTitle('👮 ARRESTATION !')
                .setDescription(`La police t'a attrapé !\n\n**Choisis vite (30s) :**\n⛓️ **Prison** (${prisonTimeMin} min)\n💸 **Payer** (${amende} €)`)
                .setFooter({ text: "⚠️ Si tu ne réponds pas, c'est la prison directe !" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('go_jail').setLabel('Aller en cellule').setStyle(ButtonStyle.Secondary).setEmoji('⛓️'),
                new ButtonBuilder().setCustomId('pay_bribe').setLabel(`Payer (${amende}€)`).setStyle(ButtonStyle.Danger).setDisabled(!canPay)
            );

            // Envoi du message et récupération de l'objet Message
            const response = await replyFunc({ embeds: [embed], components: [row], fetchReply: true });
            const msg = await getMessage(response);
            
            if (!msg) return; // Sécurité si le message a échoué

            const collector = msg.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                filter: i => i.user.id === user.id, 
                time: 30000 // 30 secondes
            });

            // Quand le joueur clique
            collector.on('collect', async i => {
                if (i.customId === 'pay_bribe') {
                    // Re-vérification de l'argent au moment du clic
                    const freshData = await eco.get(user.id);
                    if (freshData.cash < amende) {
                        return i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
                    }
                    
                    await eco.addCash(user.id, -amende);
                    await i.update({ 
                        embeds: [new EmbedBuilder().setColor(config.COLORS.SUCCESS).setDescription(`💸 **Corrupteur !** Tu as payé **${amende} €** et l'officier te laisse partir.`)], 
                        components: [] 
                    });
                } 
                else if (i.customId === 'go_jail') {
                    await eco.setJail(user.id, prisonTimeMin * 60 * 1000);
                    await i.update({ 
                        embeds: [new EmbedBuilder().setColor(config.COLORS.ERROR).setDescription(`🔒 **Cellule !** Tu as accepté ton sort. Tu es enfermé pour **${prisonTimeMin} minutes**.`)] , 
                        components: [] 
                    });
                }
                collector.stop(); // On arrête le collector car un choix a été fait
            });

            // Quand le temps est écoulé
            collector.on('end', async (collected, reason) => {
                // Si la raison est "time" et qu'aucun bouton n'a été cliqué (size === 0)
                if (reason === 'time' && collected.size === 0) {
                    
                    // ACTION : PRISON AUTOMATIQUE
                    await eco.setJail(user.id, prisonTimeMin * 60 * 1000);

                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(config.COLORS.ERROR)
                        .setTitle('⚖️ JUSTICE EXPÉDITIVE')
                        .setDescription(`⏱️ **Trop lent !** Tu as hésité trop longtemps.\nLes policiers t'ont jeté en prison pour **${prisonTimeMin} minutes**.`);

                    // On modifie le message original pour retirer les boutons et afficher la sentence
                    try {
                        if (interactionOrMessage.isCommand?.()) {
                            await interactionOrMessage.editReply({ embeds: [timeoutEmbed], components: [] });
                        } else {
                            await msg.edit({ embeds: [timeoutEmbed], components: [] });
                        }
                    } catch (e) {
                        // Le message a peut-être été supprimé entre temps
                    }
                }
            });
            return;
        }

        // === SCÉNARIO : RÉUSSITE ===
        const gain = Math.floor(Math.random() * 800) + 200;
        await eco.addCash(user.id, gain);

        const scenarios = [
            "Tu as braqué une petite vieille.",
            "Tu as hacké un distributeur de boissons.",
            "Tu as volé les roues d'une voiture de police.",
            "Tu as cambriolé une supérette.",
            "Tu as revendu des informations classées secret défense.",
            "Tu as volé la caisse d'un stand de limonade.",
            "Tu as piraté le compte PayPal d'un influenceur.",
            "Tu as volé un sac à main de luxe.",
            "Tu as trafiqué des compteurs électriques.",
            "Tu as volé des colis Amazon devant une porte.",
            "Tu as kidnappé le chat du voisin (et demandé une rançon).",
            "Tu as volé les enjoliveurs d'une Twingo.",
            "Tu as braqué un camion de glaces.",
            "Tu as revendu de faux billets de Monopoly.",
            "Tu as volé un tableau au musée (c'était une copie).",
            "Tu as hacké la machine à café du bureau.",
            "Tu as volé le scooter du livreur de pizza.",
            "Tu as revendu des places de concert contrefaites.",
            "Tu as volé la perruque d'une star.",
            "Tu as braqué une banque... de sperme.",
            "Tu as volé tous les nains de jardin du quartier.",
            "Tu as piraté le Wi-Fi du Pentagone.",
            "Tu as volé la recette secrète du pâté de crabe.",
            "Tu as dépouillé un touriste égaré.",
            "Tu as volé un vélo sans selle.",
            "Tu as escroqué une grand-mère par téléphone.",
            "Tu as volé la cagnotte de la kermesse.",
            "Tu as braqué un McDonald's avec une banane.",
            "Tu as volé des câbles en cuivre sur un chantier.",
            "Tu as revendu une photo floue d'un OVNI.",
            "Tu as volé le goûter d'un enfant à la récré."
        ];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        sendEmbed(`😈 **Crime Réussi !**\n${scenario}\n💰 Gain : **+${gain} €**`, config.COLORS.SUCCESS);
    }
};