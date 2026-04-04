import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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
        const docRef = doc(db, "seasons", "s3-sprint");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            console.log("Document s3-sprint not found!");
            process.exit(1);
        }

        const data = docSnap.data();
        let driversModified = 0;

        // 1. Wipe Race 3 from drivers
        data.drivers.forEach(d => {
            const initialLen = d.raceResults.length;
            d.raceResults = d.raceResults.filter(r => String(r.raceId) !== "3");
            if (d.raceResults.length !== initialLen) {
                driversModified++;
            }
        });

        // 2. Set Race 3 to Scheduled
        const race3 = data.races.find(r => String(r.id) === "3");
        if (race3) {
            race3.status = "Scheduled";
            race3.dramaLog = [];
        }

        // 3. Current round adjustment (optional, but good)
        // Set it to nearest completed race ID, or 0
        const completedVals = data.races.filter(r => r.status === "Completed").map(r => r.id);
        data.currentRound = completedVals.length > 0 ? Math.max(...completedVals) : 0;

        // 4. Wipe exclusion 3-40
        if (data.exclusions && data.exclusions["3-40"]) {
            console.log("Removing incorrect exclusion for 3-40...");
            delete data.exclusions["3-40"];
        }

        // 5. Upload back
        console.log(`Writing back to Firestore... (Modified ${driversModified} drivers)`);
        await setDoc(docRef, data);
        console.log("Done! Round 3 completely wiped. Penalties preserved.");

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
