import { XMLParser } from 'fast-xml-parser';

export const parseRaceXml = (xmlContent) => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(xmlContent);

    if (!parsed.rFactorXML || !parsed.rFactorXML.RaceResults) {
        throw new Error("Invalid XML structure: Missing rFactorXML or RaceResults");
    }

    const raceResults = parsed.rFactorXML.RaceResults;

    // Extract Race Info
    const trackName = raceResults.TrackVenue;
    const raceDate = raceResults.DateTime; // Timestamp
    const raceTimeString = raceResults.TimeString;

    // Extract Drivers
    // Check if Race or Driver info exists directly under RaceResults or nested
    // Based on the provided XML sample, <Driver> tags seem to be at the end of <RaceResults>
    // but the sample showed <Race>...<Driver>... which implies drivers might be inside <Race>?
    // Let's re-verify the structure from the sample provided in the prompt history.
    // The sample had:
    // <RaceResults>
    //   ...
    //   <Race>...</Race>
    //   <Driver>...</Driver>
    //   <Driver>...</Driver>
    // </RaceResults>

    let driversData = raceResults.Driver;
    if (!driversData && raceResults.Race) {
        // Driver might be inside Race
        driversData = raceResults.Race.Driver;
    }

    if (!driversData) {
        return { error: "No driver data found" };
    }

    if (!Array.isArray(driversData)) {
        driversData = [driversData];
    }

    // Extract Stream Data for "Cool Stats" and "Drama"
    const stream = raceResults.Race && raceResults.Race.Stream ? raceResults.Race.Stream : {};

    // Helper to ensure array
    const toArray = (item) => Array.isArray(item) ? item : (item ? [item] : []);

    const sectors = toArray(stream.Sector);
    const incidents = toArray(stream.Incident);
    const trackLimits = toArray(stream.TrackLimits);

    // Aggregators
    const driverStats = {}; // { DriverName: { purpleSectors: 0, incidents: 0, penalties: 0 } }
    const dramaLog = []; // Chronological list of events for AI

    // 1. Purple Sectors Logic (Revised: Last Holder Wins)
    // The XML Stream logs a <Sector> event every time a NEW overall best sector is set.
    // Therefore, the LAST driver to appear in the stream for a given Sector + Class is the final record holder.

    // Structure: purpleHolders = { "LMP2": {1: "Name", 2: "Name", 3: "Name"}, "LMGT3": ... }
    const purpleHolders = {
        "Hypercar": { 1: null, 2: null, 3: null },
        "LMP2": { 1: null, 2: null, 3: null },
        "LMP3": { 1: null, 2: null, 3: null },
        "LMGT3": { 1: null, 2: null, 3: null }
    };

    // Helper to normalize class from XML strings like "LMP2_ELMS", "GT3", etc.
    const normalizeClass = (rawClass) => {
        if (!rawClass) return "LMGT3";
        const upper = rawClass.toUpperCase();
        if (upper.includes('HYPERCAR') || upper.includes('HYPER') || upper.includes('LMH') || upper.includes('LMDH')) return 'Hypercar';
        if (upper.includes('LMP2') || upper.includes('P2') || upper.includes('ORECA')) return "LMP2";
        if (upper.includes('LMP3') || upper.includes('P3')) return "LMP3";
        return "LMGT3";
    };


    sectors.forEach(s => {
        const driver = s['@_Driver'];
        const sectorNum = parseInt(s['@_Sector']); // 1, 2, or 3
        const rawClass = s['@_Class']; // "GT3", "LMP2_ELMS"

        if (driver && sectorNum >= 1 && sectorNum <= 3 && rawClass) {
            const cls = normalizeClass(rawClass);

            // Update the holder to this new driver
            purpleHolders[cls][sectorNum] = driver;

            // Log drama
            dramaLog.push({
                time: parseFloat(s['@_et']),
                type: 'SECTOR_RECORD',
                message: `${driver} (${cls}) set new purple sector ${sectorNum}`
            });
        }
    });

    // Now award the stats to the final holders
    Object.keys(purpleHolders).forEach(cls => {
        [1, 2, 3].forEach(sectNum => {
            const holder = purpleHolders[cls][sectNum];
            if (holder) {
                if (!driverStats[holder]) driverStats[holder] = { purpleSectors: 0, incidents: 0, penalties: 0 };
                driverStats[holder].purpleSectors++;
            }
        });
    });

    // 2. Process Incidents
    incidents.forEach(inc => {
        const text = inc['#text'] || '';
        if (!text) return;

        dramaLog.push({
            type: 'INCIDENT',
            time: parseFloat(inc['@_et']),
            message: text
        });

        // Parse Name for stats
        // Format: "Name(CarNum) reported..."
        const match = text.match(/^(.+?)\(\d+\)/);
        if (match) {
            const name = match[1];
            if (!driverStats[name]) driverStats[name] = { purpleSectors: 0, incidents: 0, penalties: 0 };
            driverStats[name].incidents++;
        }
    });

    // 3. Process Track Limits (Penalties)
    trackLimits.forEach(tl => {
        const driver = tl['@_Driver'];
        const text = tl['#text'] || '';

        // Only care if it's NOT "No Further Action"
        if (text !== "No Further Action") {
            dramaLog.push({
                type: 'PENALTY',
                time: parseFloat(tl['@_et']),
                message: `${driver}: ${text}`
            });

            if (driver) {
                if (!driverStats[driver]) driverStats[driver] = { purpleSectors: 0, incidents: 0, penalties: 0 };
                driverStats[driver].penalties++;
            }
        }
    });

    // Sort Drama Log by time
    dramaLog.sort((a, b) => a.time - b.time);

    const results = driversData.map(d => {
        const stats = driverStats[d.Name] || { purpleSectors: 0, incidents: 0, penalties: 0 };
        return {
            name: d.Name,
            team: d.TeamName,
            car: d.CarType,
            carNumber: d.CarNumber,
            carClass: d.CarClass, // e.g., "GT3" or "LMP2_ELMS"
            position: parseInt(d.Position),
            classPosition: parseInt(d.ClassPosition),
            startPosition: parseInt(d.ClassGridPos),
            laps: parseInt(d.Laps),
            bestLap: d.BestLapTime,
            totalTime: d.FinishTime || d.Time || d['@_FinishTime'] || d['@_Time'],
            finishTime: d.FinishTime || d.Time || d['@_FinishTime'] || d['@_Time'],
            status: d.FinishStatus,
            isPlayer: d.isPlayer === 1 || d.isPlayer === "1",
            // New Stats
            purpleSectors: stats.purpleSectors,
            incidents: stats.incidents,
            penalties: stats.penalties
        };
    });

    return {
        trackName,
        raceDate,
        raceTimeString,
        results,
        dramaLog // Expose for AI Sportscaster
    };
};

