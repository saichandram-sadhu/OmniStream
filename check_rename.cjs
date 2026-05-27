const fs = require('fs');
const path = require('path');

const dir = 'D:\\\\storys\\\\hiss';
const files = fs.readdirSync(dir);

let renamedCount = 0;
let skippedFiles = [];
let maxNumber = 0;

const changes = [];

files.forEach(file => {
    // Match any number in the filename
    const match = file.match(/(\d+)/);
    if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
        
        // Pad the number with leading zeros to 4 digits (e.g., 0001, 0123, 1330)
        const paddedNum = String(num).padStart(4, '0');
        
        // ensure extension is preserved, or add .mp3 if missing
        let ext = path.extname(file);
        if (!ext || ext.toLowerCase() === '.mp4' || ext === '') {
            // some files don't have extensions in the list like "Ep 1 - Hiss"
            // Wait, I should preserve the actual file's extension if it has one.
            if (!ext) ext = '.mp3'; // Default to mp3 as it seems to be audio
        }
        
        const newName = `Ep ${paddedNum} - Hiss Rebirth${ext}`;
        
        if (file !== newName) {
            changes.push({ old: file, new: newName });
        }
    } else {
        skippedFiles.push(file);
    }
});

console.log(`Found ${changes.length} files to rename.`);
console.log(`Max episode number found: ${maxNumber}`);
if (skippedFiles.length > 0) {
    console.log(`Skipped ${skippedFiles.length} files with no numbers:`, skippedFiles.slice(0, 5));
}

// Write the plan to a file to verify
fs.writeFileSync('rename_plan.json', JSON.stringify(changes, null, 2));
console.log('Plan written to rename_plan.json');
