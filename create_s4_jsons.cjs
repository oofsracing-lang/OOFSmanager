const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'data', 'seasons');

// Season 4 Multiclass (Copy from S3 Multiclass)
const s3MultiPath = path.join(srcDir, 'season3_multiclass.json');
const s3MultiData = JSON.parse(fs.readFileSync(s3MultiPath, 'utf8'));

s3MultiData.season = "Season 4 - Multiclass";
s3MultiData.id = "4";
s3MultiData.config.seriesName = "Season 4 Multiclass";

// Update class names
s3MultiData.config.classes = s3MultiData.config.classes.map(c => c === 'LMP2-UR' ? 'Hypercar' : c);

// Update ballast rules
if (s3MultiData.config.rules.ballastRules && s3MultiData.config.rules.ballastRules['LMP2-UR']) {
    s3MultiData.config.rules.ballastRules['Hypercar'] = s3MultiData.config.rules.ballastRules['LMP2-UR'];
    delete s3MultiData.config.rules.ballastRules['LMP2-UR'];
}

// Add our configurable penalty type
s3MultiData.config.rules.carSwitchPenaltyType = "zero_best_finish";

// Update roster
s3MultiData.config.driverRoster = s3MultiData.config.driverRoster.map(d => {
    if (d.class === 'LMP2-UR') d.class = 'Hypercar';
    return d;
});

// Update rounds (if needed, keep same track config for now, just change names/dates so they are empty)
// Actually we can leave rounds as is to be edited later via UI, or we can clear drivers and races list entirely.
s3MultiData.currentRound = 0;
s3MultiData.totalRounds = 8;
s3MultiData.drivers = [];
s3MultiData.races = [
    { id: 1, name: "Round 1", track: "TBD", date: "2026-04-10", status: "Scheduled" } // keep 1 so no crash
];
s3MultiData.penalties = {};
s3MultiData.manualPositions = {};
s3MultiData.exclusions = {};
s3MultiData.qualifyingSettings = {
    'Hypercar': { consecutiveLaps: 5, maxAvgTime: 120.0 },
    'LMGT3': { consecutiveLaps: 5, maxAvgTime: 140.0 }
};

fs.writeFileSync(path.join(srcDir, 'season4_multiclass.json'), JSON.stringify(s3MultiData, null, 2));


// Season 4 Sprint (Copy from S3 Sprint)
const s3SprintPath = path.join(srcDir, 'season3_sprint.json');
const s3SprintData = JSON.parse(fs.readFileSync(s3SprintPath, 'utf8'));

s3SprintData.season = "Season 4 - Sprint Series";
s3SprintData.id = "s4-sprint";
s3SprintData.config.seriesName = "Season 4 Sprint Series";
s3SprintData.currentRound = 0;
s3SprintData.totalRounds = 8;
s3SprintData.drivers = [];
s3SprintData.races = [
    { id: 1, name: "Round 1", track: "TBD", date: "2026-04-10", status: "Scheduled" }
];
s3SprintData.penalties = {};
s3SprintData.manualPositions = {};
s3SprintData.exclusions = {};

// It stays as-is (e.g., zero all previous finish) so we don't set carSwitchPenaltyType or we set it to 'zero_all_previous'
// Let's set it explicitly so logic is clearer
s3SprintData.config.rules.carSwitchPenaltyType = "zero_all_previous"; // S3 had it implicitly

fs.writeFileSync(path.join(srcDir, 'season4_sprint.json'), JSON.stringify(s3SprintData, null, 2));

console.log("Done generating S4 JSONs.");
