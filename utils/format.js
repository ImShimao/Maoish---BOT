// Fonction pour afficher l'argent avec le bon logo du serveur
function formatMoney(amount, guildSettings) {
    return `${amount.toLocaleString()} ${guildSettings.currencySymbol}`;
}