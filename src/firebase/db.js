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

// Collection Name
const INCIDENTS_COLLECTION = 'incidents';

/**
 * Save a new incident report (Public Access)
 * @param {object} incident 
 */
export const saveIncident = async (incident) => {
    try {
        const colRef = collection(db, INCIDENTS_COLLECTION);
        const rawPayload = {
            ...incident,
            createdAt: new Date().toISOString(),
            status: 'Pending'
        };
        const payload = cleanObject(rawPayload);
        await addDoc(colRef, payload);
    } catch (e) {
        console.error("Error saving incident:", e);
        throw e;
    }
};

/**
 * Delete an incident
 * @param {string} incidentId 
 */
export const deleteIncident = async (incidentId) => {
    try {
        const docRef = doc(db, INCIDENTS_COLLECTION, incidentId);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting incident:", e);
        throw e;
    }
};

/**
 * Update an incident (Admin Access - Decisions/Penalties)
 * @param {string} incidentId 
 * @param {object} updates 
 */
export const updateIncident = async (incidentId, updates) => {
    try {
        const docRef = doc(db, INCIDENTS_COLLECTION, incidentId);
        const payload = cleanObject(updates);
        // Automatic status update removed to allow manual 'Complete' toggle
        await updateDoc(docRef, payload);
    } catch (e) {
        console.error("Error updating incident:", e);
        throw e;
    }
};

/**
 * Subscribe to incidents for a specific season.
 * @param {string|number} seasonId 
 * @param {function} onDataChange 
 */
export const subscribeToIncidents = (seasonId, onDataChange) => {
    const colRef = collection(db, INCIDENTS_COLLECTION);

    const q = query(
        colRef,
        where("seasonId", "==", String(seasonId))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const incidents = [];
        snapshot.forEach((doc) => {
            incidents.push({ ...doc.data(), id: doc.id });
        });
        // Client-side sort: Newest first
        incidents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        onDataChange(incidents);
    }, (error) => {
        console.error("Incidents Subscription Error:", error);
        onDataChange([]);
    });

    return unsubscribe;
};

// Collection Name
const LICENSE_POINTS_COLLECTION = 'licensePoints';

/**
 * Calculate license point status based on total points
 * @param {number} points 
 * @returns {object} { status, description, color }
 */
/**
 * Calculate license point status based on total points and served penalties
 * @param {number} points 
 * @param {number} servedThreshold - The highest point threshold already served
 * @returns {object} { status, description, color }
 */
export const calculateLicenseStatus = (points, servedThreshold = 0) => {
    if (points >= 7 && servedThreshold < 7) {
        return { status: 'RACE_BAN', description: 'Race Ban', color: 'danger', emoji: '🔴' };
    } else if (points >= 5 && servedThreshold < 5) {
        return { status: 'QUALI_BAN', description: 'Qualifying Ban', color: 'warning', emoji: '🟠' };
    } else if (points >= 3 && servedThreshold < 3) {
        return { status: 'DT_PENDING', description: 'Pre-race DT Pending', color: 'warning', emoji: '🟡' };
    }
    return { status: 'OK', description: 'Clean License', color: 'success', emoji: '✅' };
};

/**
 * Add or update license points for a driver
 * @param {string} seasonId 
 * @param {number} driverId 
 * @param {string} driverName 
 * @param {number} pointsToAdd - Can be negative to subtract
 * @param {string} reason 
 * @param {string} source - e.g., "incident", "admin_penalty", "manual"
 * @param {string} sourceId - e.g., incidentId, raceId, or null
 * @param {string} adminName - Who made the change
 */
