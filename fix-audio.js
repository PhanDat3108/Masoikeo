const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'client', 'public');
const voiceLinesFile = path.join(__dirname, 'client', 'src', 'constants', 'voiceLines.js');

let content = fs.readFileSync(voiceLinesFile, 'utf8');

// A simple slugify function
function slugify(text) {
    return text.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, '-')
        .replace(/-+/g, '-')
        .replace(/-\./g, '.');
}

const files = fs.readdirSync(publicDir);

files.forEach(file => {
    if (file.endsWith('.m4a') || file.endsWith('.mp3')) {
        const newName = slugify(file);
        if (newName !== file) {
            console.log(`Renaming: ${file} -> ${newName}`);
            // Use git mv to rename safely
            require('child_process').execSync(`git mv "client/public/${file}" "client/public/${newName}"`);
            
            // Also replace in voiceLines.js
            // The file might contain the NFD or NFC version, let's replace both just in case
            const nfcName = file.normalize('NFC');
            const nfdName = file.normalize('NFD');
            content = content.replace(nfcName, newName);
            content = content.replace(nfdName, newName);
        }
    }
});

fs.writeFileSync(voiceLinesFile, content);
console.log('Done mapping.');
