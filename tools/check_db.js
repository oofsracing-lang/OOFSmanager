const admin = require("firebase-admin");
admin.initializeApp({
    projectId: "oofs-manager"
});
const db = admin.firestore();

async function run() {
    const doc = await db.collection("seasons").doc("3").get();
    const data = doc.data();
    console.log("Races:");
    data.races.forEach(r => console.log(r.id, r.name, r.track, r.status));
    const r8 = data.races.find(r => r.id === 8);
    if (r8) {
        console.log("Round 8 exists:", r8);
    }
}
run().catch(console.error);