export const updateDriverLicensePoints = async (seasonId, driverId, driverName, pointsToAdd, reason, source = 'manual', sourceId = null, adminName = 'System') => {
    try {
        const docId = `${seasonId}_driver-${driverId}`;
        const docRef = doc(db, LICENSE_POINTS_COLLECTION, docId);

        // Get existing data
        const colRef = collection(db, LICENSE_POINTS_COLLECTION);
        const q = query(colRef, where('seasonId', '==', String(seasonId)), where('driverId', '==', Number(driverId)));
        const snapshot = await getDocs(q);

        let existingData = null;
        if (!snapshot.empty) {
            existingData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }

        const currentPoints = existingData?.totalPoints || 0;
        const servedThreshold = existingData?.highestServedThreshold || 0;

        // Calculate new total
        let newTotal = currentPoints + pointsToAdd;
        if (newTotal < 0) newTotal = 0; // Prevent negative

        const logEntry = {
            timestamp: new Date().toISOString(),
            points: pointsToAdd,
            totalAfter: newTotal,
            reason: reason,
            source: source,
            sourceId: sourceId,
            adminName: adminName
        };

        const status = calculateLicenseStatus(newTotal, servedThreshold);

        const payload = {
            seasonId: String(seasonId),
            driverId: Number(driverId),
            driverName: driverName,
            totalPoints: newTotal,
            highestServedThreshold: servedThreshold, // Preserve existing
            currentStatus: status.status,
            statusDescription: status.description,
            pointHistory: existingData?.pointHistory ? [...existingData.pointHistory, logEntry] : [logEntry],
            updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, cleanObject(payload), { merge: true });

    } catch (e) {
        console.error("Error updating license points:", e);
        throw e;
    }
};

/**
 * Get license points for a specific driver
 * @param {string} seasonId 
 * @param {number} driverId 
 */
export const getDriverLicensePoints = async (seasonId, driverId) => {
    try {
        const colRef = collection(db, LICENSE_POINTS_COLLECTION);
        const q = query(colRef, where('seasonId', '==', String(seasonId)), where('driverId', '==', Number(driverId)));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (e) {
        console.error("Error getting license points:", e);
        return null;
    }
};

/**
 * Subscribe to all license points for a season
 * @param {string} seasonId 
 * @param {function} onDataChange 
 */
export const subscribeToLicensePoints = (seasonId, onDataChange) => {
    const colRef = collection(db, LICENSE_POINTS_COLLECTION);
    const q = query(colRef, where('seasonId', '==', String(seasonId)));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const records = [];
        snapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
        });
        // Sort by points descending
        records.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        onDataChange(records);
    }, (error) => {
        console.error("License Points Subscription Error:", error);
        onDataChange([]);
    });

    return unsubscribe;
};

/**
 * Remove a driver from license point tracking
 * @param {string} seasonId 
 * @param {number} driverId 
 */
export const removeDriverLicensePoints = async (seasonId, driverId) => {
    try {
        const colRef = collection(db, LICENSE_POINTS_COLLECTION);
        const q = query(colRef, where('seasonId', '==', String(seasonId)), where('driverId', '==', Number(driverId)));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            await deleteDoc(snapshot.docs[0].ref);
        }
    } catch (e) {
        console.error("Error removing license points:", e);
        throw e;
    }
};

/**
 * Mark a penalty as served (adds log entry AND updates status)
 * @param {string} seasonId 
 * @param {number} driverId 
 * @param {string} penaltyType - "Pre-race DT", "Qualifying Ban", "Race Ban"
 * @param {string} note 
 * @param {string} adminName 
 */
export const markPenaltyServed = async (seasonId, driverId, penaltyType, note, adminName) => {
    try {
        const docId = `${seasonId}_driver-${driverId}`;
        const docRef = doc(db, LICENSE_POINTS_COLLECTION, docId);

        const colRef = collection(db, LICENSE_POINTS_COLLECTION);
        const q = query(colRef, where('seasonId', '==', String(seasonId)), where('driverId', '==', Number(driverId)));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn("No license points record found for driver");
            return;
        }

        const existingData = snapshot.docs[0].data();
        const currentPoints = existingData.totalPoints || 0;

        // Determine new served threshold based on current points or type
        // This assumes the user marks the CURRENT pending penalty as served.
        let newServedThreshold = existingData.highestServedThreshold || 0;

        // Map penalty type to threshold manually or infer?
        // Let's infer based on current points to be safe, but also respect type if possible.
        if (currentPoints >= 7) newServedThreshold = 7;
        else if (currentPoints >= 5) newServedThreshold = 5;
        else if (currentPoints >= 3) newServedThreshold = 3;

        const logEntry = {
            timestamp: new Date().toISOString(),
            points: 0,
            totalAfter: existingData.totalPoints || 0,
            reason: `${penaltyType} marked as SERVED - ${note}`,
            source: 'penalty_served',
            sourceId: null,
            adminName: adminName,
            isPenaltyServed: true
        };

        // Recalculate status with new threshold
        const status = calculateLicenseStatus(currentPoints, newServedThreshold);

        const payload = {
            highestServedThreshold: newServedThreshold,
            currentStatus: status.status,
            statusDescription: status.description,
            pointHistory: [...(existingData.pointHistory || []), logEntry],
            updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, cleanObject(payload), { merge: true });

    } catch (e) {
        console.error("Error marking penalty served:", e);
        throw e;
    }
};

