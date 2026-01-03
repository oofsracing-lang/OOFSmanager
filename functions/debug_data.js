const admin = require('firebase-admin');
// const serviceAccount = require('./permissions.json');

// Initialize (Try header default credential if present, else standard)
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
    } catch (e) {
        console.log("Standard init failed, trying without args (ADC)...");
        admin.initializeApp();
    }
}

const db = admin.firestore();

const TARGET_ID = '1767457389337ig9jdnjab'; // From user screenshot

async function checkCollection(colName) {
    console.log(`Checking collection: ${colName}...`);
    const docRef = db.collection(colName).doc(TARGET_ID);
    const doc = await docRef.get();

    if (doc.exists) {
        console.log(`[FOUND] Document ${TARGET_ID} exists in '${colName}'`);
        console.log('Data:', doc.data());
        return true;
    } else {
        console.log(`[MISSING] Document ${TARGET_ID} does NOT exist in '${colName}'`);

        // List all docs just to see what's there
        const snapshot = await db.collection(colName).limit(5).get();
        console.log(`Example docs in ${colName}:`, snapshot.docs.map(d => d.id));
        return false;
    }
}

async function run() {
    console.log("Starting data audit...");
    await checkCollection('qualifying');
    await checkCollection('qualifyingSubmissions');
    console.log("Audit complete.");
    process.exit(0);
}

run();
