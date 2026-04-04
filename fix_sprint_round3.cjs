const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    try {
        const docRef = db.collection("seasons").doc("s3-sprint");
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log("Document s3-sprint not found!");
            process.exit(1);
        }

        const data = docSnap.data();
        let driversModified = 0;

        // 1. Wipe Race 3 results from all drivers
        data.drivers.forEach(d => {
            const before = d.raceResults.length;
            d.raceResults = d.raceResults.filter(r => String(r.raceId) !== "3");
            if (d.raceResults.length !== before) driversModified++;
        });

        // 2. Reset Race 3 to Scheduled, keep the schedule entry intact
        const race3 = data.races.find(r => String(r.id) === "3");
        if (race3) {
            race3.status = "Scheduled";
            race3.dramaLog = [];
        }

        // 3. Recalculate currentRound
        const completedVals = data.races.filter(r => r.status === "Completed").map(r => r.id);
        data.currentRound = completedVals.length > 0 ? Math.max(...completedVals) : 0;

        // 4. Remove the incorrect exclusion for key "3-40"
        if (data.exclusions && data.exclusions["3-40"]) {
            console.log("Removing incorrect exclusion 3-40...");
            delete data.exclusions["3-40"];
        }

        // 5. Log what we're keeping (penalties preserved)
        const penalties = data.penalties || {};
        const r3Penalties = Object.keys(penalties).filter(k => k.startsWith("3-"));
        console.log(`Keeping ${r3Penalties.length} genuine Round 3 penalties:`, r3Penalties);

        // 6. Write back
        console.log(`Writing back (${driversModified} drivers modified, currentRound=${data.currentRound})...`);
        await docRef.set(data);
        console.log("Done! Round 3 race results cleared. Penalties and schedule intact.");

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

run();
