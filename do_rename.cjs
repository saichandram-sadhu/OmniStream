const fs = require('fs');
const path = require('path');

const dir = 'D:\\\\storys\\\\hiss';
const plan = require('./rename_plan.json');

let successCount = 0;
let errorCount = 0;

plan.forEach(item => {
    const oldPath = path.join(dir, item.old);
    const newPath = path.join(dir, item.new);
    
    // Check if new path already exists to avoid overwriting
    if (fs.existsSync(newPath) && item.old !== item.new) {
        console.error(`Skipping ${item.old} -> ${item.new} (File already exists)`);
        errorCount++;
        return;
    }

    try {
        fs.renameSync(oldPath, newPath);
        successCount++;
    } catch (e) {
        console.error(`Failed to rename ${item.old}:`, e.message);
        errorCount++;
    }
});

console.log(`Successfully renamed ${successCount} files. Errors: ${errorCount}.`);
