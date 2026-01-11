import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XML_FILE_PATH = path.resolve(__dirname, '../../2025_11_20_21_52_46-41R1.xml');

const xmlContent = fs.readFileSync(XML_FILE_PATH, 'utf-8');
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});
const parsed = parser.parse(xmlContent);

console.log("Root Keys:", Object.keys(parsed));
if (parsed.rFactorXML) {
    console.log("rFactorXML Keys:", Object.keys(parsed.rFactorXML));
    if (parsed.rFactorXML.RaceResults) {
        console.log("RaceResults Keys:", Object.keys(parsed.rFactorXML.RaceResults));
        if (parsed.rFactorXML.RaceResults.Driver) {
            console.log("Driver found! Is Array?", Array.isArray(parsed.rFactorXML.RaceResults.Driver));
            console.log("Driver count:", parsed.rFactorXML.RaceResults.Driver.length);
        } else {
            console.log("Driver NOT found in RaceResults");
        }
    }
}
