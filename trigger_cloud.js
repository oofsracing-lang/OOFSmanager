const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json'); // Might not exist, but let's check
if (!fs.existsSync('./serviceAccountKey.json')) {
    console.log("No serviceAccountKey.json found. I will use a different method if needed.");
    // Exit safely
    process.exit(0);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkStandings() {
    const doc = await db.collection('Standings').doc('s4-multi').get();
    if (!doc.exists) {
        console.log("No Standings document for s4-multi!");
        // Let's trigger a recalculation by touching the seasonData
        const seasonDataPath = './src/data/seasons/season4_multiclass.json';
        const seasonData = JSON.parse(fs.readFileSync(seasonDataPath, 'utf8'));
        await db.collection('seasonData').doc('s4-multi').set(seasonData);
        console.log("Uploaded seasonData/s4-multi to trigger Cloud Function.");
    } else {
        console.log("Standings for s4-multi exists:", doc.data().calculationSource);
    }
    
    // Check s4-sprint
    const sprintDoc = await db.collection('Standings').doc('s4-sprint').get();
    if (!sprintDoc.exists) {
        console.log("No Standings document for s4-sprint!");
        // trigger
        const sprintDataPath = './src/data/seasons/season4_sprint.json';
        const sprintData = JSON.parse(fs.readFileSync(sprintDataPath, 'utf8'));
        await db.collection('seasonData').doc('s4-sprint').set(sprintData);
        console.log("Uploaded seasonData/s4-sprint to trigger Cloud Function.");
    } else {
        console.log("Standings for s4-sprint exists:", sprintDoc.data().calculationSource);
    }
}

checkStandings().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
