const fs = require('fs');
const path = require('path');
const Table = require('cli-table3');

module.exports = (client) => {
    // --- STYLE DU TABLEAU ---
    const table = new Table({
        head: ['\x1b[35mCommande\x1b[0m', '\x1b[32mStatut\x1b[0m'], 
        chars: {
            'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
            'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
            'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
            'right': '║', 'right-mid': '╢', 'middle': '│'
        },
        style: { head: [], border: ['grey'] },
        colWidths: [25, 12],
        colAligns: ['left', 'center']
    });

    const foldersPath = path.join(__dirname, '../commands');
    
    // --- FONCTION RÉCURSIVE ---
    const getAllFiles = (dirPath, arrayOfFiles) => {
        if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
        const files = fs.readdirSync(dirPath);
        arrayOfFiles = arrayOfFiles || [];

        files.forEach((file) => {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            } else {
                if (file.endsWith('.js')) arrayOfFiles.push(path.join(dirPath, file));
            }
        });
        return arrayOfFiles;
    };

    if (!fs.existsSync(foldersPath)) return table.toString();

    const commandFiles = getAllFiles(foldersPath);

    for (const filePath of commandFiles) {
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                const category = path.basename(path.dirname(filePath));
                command.category = category;
                client.commands.set(command.data.name, command);
                table.push([command.data.name, '✅']);
            } else {
                table.push([path.basename(filePath), '⚠️']);
            }
        } catch (error) {
            table.push([path.basename(filePath), '❌']);
        }
    }
    
    // ON RETOURNE LE TABLEAU AU LIEU DE L'AFFICHER
    return table.toString();
};