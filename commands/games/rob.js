const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Braquer un membre')
        .addUserOption(o => o.setName('victime').setDescription('Qui voler ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        const robber = interactionOrMessage.user || interactionOrMessage.author;
        const victimUser = interactionOrMessage.isCommand?.() ? interactionOrMessage.options.getUser('victime') : interactionOrMessage.mentions.users.first();
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        // Helper pour les Embeds rapides
        const sendEmbed = (text, color) => {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(text)
                .setFooter({ text: config.FOOTER_TEXT || 'Maoish Crime' });
            return replyFunc({ embeds: [embed] });
        };

        if (!victimUser || victimUser.id === robber.id || victimUser.bot) return sendEmbed("❌ Cible invalide.", config.COLORS.ERROR);

        const robberData = await eco.get(robber.id);
        const now = Date.now();

        // --- 1. VÉRIFICATIONS (Prison & Cooldown) ---
        if (robberData.jailEnd > now) {
            const timeLeft = Math.ceil((robberData.jailEnd - now) / 60000);
            return sendEmbed(`🔒 **Tu es en PRISON !** Les barreaux t'empêchent de braquer.\nLibération dans : **${timeLeft} minutes**.`, config.COLORS.ERROR);
        }

        if (robberData.cooldowns.rob > now) {
            const timeLeft = Math.ceil((robberData.cooldowns.rob - now) / 60000);
            return sendEmbed(`🚓 La police te surveille... Attends **${timeLeft} min**.`, 0xE67E22);
        }

        const victimData = await eco.get(victimUser.id);
        if (victimData.cash < 100) return sendEmbed("❌ Cette personne est trop pauvre pour être volée.", config.COLORS.ERROR);
        if (robberData.cash < 500) return sendEmbed("❌ Il te faut 500€ sur toi pour payer l'amende si tu te rates !", config.COLORS.ERROR);

        // =========================================================
        // --- 2. SYSTÈME DE DÉFENSE (Objets) ---
        // =========================================================

        // A. BOUCLIER SWAT (100% Protection - S'use)
        if (await eco.hasItem(victimUser.id, 'shield')) {
            // Le bouclier bloque TOUT, mais peut casser (20% de chance de casse = environ 5 utilisations)
            const breakChance = 0.20; 
            const isBroken = Math.random() < breakChance;

            // Application du cooldown au braqueur quand même
            robberData.cooldowns.rob = now + (config.COOLDOWNS.ROB || 3600000);
            await robberData.save();

            if (isBroken) {
                await eco.removeItem(victimUser.id, 'shield');
                return sendEmbed(`🛡️ **IMPOSSIBLE !** Le **Bouclier SWAT** de ${victimUser.username} t'a repoussé !\n⚠️ *Le choc a été si violent que son bouclier s'est brisé.*`, 0x3498DB);
            } else {
                return sendEmbed(`🛡️ **MUR DE FER !** Le **Bouclier SWAT** de ${victimUser.username} a bloqué ton attaque sans broncher.`, 0x3498DB);
            }
        }

        // B. CHIEN DE GARDE (75% Protection - Peut s'enfuir)
        if (await eco.hasItem(victimUser.id, 'dog')) {
            // 75% de chance que le chien défende
            if (Math.random() < 0.75) {
                const fine = 500; // Frais médicaux pour la morsure
                await eco.addCash(robber.id, -fine);
                
                // 10% de chance que le chien s'enfuie après l'attaque (Équilibrage)
                const dogRunAway = Math.random() < 0.10; 
                if (dogRunAway) {
                    await eco.removeItem(victimUser.id, 'dog');
                }

                robberData.cooldowns.rob = now + (config.COOLDOWNS.ROB || 3600000);
                await robberData.save();

                const dogMsg = dogRunAway 
                    ? `🐕 **LE CHIEN A DISPARU !** Il a défendu ${victimUser.username} et t'a mordu (-${fine}€), mais il s'est enfui après la bagarre !`
                    : `🐕 **WOUAF !** Le chien de ${victimUser.username} t'a sauté à la gorge !\n🩸 Tu fuis en courant et tu perds **${fine} €** (frais médicaux).`;

                return sendEmbed(dogMsg, 0xE67E22);
            }
            // Si les 25% passent, le chien dormait... le braquage continue.
        }

        // C. CADENAS (50% Protection - Se casse si utilisé)
        if (await eco.hasItem(victimUser.id, 'lock')) {
            if (Math.random() < 0.5) {
                await eco.removeItem(victimUser.id, 'lock');
                
                robberData.cooldowns.rob = now + (config.COOLDOWNS.ROB || 3600000);
                await robberData.save();

                return sendEmbed(`🔒 **CLIC !** Le **Cadenas** de ${victimUser.username} a résisté... mais il est cassé maintenant !`, 0xE67E22);
            }
        }

        // =========================================================
        // --- 3. RÉSOLUTION DU BRAQUAGE ---
        // =========================================================

        robberData.cooldowns.rob = now + (config.COOLDOWNS.ROB || 3600000);
        
        // Chance de base de réussir (si aucune protection n'a fonctionné)
        // Tu peux ajuster ici (0.5 = 50% de chance)
        const success = Math.random() < (config.PROBS?.ROB_SUCCESS || 0.5);

        if (success) {
            // SUCCÈS
            const stolen = Math.floor(victimData.cash * (Math.random() * 0.2 + 0.1)); // Vole entre 10% et 30%
            await eco.addCash(victimUser.id, -stolen);
            
            robberData.cash += stolen; 
            await robberData.save(); 

            return sendEmbed(`🔫 **Braquage réussi !**\nTu as volé **${stolen} €** à ${victimUser.username}.`, config.COLORS.SUCCESS);
        } else {
            // ÉCHEC (Police)
            const amende = 500;
            await eco.addCash(robber.id, -amende);
            await robberData.save();
            
            return sendEmbed(`🚓 **ALERTE !** La police passait par là.\nTu t'es fait attraper et tu paies **${amende} €** d'amende.`, config.COLORS.ERROR);
        }
    }
};