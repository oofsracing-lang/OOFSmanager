import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
            console.log("Races:");
            data.races.forEach(r => console.log(r.id, r.name, r.track, r.status));
            const r8 = data.races.find(r => String(r.id) === "8");
            if (r8) {
                console.log("Round 8 exists:", r8);
            } else {
                console.log("Round 8 not found in races array.");
            }

            let count = 0;
            data.drivers.forEach(d => {
                const res = d.raceResults.find(r => String(r.raceId) === "8");
                if (res) count++;
            });
            console.log("Found " + count + " driver results for raceId 8");
            console.log("Document size:", JSON.stringify(data).length, "bytes");
        } else {
            console.log("No such document for s3-sprint!");
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
