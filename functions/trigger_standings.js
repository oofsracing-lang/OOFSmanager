const admin = require('firebase-admin');

// Suppress telemetry
process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: 'oofs-manager',
    databaseURL: 'https://oofs-manager.firebaseio.com'
});

admin.initializeApp();
const db = admin.firestore();

async function triggerStandings() {
    try {
        console.log('Triggering calculateStandings by updating seasons/3...');

        // Make a trivial update to trigger the Cloud Function
        await db.collection('seasons').doc('3').update({
            lastTriggered: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✓ Update sent. Cloud Function should execute within 5-10 seconds.');
        console.log('Waiting 15 seconds for function to complete...');

        await new Promise(resolve => setTimeout(resolve, 15000));

        // Check if standings were created
        const standingsDoc = await db.collection('standings').doc('3').get();

        if (standingsDoc.exists) {
            const data = standingsDoc.data();
            console.log('✓ SUCCESS! Cloud standings document created.');
            console.log(`  - Season: ${data.season}`);
            console.log(`  - Drivers: ${data.drivers?.length || 0}`);
            console.log(`  - Races: ${data.races?.length || 0}`);
        } else {
            console.log('⚠ Standings document not found yet. Check Cloud Function logs.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

triggerStandings();
