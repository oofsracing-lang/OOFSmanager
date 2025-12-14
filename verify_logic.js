import { processRaceResults, formatTime } from './src/utils/raceLogic.js';

// Mock Data
const drivers = [
    { id: 1, name: 'Driver A', totalTime: '60:00.000', class: 'LMGT3' },
    { id: 2, name: 'Driver B', totalTime: '60:02.000', class: 'LMGT3' },
    { id: 3, name: 'Driver C', totalTime: '60:01.000', class: 'LMGT3' }, // Should be P2 raw, but let's see penalties
    { id: 4, name: 'Driver D', totalTime: 'DNF', class: 'LMGT3' }
];

const penalties = [
    { driverId: 1, seconds: 5 } // Driver A gets +5s -> 60:05.000
];

console.log("--- Running Race Logic Verification ---");

const results = processRaceResults(drivers, penalties);

results.forEach(r => {
    console.log(`Pos: ${r.position} | ${r.name} | Time: ${formatTime(r.finalTimeSeconds)} | Points: ${r.points}`);
});

// Assertions
const p1 = results.find(r => r.position === 1);
const p2 = results.find(r => r.position === 2);
const p3 = results.find(r => r.position === 3);

if (p1.name === 'Driver C' && p2.name === 'Driver B' && p3.name === 'Driver A') {
    console.log("✅ Verification PASSED: Penalties correctly re-ordered positions.");
} else {
    console.error("❌ Verification FAILED: Unexpected order.");
}
