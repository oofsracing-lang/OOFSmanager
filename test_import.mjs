import fs from 'fs';

const mockParsedResults = [
    { name: 'Dave Carter', laps: 15, position: 1, carClass: 'LMGT3' }
];

const seasonData = JSON.parse(fs.readFileSync('./src/data/seasons/season3_sprint.json', 'utf8'));
const newData = JSON.parse(JSON.stringify(seasonData));
const raceIdToUse = 8;
const existingRaceIndex = -1;

newData.races.push({
    id: raceIdToUse,
    name: 'Round 8',
    track: 'Spa',
    date: '2026-03-19',
    status: 'Completed',
    dramaLog: []
});

mockParsedResults.forEach(pResult => {
    const pResultName = (pResult.name || '').trim();
    let determinedClass = 'LMGT3';
    let driver = newData.drivers.find(d => (d.name || '').trim().toLowerCase() === pResultName.toLowerCase());

    if (!driver) {
        const newId = newData.drivers.length > 0 ? Math.max(...newData.drivers.map(d => d.id)) + 1 : 1;
        driver = {
            id: newId,
            name: pResultName || 'Unknown Driver',
            team: pResult.team || '',
            car: pResult.car || '',
            number: pResult.carNumber || '',
            class: determinedClass,
            raceResults: []
        };
        newData.drivers.push(driver);
    }

    const lapsCount = Number(pResult.laps) || 0;
    const raceResult = {
        raceId: Number(raceIdToUse),
        position: Number(pResult.position) || 0,
        classPosition: Number(pResult.classPosition) || 0,
        laps: lapsCount,
        finishTime: 1234,
        bestLap: pResult.bestLap || null,
        status: pResult.status || 'Finished',
        attendance: lapsCount > 0 ? 'Raced' : 'DNS',
        drivenClass: determinedClass,
        car: pResult.car || '',
        purpleSectors: Number(pResult.purpleSectors) || 0,
        incidents: Number(pResult.incidents) || 0,
        penaltyCount: Number(pResult.penalties) || 0,
        startPosition: Number(pResult.startPosition) || 0
    };

    const existingResultIndex = driver.raceResults.findIndex(r => String(r.raceId) === String(raceIdToUse));
    if (existingResultIndex !== -1) {
        const existing = driver.raceResults[existingResultIndex];
        driver.raceResults[existingResultIndex] = Object.assign({}, existing, raceResult);
    } else {
        driver.raceResults.push(Object.assign({}, raceResult, { points: 0, ballastChange: 0 }));
    }
});

const dc = newData.drivers.find(d => d.name === 'Dave Carter');
console.log('Driver results count:', dc.raceResults.length);
console.log('Round 8 result:', dc.raceResults.find(r => r.raceId === 8));
