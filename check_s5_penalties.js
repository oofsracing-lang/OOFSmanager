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
        const docRef = doc(db, "seasons", "s5-sprint");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("=== s5-sprint penalties ===");
            console.log(data.penalties);
            
            console.log("\n=== s5-sprint exclusions ===");
            console.log(data.exclusions);
            
            console.log("\n=== Nick Johnson (ID: 5) in s5-sprint ===");
            const driver = data.drivers.find(d => d.id === 5 || d.name === "Nick Johnson");
            if (driver) {
                console.log(JSON.stringify(driver, null, 2));
            } else {
                console.log("Driver not found in s5-sprint!");
            }
        } else {
            console.log("No such document!");
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
