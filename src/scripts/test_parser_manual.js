
const fs = require('fs');
const path = require('path');
const { parseQualifyingXml, analyzeQualifying } = require('../utils/qualifyingParser.js'); // Assuming we use require for this test script or convert via babel, but let's simple MJS it? 
// Actually, this project is Vite (ESM). I should write the test script as .mjs or ensure imports work.
// Since I can't easily change the file extension of the import in the source without breaking standard flow, 
// I'll just accept I might need to run this with 'node' and ensure type:module is in package.json or use .mjs.
// package.json type is likely not module.
// I will just use standard reads in the test script and mock the function if needed,
// OR logic check: I'll just write a quick script that imports the file if it's JS.

// Re-writing the test script to be self-contained for the parser logic to avoid import issues in this scratchpad env.
// I will copy the parser code into the verification script for immediate testing.

const xmlPath = path.join(__dirname, '../../2025_11_20_21_52_46-41R1.xml');
const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

// --- Mocking parsing lib ---
// I need fast-xml-parser. It should be in node_modules.
const { XMLParser } = require('fast-xml-parser');

const parseQualifyingXmlTest = (xmlContent) => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(xmlContent);

    if (!parsed.rFactorXML || !parsed.rFactorXML.RaceResults) {
        throw new Error("Invalid XML structure");
    }

    const raceResults = parsed.rFactorXML.RaceResults;
    const stream = raceResults.Race && raceResults.Race.Stream ? raceResults.Race.Stream : {};
    const scores = stream.Score ? (Array.isArray(stream.Score) ? stream.Score : [stream.Score]) : [];

    const driverLaps = {};

    scores.forEach(s => {
        const text = s['#text'];
        // Matches "Donovan Bailey(25) lap=1 point=0 t=119.805 et=319.500"
        const match = text.match(/^(.+?)\(\d+\)\s+lap=(\d+)\s+point=(\d+)\s+t=([\d\.\-]+)/);

        if (match) {
            const name = match[1];
            const lapNum = parseInt(match[2]);
            const point = parseInt(match[3]);
            const time = parseFloat(match[4]);

            if (point === 0 && time > 0) {
                if (!driverLaps[name]) driverLaps[name] = [];
                driverLaps[name].push({ lap: lapNum, time: time });
            }
        }
    });

    return driverLaps;
};

const analyzeQualifyingTest = (driverLaps, req, maxTime) => {
    if (!driverLaps || driverLaps.length < req) return { passed: false, msg: "Not enough laps" };
    let bestAvg = Infinity;

    // Sort
    driverLaps.sort((a, b) => a.lap - b.lap);

    for (let i = 0; i <= driverLaps.length - req; i++) {
        const seq = driverLaps.slice(i, i + req);

        // Continuity check
        let continuous = true;
        for (let j = 0; j < seq.length - 1; j++) {
            if (seq[j + 1].lap !== seq[j].lap + 1) { continuous = false; break; }
        }
        if (!continuous) continue;

        const avg = seq.reduce((a, b) => a + b.time, 0) / req;
        if (avg < bestAvg) bestAvg = avg;
    }

    return {
        passed: bestAvg <= maxTime,
        bestAvg: bestAvg === Infinity ? null : bestAvg,
        laps: driverLaps.length
    };
}


// --- RUN ---
try {
    console.log("Parsing...");
    const data = parseQualifyingXmlTest(xmlContent);

    // Check Donovan Bailey (Target: LMP2 is usually fast, ~1:45? IDK, let's verify data)
    // From XML view earlier: point=0 t=119.8 (approx 2 mins).

    const dbLaps = data["Donovan Bailey"];
    console.log("Donovan Bailey Laps:", JSON.stringify(dbLaps));

    // Test Criteria: 3 Consecutive Laps, Max Avg 125.0s
    if (dbLaps) {
        const result = analyzeQualifyingTest(dbLaps, 3, 125.0);
        console.log("Analysis Result (3 laps, <125s):", result);
    } else {
        console.log("No laps for Donovan Bailey found.");
    }
} catch (e) {
    console.error(e);
}
