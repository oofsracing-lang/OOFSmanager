import fs from 'fs';

try {
    const data = JSON.parse(fs.readFileSync('season2_dump.json', 'utf8'));

    console.log("Season:", data.season);

    // Find Daniel J.
    const daniel = data.drivers.find(d => d.name.includes("Daniel J")); // Or whatever his name is
    // Actually, image said "Daniel J."

    // Let's filter key drivers
    const targets = data.drivers.filter(d =>
        (d.name.includes("Daniel") || d.name.includes("James")) &&
        (d.class && d.class.includes('P2'))
    );

    console.log(`Targets Found: ${targets.length}`);

    targets.forEach(d => {
        const r8 = d.raceResults.find(r => r.raceId === 8);
        console.log(`\nDriver: ${d.name}`);
        console.log(`  Class: "${d.class}"`);
        if (r8) {
            console.log(`  Race 8 Result:`);
            console.log(`    drivenClass: "${r8.drivenClass}"`);
            console.log(`    points: ${r8.points}`);
            console.log(`    ballastChange: ${r8.ballastChange}`);
            console.log(`    laps: ${r8.laps}`);
            console.log(`    finishTime: ${r8.finishTime}`);
            console.log(`    status: "${r8.status}"`);
        } else {
            console.log(`  No Race 8 Result`);
        }
    });

} catch (e) {
    console.error(e);
}
