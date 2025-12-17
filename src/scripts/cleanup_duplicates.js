import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE_PATH = path.resolve(__dirname, '../data/seasons/season2.json');

function cleanup() {
    try {
        console.log(`Reading data from: ${DATA_FILE_PATH}`);
        if (!fs.existsSync(DATA_FILE_PATH)) {
            console.error("Data file not found!");
            process.exit(1);
        }

        const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const data = JSON.parse(rawData);

        const idsToRemove = [40, 41];
        const initialCount = data.drivers.length;

        console.log(`Initial driver count: ${initialCount}`);
        console.log(`Removing IDs: ${idsToRemove.join(', ')}`);

        data.drivers = data.drivers.filter(d => !idsToRemove.includes(d.id));

        const finalCount = data.drivers.length;
        console.log(`Final driver count: ${finalCount}`);
        console.log(`Removed ${initialCount - finalCount} drivers.`);

        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2)); // Using indent 2 matches typical JSON style
        console.log("Cleanup successful!");

    } catch (error) {
        console.error("Cleanup failed:", error);
    }
}

cleanup();
