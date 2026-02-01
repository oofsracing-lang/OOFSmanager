import fs from 'fs';

const data = JSON.parse(fs.readFileSync('standings_dump.json', 'utf8'));
console.log(Object.keys(data));
if (data.config) console.log("Config found:", JSON.stringify(data.config.classes));
