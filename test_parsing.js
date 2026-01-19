
import fs from 'fs';
import { parseRaceXml } from './src/utils/raceParser.js';

try {
    const xmlContent = fs.readFileSync('./2025_11_20_21_52_46-41R1.xml', 'utf8');
    const result = parseRaceXml(xmlContent);

    console.log('--- Parse Result ---');
    console.log('Track:', result.trackName);
    console.log('Date:', result.raceDate);
    console.log('Drivers Found:', result.results.length);

    if (result.results.length > 0) {
        console.log('Sample Driver:', result.results[0]);
    } else {
        console.error('NO DRIVERS FOUND!');
    }

} catch (err) {
    console.error('Parsing Failed:', err);
}
