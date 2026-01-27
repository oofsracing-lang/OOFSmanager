
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { NEW_ROSTER } from '../data/roster_data.js';

// --- CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyDtc3vg5ST87frt_oFi-m09EN_gxOM4Rxk",
    authDomain: "oofs-manager.firebaseapp.com",
    projectId: "oofs-manager",
    storageBucket: "oofs-manager.firebasestorage.app",
    messagingSenderId: "86894390970",
    appId: "1:86894390970:web:6a71e5426e5b761f509c83"
};

const SEASON_ID = "3";

// --- INIT ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Starting Headless Roster Update for Season " + SEASON_ID + "...");

    const docRef = doc(db, 'seasons', SEASON_ID);

    // Fetch current data
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
        console.error("Season document does not exist! Aborting.");
        process.exit(1);
    }

    const currentData = snapshot.data();
    console.log("Current Data fetched. Roster size:", currentData.config?.driverRoster?.length || 0);

    // Prepare Update
    const nextData = { ...currentData };
    if (!nextData.config) nextData.config = {};
    nextData.config.driverRoster = NEW_ROSTER;

    // Sync Drivers List
    let addedCount = 0;
    NEW_ROSTER.forEach(newD => {
        const exists = nextData.drivers.find(d => d.name.toLowerCase() === newD.name.toLowerCase());
        if (!exists) {
            const newId = nextData.drivers.length > 0 ? Math.max(...nextData.drivers.map(d => d.id)) + 1 : 1;
            nextData.drivers.push({
                id: newId,
                name: newD.name,
                class: newD.class,
                team: '',
                car: '',
                number: newD.number || '',
                raceResults: []
            });
            addedCount++;
        } else {
            exists.class = newD.class;
            if (newD.number) exists.number = newD.number;
        }
    });
    console.log(`Synced drivers list. Added ${addedCount} new driver entries.`);

    // Write back
    await setDoc(docRef, nextData, { merge: true });
    console.log("Update SUCCESS! Database updated.");
    process.exit(0);
}

run().catch(e => {
    console.error("FATAL:", e);
    process.exit(1);
});