/**
 * Merge license points from multiple source drivers into a target driver.
 * @param {string} seasonId 
 * @param {number} targetDriverId 
 * @param {number} sourceDriverId 
 */
export const mergeDriverLicensePoints = async (seasonId, targetDriverId, sourceDriverId, targetDriverName = null) => {
    try {
        const sourceDocRef = doc(db, LICENSE_POINTS_COLLECTION, `${seasonId}_driver-${sourceDriverId}`);
        const sourceSnap = await getDocs(query(collection(db, LICENSE_POINTS_COLLECTION), where('seasonId', '==', String(seasonId)), where('driverId', '==', Number(sourceDriverId))));

        if (sourceSnap.empty) {
            console.log(`No license points found for source driver ${sourceDriverId}`);
            return; // Nothing to merge
        }

        const sourceData = sourceSnap.docs[0].data();
        const ptsToAdd = sourceData.totalPoints || 0;
        const historyToAdd = sourceData.pointHistory || [];

        // Append Note to history items indicating merge
        const annotatedHistory = historyToAdd.map(h => ({
            ...h,
            reason: `[MERGED] ${h.reason} (Migrated from ID ${sourceDriverId})`
        }));

        // Now update Target
        const targetDocRef = doc(db, LICENSE_POINTS_COLLECTION, `${seasonId}_driver-${targetDriverId}`);
        const targetSnap = await getDocs(query(collection(db, LICENSE_POINTS_COLLECTION), where('seasonId', '==', String(seasonId)), where('driverId', '==', Number(targetDriverId))));

        let targetData = {
            totalPoints: 0,
            pointHistory: [],
            highestServedThreshold: 0
        };

        if (!targetSnap.empty) {
            targetData = targetSnap.docs[0].data();
        }

        const newTotal = (targetData.totalPoints || 0) + ptsToAdd;
        const newHistory = [...(targetData.pointHistory || []), ...annotatedHistory];
        // Re-sort history by timestamp?
        newHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const newThreshold = Math.max(targetData.highestServedThreshold || 0, sourceData.highestServedThreshold || 0);

        const status = calculateLicenseStatus(newTotal, newThreshold);

        const payload = {
            seasonId: String(seasonId),
            driverId: Number(targetDriverId),
            totalPoints: newTotal,
            highestServedThreshold: newThreshold,
            currentStatus: status.status,
            statusDescription: status.description,
            pointHistory: newHistory,
            updatedAt: new Date().toISOString()
        };

        // If we have a name provided, ensure it's written or updated
        if (targetDriverName) {
            payload.driverName = targetDriverName;
        }

        if (targetSnap.empty) {
            // If creating new, we really needed the name. 
            // But we are in db.js. 
            // We will trust that the caller calls this ONLY if they know what they are doing.
            // Or we simply omit name and let next update fix it? 
            // Or we require name in params? 
            // Let's rely on setDoc merging. 
            await setDoc(targetDocRef, payload, { merge: true });
        } else {
            await updateDoc(targetSnap.docs[0].ref, payload);
        }

        // Delete Source
        await deleteDoc(sourceSnap.docs[0].ref);
        console.log(`Merged license points from ${sourceDriverId} to ${targetDriverId}`);

    } catch (e) {
        console.error("Error merging license points:", e);
        throw e;
    }
};


