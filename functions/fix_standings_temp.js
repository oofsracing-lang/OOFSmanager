// Temporary HTTP function to manually populate standings/3
exports.fixStandings = functions.https.onRequest(async (req, res) => {
    try {
        console.log('Manual standings fix triggered...');

        // Read season data
        const seasonDoc = await admin.firestore().collection('seasons').doc('3').get();
        if (!seasonDoc.exists) {
            throw new Error('Season 3 not found');
        }

        const seasonData = seasonDoc.data();
        console.log(`Season: ${seasonData.season}, Drivers: ${seasonData.drivers?.length}`);

        // Calculate standings
        const calculatedData = calculateChampionship(seasonData);
        const sanitized = sanitizeForFirestore(calculatedData);

        // Add metadata
        sanitized.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
        sanitized.calculationSource = 'Manual Fix via HTTP';

        // Write to standings/3
        await admin.firestore().collection('standings').doc('3').set(sanitized);

        console.log(`✓ Standings written. Drivers: ${sanitized.drivers?.length}`);

        res.status(200).json({
            success: true,
            season: sanitized.season,
            drivers: sanitized.drivers?.length || 0,
            races: sanitized.races?.length || 0,
            currentRound: sanitized.currentRound
        });
    } catch (error) {
        console.error('Fix standings error:', error);
        res.status(500).json({ error: error.message });
    }
});
