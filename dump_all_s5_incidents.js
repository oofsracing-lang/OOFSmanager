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
        console.log("=== All s5-sprint Incidents ===");
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Document ID: ${doc.id}`);
            console.log(JSON.stringify(data, null, 2));
            console.log("-----------------------------------------");
        });
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
