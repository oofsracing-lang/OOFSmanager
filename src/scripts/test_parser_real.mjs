
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseQualifyingXml, analyzeQualifying } from '../utils/qualifyingParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xmlPath = path.join(__dirname, '../../2025_11_20_21_52_46-41R1.xml');

try {
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    console.log("Parsing XML...");

    const data = parseQualifyingXml(xmlContent);

    // Check drivers
    console.log("Drivers found:", data.drivers.map(d => d.name));

    // Check Donovan Bailey
    const db = data.drivers.find(d => d.name.includes("Donovan"));
    if (db) {
        console.log(`Donovan Bailey Laps: ${db.laps.length}`);
        console.log("First 3 laps:", db.laps.slice(0, 3));

        // Analyze
        const result = analyzeQualifying(db.laps, 3, 125.0);
        console.log("Analysis Result (3 laps, <125s):", result);
    } else {
        console.error("Donovan not found!");
    }

} catch (e) {
    console.error("Test Failed:", e);
}
