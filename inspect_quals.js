
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectData() {
    const snapshot = await db.collection('qualifying').where('seasonId', '==', '3').limit(5).get();
    if (snapshot.empty) {
        console.log('No matching documents.');
        return;
    }

    snapshot.forEach(doc => {
        console.log(doc.id, '=>', JSON.stringify(doc.data(), null, 2));
    });
}

inspectData().catch(console.error);
