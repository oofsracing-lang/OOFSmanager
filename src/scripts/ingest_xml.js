import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseRaceXml } from '../utils/raceParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const DATA_FILE_PATH = path.resolve(__dirname, '../data/seasons/season3.json');
const XML_FILE_PATH = path.resolve(__dirname, '../../2025_11_20_21_52_46-41R1.xml'); // Adjust path as needed

async function ingest() {
    try {
        console.log(`Reading XML from: ${XML_FILE_PATH}`);
        if (!fs.existsSync(XML_FILE_PATH)) {
            console.error("XML file not found!");
            process.exit(1);
        }

        const xmlContent = fs.readFileSync(XML_FILE_PATH, 'utf-8');
        const parsedData = parseRaceXml(xmlContent);

        if (parsedData.error) {
            console.error("Parsing Error:", parsedData.error);
            process.exit(1);
        }

        console.log(`Parsed Race: ${parsedData.trackName} (${parsedData.raceDate})`);
        console.log(`Found ${parsedData.results.length} driver results.`);

        // Read existing season data
        const seasonDataRaw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const seasonData = JSON.parse(seasonDataRaw);

        // Find or Create Race Entry
        // Logic: Try to find a race with the same date/track, or if not found, create a new round?
        // For simplicity, let's assume this is "Round 1" if date matches, or we append.
        // Or we can just look for the first race without results?

        // Let's implement a simple logic: Check if we already have results for this race (by comparing date/time?)
        // Or better: Let's assume we are populating "Round 1" if it's empty, or finding by date.
        // Given the task is just "Ingest", let's update ID 1 for now or add a new one.

        // Let's try to match by DATE first (YYYY-MM-DD)
        const raceDate = new Date(parseInt(parsedData.raceDate) * 1000).toISOString().split('T')[0];
        console.log(`Race Date: ${raceDate}`);

        let raceIndex = seasonData.races.findIndex(r => r.date === raceDate);

        if (raceIndex === -1) {
            console.log("No matching race found by date. Creating new race entry...");
            const newId = seasonData.races.length + 1;
            seasonData.races.push({
                id: newId,
                name: `Round ${newId}`,
                track: parsedData.trackName,
                date: raceDate
            });
            raceIndex = seasonData.races.length - 1;
        }

        const raceId = seasonData.races[raceIndex].id;
        console.log(`Updating Map for Race ID: ${raceId}`);

        // Update Driver Data
        // We need to merge these results into the 'drivers' array.
        // Structure of season3.json drivers:
        // [ { id: 1, name: "Name", class: "Class", raceResults: [ { raceId: 1, position: 1, points: 25, ... } ] } ]

        parsedData.results.forEach(result => {
            const resultName = (result.name || '').trim();
            // Case-insensitive match
            let driver = seasonData.drivers.find(d => (d.name || '').trim().toLowerCase() === resultName.toLowerCase());

            if (!driver) {
                // Create new driver
                const newDriverId = seasonData.drivers.length > 0 ? Math.max(...seasonData.drivers.map(d => d.id)) + 1 : 1;
                driver = {
                    id: newDriverId,
                    name: resultName, // Use trimmed name
                    team: result.team,
                    car: result.car,
                    class: result.carClass === 'LMP2_ELMS' ? 'LMP2' : 'LMGT3', // Normalize class names
                    raceResults: []
                };
                seasonData.drivers.push(driver);
            }

            // Check if result for this race already exists
            const existingResultIndex = driver.raceResults.findIndex(r => r.raceId === raceId);

            const raceResultData = {
                raceId: raceId,
                position: result.position,
                classPosition: result.classPosition,
                laps: result.laps,
                totalTime: result.totalTime,
                bestLap: result.bestLap,
                status: result.status,
                attendance: 'Raced',
                points: 0 // TODO: Calculate points based on class position? Leave 0 for now or implement logic.
                // We'll leave points calculation to the App logic or specific script for now to keep this focused on ingestion.
            };

            if (existingResultIndex !== -1) {
                driver.raceResults[existingResultIndex] = { ...driver.raceResults[existingResultIndex], ...raceResultData };
            } else {
                driver.raceResults.push(raceResultData);
            }
        });

        // Save back to JSON
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(seasonData, null, 4));
        console.log("Season data updated successfully!");

    } catch (error) {
        console.error("Ingestion Failed:", error);
    }
}

ingest();
