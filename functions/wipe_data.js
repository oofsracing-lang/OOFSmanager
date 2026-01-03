const admin = require('firebase-admin');

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

async function deleteCollection(collectionPath) {
    console.log(`Getting documents for ${collectionPath}...`);
    const snapshot = await db.collection(collectionPath).limit(500).get();

    if (snapshot.empty) {
        console.log(`No documents found in ${collectionPath}.`);
        return;
    }

    console.log(`Found ${snapshot.size} documents in ${collectionPath}. Deleting...`);
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted batch of ${snapshot.size} documents.`);

    if (snapshot.size >= 500) {
        console.log("More documents might exist, re-running...");
        // Re-run for more
        await deleteCollection(collectionPath);
    }
}

async function run() {
    console.log("Starting DB Wipe...");
    try {
        // Wipe 'qualifying' (The current collection)
        await deleteCollection('qualifying');
        // Wipe 'qualifyingSubmissions' (The legacy/potential ghost collection)
        await deleteCollection('qualifyingSubmissions');
        console.log("Wipe Complete.");
    } catch (e) {
        console.error("Wipe failed:", e);
    }
    process.exit(0);
}

run();
