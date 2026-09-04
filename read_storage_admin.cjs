const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin with Default Credentials (resolves via Firebase CLI)
admin.initializeApp({
    storageBucket: "oofs-manager.firebasestorage.app" // or oofs-manager.appspot.com if needed
});

const bucket = admin.storage().bucket();

async function run() {
    try {
        console.log("Listing files in season_s5-sprint/uploads/...");
        const [files] = await bucket.getFiles({ prefix: "season_s5-sprint/uploads/" });
        console.log(`Found ${files.length} files.`);
        
        for (const file of files) {
            console.log(`File: ${file.name}`);
            
            // We are looking for Race 3 (Round 3) in Season 5 Sprint.
            // Check if the filename contains "race3", "r3", "round3", or check all of them to find the right one
            // Let's download and inspect if it's an XML file
            if (file.name.endsWith(".xml")) {
                const localPath = path.join(__dirname, path.basename(file.name));
                console.log(`Downloading ${file.name} to ${localPath}...`);
                await file.download({ destination: localPath });
                console.log("Downloaded successfully.");
                
                // Let's parse it and see if it's Race 3
                const xmlContent = fs.readFileSync(localPath, "utf-8");
                if (xmlContent.includes("<TrackVenue>") || xmlContent.includes("RaceResults")) {
                    // Quick check if it's Round 3 or Race 3
                    const trackMatch = xmlContent.match(/<TrackVenue>(.*?)<\/TrackVenue>/);
                    const dateTimeMatch = xmlContent.match(/<DateTime>(.*?)<\/DateTime>/);
                    const eventMatch = xmlContent.match(/<Event>(.*?)<\/Event>/);
                    
                    console.log(`  Track: ${trackMatch ? trackMatch[1] : "Unknown"}`);
                    console.log(`  Date/Time: ${dateTimeMatch ? dateTimeMatch[1] : "Unknown"}`);
                    console.log(`  Event: ${eventMatch ? eventMatch[1] : "Unknown"}`);
                    
                    // Let's search for "Nick Johnson" inside the XML
                    if (xmlContent.includes("Nick Johnson")) {
                        console.log("  -> Nick Johnson is in this file!");
                        
                        // Let's parse incidents and track limits (warnings) for Nick Johnson in this file
                        // We can run a quick regex search or use fast-xml-parser if we want to print specifics
                        // Let's write a parser helper
                        try {
                            const { XMLParser } = require("fast-xml-parser");
                            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
                            const parsed = parser.parse(xmlContent);
                            const raceResults = parsed.rFactorXML.RaceResults;
                            
                            // Let's see if this is Round 3. We know Round 3 is Spa or another track.
                            // Let's check which round it is.
                            console.log(`  Session: ${raceResults.Session}`);
                            
                            // Let's extract drivers
                            let drivers = raceResults.Driver || (raceResults.Race && raceResults.Race.Driver);
                            if (drivers) {
                                if (!Array.isArray(drivers)) drivers = [drivers];
                                const nick = drivers.find(d => d.Name === "Nick Johnson");
                                if (nick) {
                                    console.log(`  Found Nick Johnson results:`);
                                    console.log(`    Position: ${nick.Position}, ClassPosition: ${nick.ClassPosition}`);
                                    console.log(`    Grid: ${nick.GridPos}, ClassGridPos: ${nick.ClassGridPos}`);
                                    console.log(`    Laps: ${nick.Laps}, FinishTime: ${nick.FinishTime || nick.Time}`);
                                    console.log(`    Status: ${nick.FinishStatus}`);
                                }
                            }
                            
                            // Let's search incidents in Stream
                            const stream = (raceResults.Race && raceResults.Race.Stream) || {};
                            const incidents = Array.isArray(stream.Incident) ? stream.Incident : (stream.Incident ? [stream.Incident] : []);
                            console.log("  Incidents in this file involving Nick Johnson:");
                            incidents.forEach(inc => {
                                const text = inc["#text"] || "";
                                if (text.includes("Nick Johnson")) {
                                    console.log(`    [Incident] at ${inc["@_et"]}s: ${text}`);
                                }
                            });
                            
                            // Warnings / Penalties in Stream (TrackLimits)
                            const trackLimits = Array.isArray(stream.TrackLimits) ? stream.TrackLimits : (stream.TrackLimits ? [stream.TrackLimits] : []);
                            console.log("  Warnings/Penalties in this file for Nick Johnson:");
                            trackLimits.forEach(tl => {
                                const driver = tl["@_Driver"];
                                if (driver === "Nick Johnson") {
                                    console.log(`    [Warning] at ${tl["@_et"]}s: ${tl["#text"]}`);
                                }
                            });
                            
                        } catch (parseErr) {
                            console.log("  Failed to parse XML using fast-xml-parser:", parseErr.message);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error running script:", err);
    }
    process.exit(0);
}
run();
