import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyDtc3vg5ST87frt_oFi-m09EN_gxOM4Rxk',
    authDomain: 'oofs-manager.firebaseapp.com',
    projectId: 'oofs-manager',
    storageBucket: 'oofs-manager.firebasestorage.app',
    messagingSenderId: '86894390970',
    appId: '1:86894390970:web:6a71e5426e5b761f509c83'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const docRef = doc(db, 'seasons', 's3-sprint');
    const snap = await getDoc(docRef);
    const data = snap.data();

    let countR1 = 0;
    data?.drivers.forEach(d => {
        if (d.raceResults.find(r => String(r.raceId) === "1")) countR1++;
    });
    console.log('Driver results for race 1:', countR1);
    process.exit(0);
}
run();
