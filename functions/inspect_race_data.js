
const admin = require('firebase-admin');

// Initialize Firebase Admin using Application Default Credentials
if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            projectId: 'oofs-manager'
        });
    } catch (e) {
        console.log("Standard init failed, trying without args (ADC)...");
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function inspectRaceData() {
    console.log("🔎 Inspecting Season 3 Data for Race 2 (Sarthe)...");

    try {
        const seasonDoc = await db.collection('seasons').doc('3').get();
        if (!seasonDoc.exists) {
            console.log("❌ Season 3 document not found!");
            return;
        }

        const data = seasonDoc.data();
        const race = data.races.find(r => r.id === 2);

        console.log("\n🏁 Race Metadata:");
        if (race) {
            console.log(`- Name: ${race.name}`);
            console.log(`- Track: ${race.track}`);
            console.log(`- Status: ${race.status}`);
            console.log(`- Date: ${race.date}`);
        } else {
            console.log("❌ Race 2 not found in races array.");
        }

        console.log("\n🏎️  Driver Results for Race 2:");
        let foundResults = 0;
        if (data.drivers && Array.isArray(data.drivers)) {
            data.drivers.forEach(d => {
                const result = d.raceResults.find(r => r.raceId === 2);
                if (result) {
                    foundResults++;
                    console.log(`- [${d.number}] ${d.name} (${d.class}): Pos ${result.position} / ${result.classPosition}`);
                }
            });
        }

        console.log(`\n📊 Total Drivers with Results for Race 2: ${foundResults}`);
        console.log(`ℹ️  Total Drivers in Database: ${data.drivers ? data.drivers.length : 0}`);

    } catch (error) {
        console.error("❌ Error inspecting data:", error);
    }
}

inspectRaceData();
