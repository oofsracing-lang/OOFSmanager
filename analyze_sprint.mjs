import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

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
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Analyze Round 3 Results
            let r3Count = 0;
            data.drivers.forEach(d => {
                if (d.raceResults.some(r => String(r.raceId) === "3")) {
                    r3Count++;
                }
            });
            console.log(`Found ${r3Count} driver results for Round 3.`);

            // Analyze Penalties
            const penalties = data.penalties || {};
            const r3Penalties = Object.keys(penalties).filter(k => k.startsWith("3-"));
            console.log(`Found ${r3Penalties.length} penalties for Round 3:`, r3Penalties.map(k => `${k}: ${penalties[k]}`));

            // Exclusions
            const exclusions = data.exclusions || {};
            const r3Exclusions = Object.keys(exclusions).filter(k => k.startsWith("3-"));
            console.log(`Found ${r3Exclusions.length} exclusions for Round 3:`, r3Exclusions.map(k => `${k}: ${exclusions[k]}`));

            // Manual Positions
            const manPos = data.manualPositions || {};
            const r3ManPos = Object.keys(manPos).filter(k => k.startsWith("3-"));
            console.log(`Found ${r3ManPos.length} manual positions for Round 3:`, r3ManPos.map(k => `${k}: ${manPos[k]}`));
            
            fs.writeFileSync("s3-sprint-dump.json", JSON.stringify(data, null, 2));
            console.log("Dumped data to s3-sprint-dump.json");
        } else {
            console.log("No such document!");
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
