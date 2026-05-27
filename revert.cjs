const fs = require('fs');
const edits = JSON.parse(fs.readFileSync('edits.json', 'utf8'));
let content = fs.readFileSync('server.ts', 'utf8');

// Apply edits in reverse order
for (let i = edits.length - 1; i >= 0; i--) {
    const edit = edits[i];
    const target = edit.TargetContent;
    const replacement = edit.ReplacementContent;
    
    // In reverse, we search for replacement and replace it with target
    // Note: Due to whitespace or other factors, simple string replace might fail if we already modified the lines further.
    // Let's just try simple replace first.
    if (content.includes(replacement)) {
        content = content.replace(replacement, target);
        console.log(`Reverted edit ${i + 1}/${edits.length}: ${edit.Instruction}`);
    } else {
        console.log(`Failed to revert edit ${i + 1}/${edits.length}: Replacement text not found in server.ts.`);
    }
}

fs.writeFileSync('server.ts', content);
console.log('Revert process completed.');
