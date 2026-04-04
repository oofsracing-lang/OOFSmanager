const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Suppress telemetry
process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: 'oofs-manager',
    databaseURL: 'https://oofs-manager.firebaseio.com'
});

admin.initializeApp();
const db = admin.firestore();

async function pushSeasonData() {
    try {
        console.log('Pushing Season 4 Sprint and Multiclass data to Firebase...');

        // Paths relative to functions directory
        const multiPath = path.join(__dirname, '../src/data/seasons/season4_multiclass.json');
        const sprintPath = path.join(__dirname, '../src/data/seasons/season4_sprint.json');

        const multiData = JSON.parse(fs.readFileSync(multiPath, 'utf8'));
        const sprintData = JSON.parse(fs.readFileSync(sprintPath, 'utf8'));

        await db.collection('seasons').doc('s4-multi').set(multiData);
        console.log('✓ s4-multi pushed successfully. Cloud function will now generate Standings/s4-multi within 10s.');

        await db.collection('seasons').doc('s4-sprint').set(sprintData);
        console.log('✓ s4-sprint pushed successfully. Cloud function will now generate Standings/s4-sprint within 10s.');

        console.log('Waiting 10 seconds for cloud functions to finish...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const msDoc = await db.collection('standings').doc('s4-multi').get();
        if (msDoc.exists) {
            console.log('✓ Standings document created for s4-multi');
        } else {
             console.log('⚠ Standings document NOT created for s4-multi! Double check Firebase.');
        }

        const ssDoc = await db.collection('standings').doc('s4-sprint').get();
        if (ssDoc.exists) {
            console.log('✓ Standings document created for s4-sprint');
        } else {
             console.log('⚠ Standings document NOT created for s4-sprint! Double check Firebase.');
        }

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

pushSeasonData();
