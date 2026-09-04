import { initializeApp } from "firebase/app";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDtc3vg5ST87frt_oFi-m09EN_gxOM4Rxk",
    authDomain: "oofs-manager.firebaseapp.com",
    projectId: "oofs-manager",
    storageBucket: "oofs-manager.firebasestorage.app",
    messagingSenderId: "86894390970",
    appId: "1:86894390970:web:6a71e5426e5b761f509c83"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function run() {
    try {
        const listRef = ref(storage, "season_s5-sprint/uploads/");
        const res = await listAll(listRef);
        console.log("=== Files in s5-sprint Storage ===");
        for (const itemRef of res.items) {
            console.log(`File Name: ${itemRef.name}`);
            try {
                const url = await getDownloadURL(itemRef);
                console.log(`  URL: ${url}`);
            } catch (err) {
                console.error(`  Could not get URL for ${itemRef.name}:`, err.message);
            }
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
