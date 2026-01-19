// Initial env vars to suppress Google Cloud Tracing/Telemetry errors
process.env.GRPC_TRACE = 'all';
process.env.GRPC_VERBOSITY = 'NONE';
process.env.FIRESTORE_EMULATOR_HOST = ''; // Ensure no emulator interference

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with explicit settings to avoid auto-discovery issues
const app = admin.initializeApp({
    projectId: 'oofs-manager' // Explicitly set project ID
});
const db = app.firestore();
db.settings({ ignoreUndefinedProperties: true }); // Helpful for data upload

/**
 * Seed Season Data to Firestore
 * Uploads local season JSON to the cloud database
 */
async function seedSeason() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Load the local season data
        const seasonFilePath = path.join(__dirname, '../src/data/seasons/season3_multiclass.json');
        const seasonData = JSON.parse(fs.readFileSync(seasonFilePath, 'utf8'));

        const seasonId = '3'; // Season ID to use in Firestore

        console.log(`📦 Loaded season data from ${path.basename(seasonFilePath)}`);
        console.log(`   - Season: ${seasonData.season || 'N/A'}`);
        console.log(`   - ID: ${seasonData.id || seasonId}`);
        console.log(`   - Races: ${seasonData.races?.length || 0}`);
        console.log(`   - Driver Roster: ${seasonData.config?.driverRoster?.length || 0}\n`);

        // Upload to Firestore at seasons/{seasonId}
        const seasonRef = db.collection('seasons').doc(seasonId);

        console.log(`⬆️  Uploading to Firestore: seasons/${seasonId}...`);
        await seasonRef.set(seasonData);

        console.log('✅ Season data uploaded successfully!\n');

        // Verify the upload
        const uploadedDoc = await seasonRef.get();
        if (uploadedDoc.exists) {
            console.log('✅ Verification: Data exists in Firestore');
            const uploadedData = uploadedDoc.data();
            console.log(`   - Season: ${uploadedData.season || 'N/A'}`);
            console.log(`   - Races: ${uploadedData.races?.length || 0}`);
            console.log(`   - Driver Roster: ${uploadedData.config?.driverRoster?.length || 0}`);
        } else {
            console.log('❌ Verification failed: Document does not exist');
        }

        console.log('\n🎉 Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

// Run the seeding script
seedSeason();
