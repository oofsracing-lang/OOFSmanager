import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from 'fs';

// --- CONFIG ---
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
        console.log("Pushing s4-multi...");
        const multiData = JSON.parse(fs.readFileSync('./src/data/seasons/season4_multiclass.json', 'utf8'));
        await setDoc(doc(db, 'seasons', 's4-multi'), multiData);
        console.log("Pushed s4-multi successfully.");

        console.log("Pushing s4-sprint...");
        const sprintData = JSON.parse(fs.readFileSync('./src/data/seasons/season4_sprint.json', 'utf8'));
        await setDoc(doc(db, 'seasons', 's4-sprint'), sprintData);
        console.log("Pushed s4-sprint successfully.");
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
