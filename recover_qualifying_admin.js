
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { XMLParser } = require("fast-xml-parser");

// Initialize
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "oofs-manager.firebasestorage.app"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// --- LOGIC HELPER (Simplified from Cloud Function) ---
const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity) return "N/A";
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(3);
    return `${m}:${s.padStart(6, '0')}`;
};

const analyzeQualifyingXml = (xmlContent, criteriaSettings) => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(xmlContent);

    if (!parsed.rFactorXML || !parsed.rFactorXML.RaceResults) {
        throw new Error("Invalid XML structure");
    }

    const raceResults = parsed.rFactorXML.RaceResults;
    const trackName = raceResults.TrackVenue;
    const raceDate = raceResults.DateTime;

    let driversData = raceResults.Driver;
    if (!driversData) {
        // Fallback for session nesting
        const potentialSessions = Object.keys(raceResults).filter(key =>
            key !== 'Setting' && key !== 'ServerName' && key !== 'TrackVenue' && typeof raceResults[key] === 'object'
        );
        for (const key of potentialSessions) {
            if (raceResults[key] && raceResults[key].Driver) {
                driversData = raceResults[key].Driver;
                break;
            }
        }
    }

    if (!driversData) throw new Error("No drivers found");
    if (!Array.isArray(driversData)) driversData = [driversData];

    // Auto-Select Driver (Assume Single User Upload or First)
    const driver = driversData[0];

    // Class Determination
    let criteriaClass = 'LMGT3';
    const rawClass = (driver.CarClass || '').toUpperCase();
    if (rawClass.includes('LMP2') || rawClass.includes('P2') || rawClass.includes('ORECA')) {
        criteriaClass = 'LMP2-UR';
    }

    const criteria = criteriaSettings[criteriaClass] || { consecutiveLaps: 5, maxAvgTime: 999 };
    const requiredConsecutive = criteria.consecutiveLaps;
    const maxAvgTime = criteria.maxAvgTime;

    const validLaps = [];
    if (driver.Lap) {
        const laps = Array.isArray(driver.Lap) ? driver.Lap : [driver.Lap];
        laps.forEach(lap => {
            const lapNum = parseInt(lap['@_num']);
            const s1 = parseFloat(lap['@_s1']);
            const s2 = parseFloat(lap['@_s2']);
            const s3 = parseFloat(lap['@_s3']);
            const et = parseFloat(lap['@_et'] || 0);

            if (!isNaN(s1) && !isNaN(s2) && !isNaN(s3) && s1 > 0 && s2 > 0 && s3 > 0) {
                const total = s1 + s2 + s3;
                validLaps.push({
                    lap: lapNum,
                    time: total,
                    timestamp: et
                });
            }
        });
    }

    validLaps.sort((a, b) => a.lap - b.lap);

    let bestAverage = Infinity;
    let bestSequence = [];

    if (validLaps.length >= requiredConsecutive) {
        for (let i = 0; i <= validLaps.length - requiredConsecutive; i++) {
            const sequence = validLaps.slice(i, i + requiredConsecutive);
            let isContinuous = true;
            for (let j = 0; j < sequence.length - 1; j++) {
                if (sequence[j + 1].lap !== sequence[j].lap + 1) { isContinuous = false; break; }
            }
            if (!isContinuous) continue;

            const totalTime = sequence.reduce((sum, l) => sum + l.time, 0);
            const avg = totalTime / requiredConsecutive;
            if (avg < bestAverage) {
                bestAverage = avg;
                bestSequence = sequence;
            }
        }
    }

    const passed = (bestAverage <= maxAvgTime);

    return {
        passed,
        driver,
        trackName,
        raceDate,
        criteriaClass,
        criteria,
        stats: {
            bestAverage: bestAverage === Infinity ? 0 : bestAverage,
            bestSequence,
            validLapCount: validLaps.length
        }
    };
};

const run = async () => {
    console.log("Starting Recovery...");

    // 1. Delete Old Data
    const q = db.collection('qualifying').where("seasonId", "==", "3");
    const snapshot = await q.get();
    if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Deleted ${snapshot.size} old records.`);
    }

    // 2. Fetch Settings 
    const seasonDoc = await db.collection('seasons').doc('3').get();
    let settings = {
        'LMP2-UR': { consecutiveLaps: 5, maxAvgTime: 120.0 },
        'LMGT3': { consecutiveLaps: 5, maxAvgTime: 140.0 }
    };
    if (seasonDoc.exists && seasonDoc.data().qualifyingSettings) {
        settings = seasonDoc.data().qualifyingSettings;
    }

    // 3. List Files
    const [files] = await bucket.getFiles({ prefix: 'season_3/uploads/' });
    console.log(`Found ${files.length} backups.`);

    // 4. Process
    for (const file of files) {
        if (!file.name.endsWith('.xml')) continue;
        console.log(`Processing ${file.name}...`);

        try {
            const [content] = await file.download();
            const xmlStr = content.toString();

            const result = analyzeQualifyingXml(xmlStr, settings);

            // Construct Submission
            const submission = {
                id: db.collection('qualifying').doc().id,
                timestamp: new Date().toISOString(), // Use now or extract from filename
                xmlDate: result.raceDate,
                driverName: result.driver.Name,
                carClass: result.criteriaClass,
                carType: result.driver.CarType || 'Unknown',
                track: result.trackName || 'Unknown',
                passed: result.passed,
                bestAverage: result.stats.bestAverage,
                bestLaps: result.stats.bestSequence, // ARRAY OF OBJECTS
                criteriaUsed: result.criteria,
                validLapCount: result.stats.validLapCount,
                seasonId: "3",
                calculationSource: 'recovery-script'
            };

            await db.collection('qualifying').doc(submission.id).set(submission);
            console.log(`  -> Saved: ${submission.driverName} (${formatTime(submission.bestAverage)})`);

        } catch (err) {
            console.error(`  -> Failed: ${err.message}`);
        }
    }

    console.log("Done.");
};

run();
