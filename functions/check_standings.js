const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'oofs-manager'
});

const db = admin.firestore();

async function checkStandings() {
    try {
        const standingsDoc = await db.collection('standings').doc('3').get();

        if (standingsDoc.exists) {
            const data = standingsDoc.data();
            console.log('✓ Cloud standings exist!');
            console.log(`  Season: ${data.season}`);
            console.log(`  Drivers: ${data.drivers?.length || 0}`);
            console.log(`  Races: ${data.races?.length || 0}`);
            console.log(`  Last Updated: ${data.lastUpdated}`);
        } else {
            console.log('✗ No standings document found.');
            console.log('The calculateStandings function has not run yet.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkStandings();
