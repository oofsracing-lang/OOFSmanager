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
    const docRef = doc(db, 'seasons', '4');
    const snap = await getDoc(docRef);
    const data = snap.data();
    console.log('Season 4 Name:', data?.season);
    console.log('Races:');
    data?.races.forEach(r => console.log(r.id, r.name, r.track));

    let count = 0;
    data?.drivers.forEach(d => {
        if (d.raceResults.find(r => r.raceId == 8)) count++;
    });
    console.log('Driver results for race 8 in Season 4:', count);
    process.exit(0);
}
run();
