import { db } from './index';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

// Collection Name
const SEASONS_COLLECTION = 'seasons';

/**
 * Subscribe to a specific season's data in real-time.
 * @param {string|number} seasonId 
 * @param {function} onDataChange - Callback receiving (data, loading)
 * @returns {function} Unsubscribe function
 */
export const subscribeToSeason = (seasonId, onDataChange) => {
    const docRef = doc(db, SEASONS_COLLECTION, String(seasonId));

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onDataChange(docSnap.data(), false);
        } else {
            console.log("No such document! Waiting for creation...");
            onDataChange(null, false);
        }
    }, (error) => {
        console.error("Firestore Error:", error);
        onDataChange(null, false, error); // Could pass error back
    });

    return unsubscribe;
};

/**
 * Subscribe to calculated Standings (Output from Cloud Function)
 * @param {string|number} seasonId 
 * @param {function} onDataChange 
 */
export const subscribeToStandings = (seasonId, onDataChange) => {
    const docRef = doc(db, 'standings', String(seasonId));

    // Default to null if not found
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onDataChange(docSnap.data(), false);
        } else {
            onDataChange(null, false);
        }
    }, (error) => {
        console.error("Standings Subscription Error:", error);
        onDataChange(null, false, error);
    });

    return unsubscribe;
};

/**
 * Save (Overwrite/Merge) season data. 
 * Use this for importing XMLs or changing deep structures.
 * @param {string|number} seasonId 
 * @param {object} data - The full season object
 */
export const saveSeasonData = async (seasonId, data) => {
    try {
        const docRef = doc(db, SEASONS_COLLECTION, String(seasonId));
        // We use setDoc with merge: true to avoid wiping fields not present, 
        // though usually we pass the full object here.
        await setDoc(docRef, data, { merge: true });
        console.log("Season data saved to cloud.");
    } catch (e) {
        console.error("Error saving season data:", e);
        throw e;
    }
};

/**
 * Update specific fields (like penalties or manual positions) purely.
 * @param {string|number} seasonId 
 * @param {object} updates - e.g. { penalties: {...}, manualPositions: {...} }
 */
export const updateSeasonFields = async (seasonId, updates) => {
    try {
        const docRef = doc(db, SEASONS_COLLECTION, String(seasonId));
        console.log(`[DB] Updating Document: ${SEASONS_COLLECTION}/${String(seasonId)}`, updates);
        await updateDoc(docRef, updates);
        console.log("[DB] Update Success!");
    } catch (e) {
        console.error("Error updating season fields:", e);
        throw e;
    }
};

/**
 * Upload Raw XML file to Firebase Storage for backup
 * @param {File} file 
 * @param {string} seasonId 
 */
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "./index";

export const uploadXmlBackup = async (file, seasonId) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Path: season_DATA/uploads/YYYY-MM-DD_HH-MM-SS_filename.xml
        const storageRef = ref(storage, `season_${seasonId}/uploads/${timestamp}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        console.log('XML Backup uploaded successfully:', snapshot.metadata.fullPath);
        return snapshot.metadata.fullPath;
    } catch (error) {
        console.error("Error uploading XML backup:", error);
        // We don't throw here strictly; we might want to allow data import even if backup fails?
        // Or cleaner to throw and let UI decide. Let's throw.
        throw error;
    }
};
