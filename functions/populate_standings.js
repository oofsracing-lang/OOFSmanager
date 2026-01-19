const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'oofs-manager'
});

const db = admin.firestore();

// Import the calculation logic from the Cloud Function
function calculateChampionship(seasonData) {
    const data = JSON.parse(JSON.stringify(seasonData));
    const penalties = data.penalties || {};
    const manualPositions = data.manualPositions || {};
    const exclusions = data.exclusions || {};

    // Filter out duplicate drivers
    if (data.drivers) {
        data.drivers = data.drivers.filter(d => ![40, 41].includes(d.id));
    }

    const pointsTable = [
        50, 47, 44, 41, 38,
        35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16
    ];

    // Auto-calculate currentRound
    const currentRound = data.currentRound || Math.max(
        0,
        ...data.drivers.flatMap(d =>
            (d.raceResults || []).map(r => r.raceId)
        )
    );

    // Find completed races (races with results)
    const completedRaces = data.races.filter(r => {
        const hasResults = data.drivers.some(d =>
            d.raceResults && d.raceResults.some(res => String(res.raceId) === String(r.id))
        );
        return hasResults || r.status === 'Completed' || (r.id <= currentRound);
    });

    console.log(`Processing ${completedRaces.length} completed races...`);

    completedRaces.forEach(race => {
        const processClass = (className) => {
            const participants = data.drivers.filter(d => {
                const r = d.raceResults.find(res => String(res.raceId) === String(race.id));
                if (!r) return false;
                const raceClass = r.drivenClass || d.class;
                return raceClass === className;
            });

            participants.forEach(d => {
                const result = d.raceResults.find(r => String(r.raceId) === String(race.id));
                const penaltyKey = `${race.id}-${d.id}`;
                const penaltyTime = parseFloat(penalties[penaltyKey] || 0);
                const isExcluded = !!exclusions[`${race.id}-${d.id}`];

                if (result) {
                    result.penaltyTime = penaltyTime;
                    result.isExcluded = isExcluded;
                }
            });

            // Sort by laps (desc), then by time (asc)
            participants.sort((a, b) => {
                const aRes = a.raceResults.find(r => String(r.raceId) === String(race.id));
                const bRes = b.raceResults.find(r => String(r.raceId) === String(race.id));

                if (bRes.laps !== aRes.laps) return bRes.laps - aRes.laps;
                return (aRes.time + aRes.penaltyTime) - (bRes.time + bRes.penaltyTime);
            });

            // Assign positions and points
            participants.forEach((d, idx) => {
                const result = d.raceResults.find(r => String(r.raceId) === String(race.id));
                result.position = idx + 1;
                result.points = result.isExcluded ? 0 : (pointsTable[idx] || 0);
            });
        };

        // Process each class
        const classes = [...new Set(data.drivers.map(d => d.class))];
        classes.forEach(processClass);
    });

    // Calculate totals
    data.drivers.forEach(driver => {
        if (driver.raceResults && driver.raceResults.length > 0) {
            const validResults = driver.raceResults.filter(r => !r.isExcluded);
            driver.totalPoints = validResults.reduce((sum, r) => sum + (r.points || 0), 0);
            driver.currentBallast = 0; // Simplified
        } else {
            driver.totalPoints = 0;
            driver.currentBallast = 0;
        }
    });

    data.calculationSource = 'Cloud Backend (Manual Fix)';
    data.currentRound = currentRound;
    data.totalRounds = data.races.length;

    return data;
}

async function populateStandings() {
    try {
        console.log('Reading seasons/3 document...');
        const seasonDoc = await db.collection('seasons').doc('3').get();

        if (!seasonDoc.exists) {
            console.error('seasons/3 document does not exist!');
            process.exit(1);
        }

        const seasonData = seasonDoc.data();
        console.log(`Season: ${seasonData.season}`);
        console.log(`Drivers: ${seasonData.drivers?.length || 0}`);
        console.log(`Races: ${seasonData.races?.length || 0}`);

        console.log('\nCalculating standings...');
        const calculatedData = calculateChampionship(seasonData);

        console.log(`\nCalculated standings:`);
        console.log(`  Drivers: ${calculatedData.drivers?.length || 0}`);
        console.log(`  Races processed: ${calculatedData.currentRound}`);

        console.log('\nWriting to standings/3...');
        await db.collection('standings').doc('3').set({
            ...calculatedData,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✓ SUCCESS! standings/3 document populated.');
        console.log('\nVerifying...');

        const standingsDoc = await db.collection('standings').doc('3').get();
        const standingsData = standingsDoc.data();

        console.log(`  Season: ${standingsData.season}`);
        console.log(`  Drivers: ${standingsData.drivers?.length || 0}`);
        console.log(`  Source: ${standingsData.calculationSource}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

populateStandings();