export const extractContactsFromXml = (xmlContent, raceId, seasonId) => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(xmlContent);

    if (!parsed.rFactorXML || !parsed.rFactorXML.RaceResults) {
        return [];
    }

    const stream = parsed.rFactorXML.RaceResults.Race?.Stream || {};
    const toArray = (item) => Array.isArray(item) ? item : (item ? [item] : []);
    const incidents = toArray(stream.Incident);

    const rawContacts = [];
    incidents.forEach(inc => {
        const et = parseFloat(inc['@_et']);
        const text = inc['#text'] || '';
        const m = text.match(/^(.+?)\((\d+)\)\s+reported contact\s+\(([\d.]+)\)\s+with another vehicle\s+(.+?)\((\d+)\)/i);
        if (m && !isNaN(et)) {
            rawContacts.push({
                et,
                driver1: m[1].trim(),
                car1: m[2].trim(),
                force: parseFloat(m[3]),
                driver2: m[4].trim(),
                car2: m[5].trim()
            });
        }
    });

    const paired = [];
    const processed = new Set();

    for (let i = 0; i < rawContacts.length; i++) {
        if (processed.has(i)) continue;
        const c1 = rawContacts[i];
        let matchIdx = -1;

        for (let j = i + 1; j < rawContacts.length; j++) {
            if (processed.has(j)) continue;
            const c2 = rawContacts[j];
            if (Math.abs(c2.et - c1.et) <= 1.5) {
                const isSamePair = (c1.driver1 === c2.driver2 && c1.driver2 === c2.driver1) ||
                                   (c1.driver1 === c2.driver1 && c1.driver2 === c2.driver2);
                if (isSamePair) {
                    matchIdx = j;
                    break;
                }
            }
        }

        const mins = Math.floor(c1.et / 60);
        const secs = Math.floor(c1.et % 60).toString().padStart(2, '0');
        const formattedTime = `${mins}:${secs} elapsed`;

        const maxForce = matchIdx !== -1 ? Math.max(c1.force, rawContacts[matchIdx].force) : c1.force;
        const driver2Name = matchIdx !== -1 ? rawContacts[matchIdx].driver1 : c1.driver2;
        const car2Num = matchIdx !== -1 ? rawContacts[matchIdx].car1 : c1.car2;

        paired.push({
            seasonId: String(seasonId),
            raceId: raceId,
            carNumbers: `#${c1.car1}, #${car2Num}`,
            timestamp: formattedTime,
            description: `Auto-detected contact between ${c1.driver1} (#${c1.car1}) and ${driver2Name} (#${car2Num}) [Impact Force: ${maxForce.toFixed(1)}]`,
            driver1: c1.driver1,
            car1: c1.car1,
            driver2: driver2Name,
            car2: car2Num,
            impactForce: maxForce,
            status: 'Pending',
            isFinal: false,
            isAuto: true
        });

        processed.add(i);
        if (matchIdx !== -1) processed.add(matchIdx);
    }

    return paired;
};

