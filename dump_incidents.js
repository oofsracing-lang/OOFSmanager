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
        const colRef = collection(db, "incidents");
        const snapshot = await getDocs(colRef);
        console.log("=== Incidents in DB ===");
        snapshot.forEach(doc => {
            const data = doc.data();
            const dataStr = JSON.stringify(data);
            if (dataStr.toLowerCase().includes("nick") || dataStr.toLowerCase().includes("johnson")) {
                console.log(`Document ID: ${doc.id}`);
                console.log(JSON.stringify(data, null, 2));
            }
        });
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
