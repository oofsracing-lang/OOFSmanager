import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function run() {
    try {
        const colRef = collection(db, "licensePoints");
        const snapshot = await getDocs(colRef);
        console.log("=== SUMMARY OF ALL LICENSE POINTS DOCUMENTS ===");
        snapshot.forEach(doc => {
            const data = doc.data();
            const driverName = data.driverName || "Unknown";
            const seasonId = data.seasonId || "Unknown";
            const totalPoints = data.totalPoints !== undefined ? data.totalPoints : "N/A";
            
            // Print details for all drivers, but highlight Nick Johnson
            if (driverName.toLowerCase().includes("nick") || driverName.toLowerCase().includes("johnson")) {
                console.log(`\n*** MATCH: ${driverName} in ${seasonId} ***`);
                console.log(`Document ID: ${doc.id}`);
                console.log(`Driver ID: ${data.driverId}`);
                console.log(`Total Points: ${totalPoints}`);
                console.log(`Status: ${data.currentStatus} (${data.statusDescription})`);
                console.log("Point History:");
                const history = data.pointHistory || [];
                history.forEach((h, idx) => {
                    console.log(`  [${idx+1}] Points: ${h.points}, Reason: "${h.reason}", Admin: ${h.adminName}, Date: ${h.timestamp}`);
                });
            } else {
                // Just log a brief one-liner for others to verify if we missed anything
                console.log(`Driver: ${driverName} | Season: ${seasonId} | Points: ${totalPoints} | ID: ${doc.id}`);
            }
        });
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
