import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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
        const colRef = collection(db, "incidents");
        const q = query(colRef, where("seasonId", "==", "s5-sprint"));
        const snapshot = await getDocs(q);
        console.log("=== s5-sprint Incidents with penalties or Nick Johnson ===");
        snapshot.forEach(doc => {
            const data = doc.data();
            const driver1 = data.driver1 || "";
            const driver2 = data.driver2 || "";
            const desc = data.description || "";
            const pId = data.penalizedDriverId;
            const timePen = data.timePenalty;
            
            const isNick = driver1.includes("Nick Johnson") || driver2.includes("Nick Johnson") || desc.includes("Nick Johnson") || pId === 5 || pId === "5";
            const hasPenalty = timePen !== undefined && timePen > 0;
            
            if (isNick || hasPenalty) {
                console.log(`Document ID: ${doc.id}`);
                console.log(`  Description: ${desc}`);
                console.log(`  Driver 1: ${driver1} | Driver 2: ${driver2}`);
                console.log(`  Race ID: ${data.raceId}`);
                console.log(`  Status: ${data.status} | Final: ${data.isFinal}`);
                console.log(`  Decision: ${data.decision}`);
                console.log(`  Time Penalty: ${timePen}`);
                console.log(`  Penalized Driver ID: ${pId}`);
                console.log(`  Steward Notes: ${data.stewardNotes}`);
                console.log("--------------------------------------------------");
            }
        });
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
