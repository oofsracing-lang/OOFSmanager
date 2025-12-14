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

    const results = driversData.map(d => {
        // Extract relevant fields
        // Note: XML tags are case-sensitive.
        return {
            name: d.Name,
            team: d.TeamName,
            car: d.CarType,
            carClass: d.CarClass, // e.g., "GT3" or "LMP2_ELMS"
            position: parseInt(d.Position),
            classPosition: parseInt(d.ClassPosition),
            laps: parseInt(d.Laps),
            bestLap: d.BestLapTime,
            totalTime: d.FinishTime,
            status: d.FinishStatus,
            isPlayer: d.isPlayer === 1 || d.isPlayer === "1"
        };
    });

    return {
        trackName,
        raceDate,
        raceTimeString,
        results
    };
};
