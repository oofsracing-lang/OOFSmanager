const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkSettings() {
    const docRef = db.collection('seasons').doc('3');
    const doc = await docRef.get();
    if (doc.exists) {
        console.log("Current Firestore Data:", JSON.stringify(doc.data().qualifyingSettings, null, 2));
    } else {
        console.log("Season 3 document not found");
    }
}

checkSettings();
