const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'data', 'seasons');

// 1. Season 4 Multiclass
const multiPath = path.join(srcDir, 'season4_multiclass.json');
const multiData = JSON.parse(fs.readFileSync(multiPath, 'utf8'));

// Fix strings
multiData.season = "Season 4 - Multiclass";
multiData.config.seriesName = "Season 4 Multiclass";

// Remove schedule / Set to TBD
multiData.races = [
    { id: 1, name: "Round 1", track: "TBD", date: "TBD", status: "Scheduled" }
];

fs.writeFileSync(multiPath, JSON.stringify(multiData, null, 2));

// 2. Season 4 Sprint
const sprintPath = path.join(srcDir, 'season4_sprint.json');
const sprintData = JSON.parse(fs.readFileSync(sprintPath, 'utf8'));

// Remove roster
sprintData.config.driverRoster = [];
sprintData.drivers = [];
sprintData.races = [
    { id: 1, name: "Round 1", track: "TBD", date: "TBD", status: "Scheduled" }
];

fs.writeFileSync(sprintPath, JSON.stringify(sprintData, null, 2));

console.log("Tweaked S4 JSONs.");
