// Simple HTTP endpoint to upload Season 2 data
// This will be a cloud function you can call via URL

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.uploadSeason2 = functions.https.onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }

    try {
        const season2Data = req.body;

        if (!season2Data || !season2Data.drivers || !season2Data.races) {
            throw new Error('Invalid season data format');
        }

        console.log(`Uploading Season 2: ${season2Data.drivers.length} drivers, ${season2Data.races.length} races`);

        // Write to Firestore
        await admin.firestore().collection('seasons').doc('2').set(season2Data);

        console.log('✅ Season 2 uploaded successfully');

        res.status(200).json({
            success: true,
            message: 'Season 2 data uploaded',
            drivers: season2Data.drivers.length,
            races: season2Data.races.length
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});
