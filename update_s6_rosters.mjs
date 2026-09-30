import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
    apiKey: "AIzaSyDtc3vg5ST87frt_oFi-m09EN_gxOM4Rxk",
    authDomain: "oofs-manager.firebaseapp.com",
    projectId: "oofs-manager",
    storageBucket: "oofs-manager.firebasestorage.app",
    messagingSenderId: "86894390970",
    appId: "1:86894390970:web:6a71e5426e5b761f509c83"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Update a championship roster both in local JSON and in Firestore.
 * @param {'s6-endurance' | 's6-sprint'} seasonId
 * @param {Array<{name: string, class: string, number?: string, reserve?: boolean, team?: string}>} roster
 */
export async function applyRoster(seasonId, roster) {
    const fileNameMap = {
        's6-endurance': 'season6_endurance.json',
        's6-sprint': 'season6_sprint.json'
    };

    const fileName = fileNameMap[seasonId];
    if (!fileName) {
        throw new Error(`Unknown season ID: ${seasonId}`);
    }

    const filePath = path.join(__dirname, 'src', 'data', 'seasons', fileName);
    const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Format roster items cleanly
    const formattedRoster = roster.map(d => ({
        name: d.name.trim(),
        class: d.class.trim(),
        number: d.number ? String(d.number).trim() : '',
        car: d.car ? String(d.car).trim() : '',
        reserve: Boolean(d.reserve),
        team: d.team ? String(d.team).trim() : ''
    }));

    // Update local JSON
    if (!localData.config) localData.config = {};
    localData.config.driverRoster = formattedRoster;
    fs.writeFileSync(filePath, JSON.stringify(localData, null, 2));
    console.log(`[Local] Updated ${fileName} with ${formattedRoster.length} drivers.`);

    // Update Firestore
    const docRef = doc(db, 'seasons', seasonId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        await updateDoc(docRef, {
            'config.driverRoster': formattedRoster
        });
        console.log(`[Firestore] Updated season '${seasonId}' config.driverRoster with ${formattedRoster.length} drivers.`);
    } else {
        console.warn(`[Firestore] Document 'seasons/${seasonId}' does not exist, skipped remote update.`);
    }
}
