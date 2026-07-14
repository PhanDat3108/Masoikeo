const fs = require('fs');
const { execSync } = require('child_process');
const files = fs.readdirSync('/Users/phandat/Documents/masoi/client/public').filter(f => f.endsWith('.m4a') || f.endsWith('.mp3'));
let durations = {};
for (let file of files) {
    try {
        let out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/Users/phandat/Documents/masoi/client/public/${file}"`);
        durations[file] = parseFloat(out.toString().trim());
    } catch (e) {
        durations[file] = 0;
    }
}
console.log(JSON.stringify(durations, null, 2));
