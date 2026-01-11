import { db, storage } from './index';
import { ref, uploadBytes, listAll, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot, setDoc, updateDoc, collection, addDoc, deleteDoc, query, where, orderBy, getDocs, writeBatch } from 'firebase/firestore';

// ... (existing content) ...

/**
 * Upload Raw XML file to Firebase Storage for backup
 * @param {File} file 
 * @param {string} seasonId 
 */
export const uploadXmlBackup = async (file, seasonId) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const storageRef = ref(storage, `season_${seasonId}/uploads/${timestamp}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return snapshot.metadata.fullPath;
    } catch (error) {
        console.error("Error uploading XML backup:", error);
        throw error;
    }
};

/**
 * List all uploaded XML backups for a season
 * @param {string} seasonId
 * @returns {Promise<Array<{name: string, url: string}>>}
 */
export const listSeasonUploads = async (seasonId) => {
    try {
        const listRef = ref(storage, `season_${seasonId}/uploads/`);
        const res = await listAll(listRef);

        const files = await Promise.all(res.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return {
                name: itemRef.name,
                url: url
            };
        }));

        return files;
    } catch (error) {
        console.error("Error listing uploads:", error);
        return [];
    }
};

/**
 * Delete ALL qualifying submissions for a specific season
 * Use with caution!
 * @param {string} seasonId
 */
export const deleteAllQualifying = async (seasonId) => {
    try {
        const colRef = collection(db, QUALIFYING_COLLECTION);
        const q = query(colRef, where("seasonId", "==", String(seasonId)));
        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Deleted ${snapshot.size} qualifying entries.`);
    } catch (error) {
        console.error("Error clearing qualifying:", error);
        throw error;
    }
};

// Collection Name
const SEASONS_COLLECTION = 'seasons';
const QUALIFYING_COLLECTION = 'qualifying';

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

    } catch (e) {
        console.error("Error saving season data:", e);
        throw e;
    }
};









/**
 * Delete cached standings (Use for Reset)
 * @param {string|number} seasonId 
 */
/**
 * Hard Overwrite season data (No Merge). 
 * Use this for RESET operations.
 * @param {string|number} seasonId 
 * @param {object} data 
 */
export const overwriteSeasonData = async (seasonId, data) => {
    try {
        const docRef = doc(db, SEASONS_COLLECTION, String(seasonId));
        await setDoc(docRef, data, { merge: false });
    } catch (e) {
        console.error("Error overwriting season data:", e);
        throw e;
    }
};

/**
 * Delete cached standings (Use for Reset)
 * @param {string|number} seasonId 
 */
export const deleteStandings = async (seasonId) => {
    try {
        const docRef = doc(db, 'standings', String(seasonId));
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting standings:", e);
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
        await setDoc(docRef, updates, { merge: true });
    } catch (e) {
        console.error("Error updating season fields:", e);
        throw e;
    }
};

/**
 * Helper to remove undefined fields from an object (Firestore rejects undefined)
 */
const cleanObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const cleaned = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
            cleaned[key] = cleanObject(value);
        } else {
            // Option: cleaned[key] = null; // if we want to preserve keys
            // For now, let's just drop undefined keys
        }
    });
    return cleaned;
};

/**
 * Save a new qualifying submission (Public Access)
 * @param {object} submission 
 */
export const saveQualifyingSubmission = async (submission) => {
    try {
        const colRef = collection(db, QUALIFYING_COLLECTION);
        // Ensure submission has a timestamp for ordering
        const rawPayload = {
            ...submission,
            createdAt: new Date().toISOString()
        };
        const payload = cleanObject(rawPayload);

        await addDoc(colRef, payload);
    } catch (e) {
        console.error("Error saving qualifying submission:", e);
        throw e;
    }
};

/**
 * Delete a qualifying submission
 * @param {string} submissionId 
 */
export const deleteQualifyingSubmission = async (submissionId) => {
    try {
        const docRef = doc(db, QUALIFYING_COLLECTION, submissionId);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting qualifying submission:", e);
        throw e;
    }
};

/**
 * Subscribe to qualifying submissions for a specific season.
 * @param {string|number} seasonId 
 * @param {function} onDataChange 
 */
export const subscribeToQualifying = (seasonId, onDataChange) => {
    const colRef = collection(db, QUALIFYING_COLLECTION);

    // Simple query: Order by timestamp desc + Filter by Season
    // Composite Index might be needed: seasonId + timestamp
    const q = query(
        colRef,
        where("seasonId", "==", String(seasonId || 3)), // Default to 3 if missing, enforce String
        orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const submissions = [];
        snapshot.forEach((doc) => {
            // CRITICAL FIX: Put doc.id LAST to ensure it overwrites any 'id' field inside data()
            // This fixes the "Ghost Data" deletion bug where internal ID != Document Key
            submissions.push({ ...doc.data(), id: doc.id });
        });
        onDataChange(submissions);
    }, (error) => {
        console.error("Qualifying Subscription Error:", error);
        onDataChange([]);
    });

    return unsubscribe;
};


