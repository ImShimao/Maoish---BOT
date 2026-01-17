const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('job')
        .setDescription('Gère ton métier et ton activité professionnelle.')
        .addSubcommand(sub => 
            sub.setName('choisir')
               .setDescription('Choisis ton métier')
               .addStringOption(op => op.setName('metier').setDescription('Le métier').setRequired(true)
                   .addChoices(
                       { name: `🍔 Cuisinier (${config.JOBS.COOK.salary}€/min)`, value: 'cook' },
                       { name: `⛏️ Mineur (${config.JOBS.MINER.salary}€/min + Loot)`, value: 'miner' },
                       { name: `💻 Hacker (${config.JOBS.HACKER.salary}€/min + Crypto)`, value: 'hacker' }
                   )))
        .addSubcommand(sub => sub.setName('start').setDescription('Commencer ton service (Pointage)'))
        .addSubcommand(sub => sub.setName('stop').setDescription('Finir ton service et récupérer la paie'))
        .addSubcommand(sub => sub.setName('infos').setDescription('Voir tes gains actuels sans arrêter le travail')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const user = interaction.user;
        const guildId = interaction.guild.id; // ✅ ID Serveur

        // ✅ Utilisation de eco.get pour récupérer le profil du serveur
        const userData = await eco.get(user.id, guildId);

        // --- 1. CHOISIR UN MÉTIER ---
        if (sub === 'choisir') {
            if (userData.job.startedAt > 0) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Tu ne peux pas changer de métier pendant que tu travailles !")], 
                    ephemeral: true 
                });
            }
            
            const choice = interaction.options.getString('metier');
            const jobKey = Object.keys(config.JOBS).find(key => config.JOBS[key].id === choice);
            
            if (!jobKey) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Métier inconnu.")], 
                    ephemeral: true 
                });
            }

            userData.job.name = choice;
            await userData.save();
            
            return interaction.reply({ 
                embeds: [embeds.success(interaction, "Embauché !", `Tu es maintenant **${config.JOBS[jobKey].name.toUpperCase()}**.\nFais \`/job start\` pour bosser.`)] 
            });
        }

        // --- 2. COMMENCER LE TRAVAIL ---
        if (sub === 'start') {
            if (!userData.job.name) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Tu n'as pas de métier ! Fais `/job choisir`.")], 
                    ephemeral: true 
                });
            }
            if (userData.job.startedAt > 0) {
                return interaction.reply({ 
                    embeds: [embeds.warning(interaction, "Déjà au travail", `Tu es déjà en train de travailler depuis <t:${Math.floor(userData.job.startedAt/1000)}:R>.`)], 
                    ephemeral: true 
                });
            }

            userData.job.startedAt = Date.now();
            await userData.save();
            
            return interaction.reply({ 
                embeds: [embeds.job(interaction, "Prise de service", `Métier : **${userData.job.name.toUpperCase()}**\n\nReviens plus tard et fais \`/job stop\` pour récupérer ta paie.`)] 
            });
        }

        // --- FONCTION UTILITAIRE ---
        const calculateEarnings = (jobName, durationMinutes) => {
            let cash = 0;
            let lootCount = 0;

            switch (jobName) {
                case 'cook':
                    cash = durationMinutes * config.JOBS.COOK.salary;
                    break;
                case 'miner':
                    cash = durationMinutes * config.JOBS.MINER.salary;
                    lootCount = Math.floor(durationMinutes / 30);
                    break;
                case 'hacker':
                    cash = durationMinutes * config.JOBS.HACKER.salary;
                    lootCount = Math.floor(durationMinutes / 60);
                    break;
            }
            return { cash, lootCount };
        };

        // --- 3. INFOS (TEMPS RÉEL) ---
        if (sub === 'infos') {
            if (userData.job.startedAt === 0) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Tu n'es pas au travail actuellement.")], 
                    ephemeral: true 
                });
            }

            const now = Date.now();
            const durationMs = now - userData.job.startedAt;
            const minutes = Math.floor(durationMs / 1000 / 60);
            
            const { cash, lootCount } = calculateEarnings(userData.job.name, minutes);
            const xp = minutes * 5;

            let lootStatus = "Aucun loot prévu pour l'instant.";
            if (userData.job.name === 'miner' && lootCount > 0) lootStatus = `📦 **${lootCount} matériaux** en attente de fouille.`;
            if (userData.job.name === 'hacker' && lootCount > 0) lootStatus = `🪙 **${lootCount} tentatives** de minage crypto accumulées.`;

            const embed = embeds.job(interaction, `Pointage : ${userData.job.name.toUpperCase()}`, 
                `Tu travailles depuis : <t:${Math.floor(userData.job.startedAt/1000)}:R>`)
                .addFields(
                    { name: '⏱️ Temps', value: `${minutes} minutes`, inline: true },
                    { name: '💰 Gains (Estimé)', value: `${cash} €`, inline: true },
                    { name: '✨ XP (Estimé)', value: `${xp} XP`, inline: true },
                    { name: '🎁 Récompenses', value: lootStatus, inline: false }
                )
                .setFooter({ text: "Fais /job stop pour encaisser tout ça." });

            return interaction.reply({ embeds: [embed] });
        }

        // --- 4. FINIR LE TRAVAIL ---
        if (sub === 'stop') {
            if (userData.job.startedAt === 0) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, "Tu n'es pas au travail actuellement.")], 
                    ephemeral: true 
                });
            }

            const now = Date.now();
            const durationMs = now - userData.job.startedAt;
            const minutes = Math.floor(durationMs / 1000 / 60);

            if (minutes < 5) {
                userData.job.startedAt = 0; 
                await userData.save();
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, `Tu n'as travaillé que ${minutes} minutes. C'est du bénévolat ? (Min 5 min)`)] 
                });
            }

            // Calculs finaux
            let cash = 0;
            let xp = minutes * 5;
            let lootMsg = "";
            let itemsToGive = [];

            switch (userData.job.name) {
                case 'cook':
                    cash = minutes * config.JOBS.COOK.salary;
                    break;
                case 'miner':
                    cash = minutes * config.JOBS.MINER.salary;
                    const mineCycles = Math.floor(minutes / 30);
                    if (mineCycles > 0) {
                        for (let i = 0; i < mineCycles; i++) {
                            const rand = Math.random();
                            let item = null;
                            if (rand < 0.60) item = 'coal';
                            else if (rand < 0.90) item = 'iron';
                            else if (rand < 0.99) item = 'gold';
                            else item = 'diamond';
                            itemsToGive.push(item);
                        }
                    }
                    break;
                case 'hacker':
                    cash = minutes * config.JOBS.HACKER.salary;
                    const hackCycles = Math.floor(minutes / 60);
                    if (hackCycles > 0) {
                        for (let i = 0; i < hackCycles; i++) {
                            if (Math.random() < 0.15) itemsToGive.push('bitcoin');
                        }
                    }
                    if (Math.random() < 0.05) {
                        const jackpot = Math.floor(Math.random() * 5000) + 2000;
                        cash += jackpot;
                        lootMsg += `\n💻 **SYSTEM HACKED!** Virement détourné : **${jackpot} €** !`;
                    }
                    break;
            }

            if (itemsToGive.length > 0) {
                const counts = {};
                itemsToGive.forEach(x => counts[x] = (counts[x] || 0) + 1);
                lootMsg += "\n\n📦 **Objets récupérés :**";
                for (const [itemId, qty] of Object.entries(counts)) {
                    // ✅ AJOUT DE GUILDID
                    await eco.addItem(user.id, guildId, itemId, qty);
                    const name = itemId.charAt(0).toUpperCase() + itemId.slice(1); 
                    lootMsg += `\n+ ${qty} ${name}`;
                }
            } else if (userData.job.name !== 'cook' && minutes >= 30) {
                lootMsg += "\n\n📦 *Pas de chance, tu n'as rien trouvé cette fois.*";
            }

            userData.cash += cash;
            userData.xp += xp;
            userData.job.startedAt = 0; 
            await userData.save();

            const embed = embeds.success(interaction, `Fin de service : ${userData.job.name.toUpperCase()}`,
                `⏱️ Temps total : **${minutes} min**\n` +
                `💰 Salaire versé : **${cash} €**\n` +
                `✨ Expérience : **${xp} XP**` +
                lootMsg
            );

            return interaction.reply({ embeds: [embed] });
        }
    }
};