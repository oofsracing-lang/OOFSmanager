const admin = require('firebase-admin');

try {
    admin.initializeApp();
} catch (e) {
    console.log("Init:", e.message);
}

const db = admin.firestore();

async function checkSeason2() {
    try {
        console.log("Fetching Season 2 from Firestore...");
        const doc = await db.collection('seasons').doc('2').get();

        if (!doc.exists) {
            console.log("❌ Season 2 does NOT exist in Firestore!");
            return;
        }

        const data = doc.data();
        console.log("\n✅ Season 2 EXISTS in Firestore");
        console.log(`Drivers: ${data.drivers ? data.drivers.length : 0}`);
        console.log(`Races: ${data.races ? data.races.length : 0}`);

        // Check Race 8
        const race8 = data.races ? data.races.find(r => r.id === 8) : null;
        console.log(`\nRace 8 (Spa): ${race8 ? race8.status : 'NOT FOUND'}`);

        // Count drivers with Race 8 results
        if (data.drivers) {
            const driversWithRace8 = data.drivers.filter(d =>
                d.raceResults && d.raceResults.some(r => r.raceId === 8)
            );
            console.log(`Drivers with Race 8 results: ${driversWithRace8.length}`);

            // Check LMP2 drivers specifically
            const lmp2WithRace8 = driversWithRace8.filter(d =>
                d.class === 'LMP2-UR' || d.class === 'LMP2'
            );
            console.log(`LMP2 drivers with Race 8 results: ${lmp2WithRace8.length}`);

            if (lmp2WithRace8.length > 0) {
                console.log("\nSample LMP2 Race 8 result:");
                const sample = lmp2WithRace8[0];
                const race8Result = sample.raceResults.find(r => r.raceId === 8);
                console.log(`  Driver: ${sample.name}`);
                console.log(`  Points: ${race8Result.points}`);
                console.log(`  Position: ${race8Result.position}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

checkSeason2();
