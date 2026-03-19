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
        if (!docSnap.exists()) {
            console.log("seasons/s3-sprint not found");
        } else {
            // Look for the last time it was modified, maybe it has an updatedAt field?
            // Since it's unstructured, we just check races.length
            const data = docSnap.data();
            const lastRace = data.races[data.races.length - 1];
            console.log("Last race in seasons/s3-sprint:", lastRace?.name, "track:", lastRace?.track, "status:", lastRace?.status);
            console.log("Season config classes", data.config?.classes);
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
