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
        console.log("=== License Points in DB ===");
        snapshot.forEach(doc => {
            const data = doc.data();
            // Let's filter for s3-sprint or "3" or similar
            if (data.seasonId && (data.seasonId.includes("sprint") || data.seasonId === "3")) {
                console.log(JSON.stringify({ id: doc.id, ...data }, null, 2));
            }
        });
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
