const admin = require("firebase-admin");

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: "oofs-manager"
    });
}

const db = admin.firestore();

async function run() {
    try {
        const doc = await db.collection("seasons").doc("s5-sprint").get();
        if (doc.exists) {
            const data = doc.data();
            console.log("=== DRIVERS IN S5-SPRINT ===");
            data.drivers.forEach(d => {
                const r3 = d.raceResults.find(r => r.raceId === 3);
                console.log(`Driver: ${d.name} (ID: ${d.id}), Class: ${d.class}, R3 Class: ${r3 ? r3.drivenClass : 'N/A'}`);
            });
        } else {
            console.log("Document not found");
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
