const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'data', 'seasons');

// 1. Season 5 Multiclass (Copy from S4 Multiclass)
const s4MultiPath = path.join(srcDir, 'season4_multiclass.json');
const s5MultiData = JSON.parse(fs.readFileSync(s4MultiPath, 'utf8'));

s5MultiData.season = "Season 5 - Multiclass";
s5MultiData.id = "s5-multi";
s5MultiData.config.seriesName = "Season 5 Multiclass";
s5MultiData.currentRound = 0;
s5MultiData.totalRounds = 6;
s5MultiData.drivers = [];
s5MultiData.penalties = {};
s5MultiData.manualPositions = {};
s5MultiData.exclusions = {};

// Verify class names & ballast rules (Hypercar + LMGT3)
s5MultiData.config.classes = ["Hypercar", "LMGT3"];
s5MultiData.config.rules.ballastType = "custom_class";
s5MultiData.config.rules.ballastRules = {
  "LMGT3": {
    "1": 15,
    "2": 10,
    "3": 5,
    "4": 0,
    "5": -5,
    "6": -10,
    "default": -15,
    "max": 45
  },
  "Hypercar": {
    "1": 10,
    "2": 5,
    "3": 2,
    "4": 0,
    "5": -2,
    "6": -5,
    "default": -10,
    "max": 30
  }
};
s5MultiData.config.rules.carSwitchPenaltyType = "zero_best_finish";
s5MultiData.config.driverRoster = []; // empty roster initially

s5MultiData.races = [
  { id: 1, name: "Round 1", track: "Algarve International Circuit", date: "7/9/26", status: "Scheduled" },
  { id: 2, name: "Round 2", track: "Sebring International Raceway", date: "7/16/26", status: "Scheduled" },
  { id: 3, name: "Round 3", track: "Autódromo José Carlos Pace", date: "7/23/26", status: "Scheduled" },
  { id: 4, name: "Round 4", track: "Lusail International Circuit", date: "7/30/26", status: "Scheduled" },
  { id: 5, name: "Round 5", track: "Circuit of the Americas", date: "8/6/26", status: "Scheduled" },
  { id: 6, name: "Round 6", track: "Circuit de Spa-Francorchamps", date: "8/13/26", status: "Scheduled" }
];

s5MultiData.qualifyingSettings = {
  "Hypercar": { consecutiveLaps: 5, maxAvgTime: 120 },
  "LMGT3": { consecutiveLaps: 5, maxAvgTime: 140 }
};

fs.writeFileSync(path.join(srcDir, 'season5_multiclass.json'), JSON.stringify(s5MultiData, null, 2));


// 2. Season 5 Sprint (Copy from S4 Sprint)
const s4SprintPath = path.join(srcDir, 'season4_sprint.json');
const s5SprintData = JSON.parse(fs.readFileSync(s4SprintPath, 'utf8'));

s5SprintData.season = "Season 5 - Sprint Series";
s5SprintData.id = "s5-sprint";
s5SprintData.config.seriesName = "Season 5 Sprint Series";
s5SprintData.currentRound = 0;
s5SprintData.totalRounds = 6;
s5SprintData.drivers = [];
s5SprintData.penalties = {};
s5SprintData.manualPositions = {};
s5SprintData.exclusions = {};

// Update to Multiclass (LMP3 + LMGT3) and Success Ballast
s5SprintData.config.classes = ["LMP3", "LMGT3"];
s5SprintData.config.rules.ballastType = "custom_class";
s5SprintData.config.rules.ballastRules = {
  "LMGT3": {
    "1": 15,
    "2": 10,
    "3": 5,
    "4": 0,
    "5": -5,
    "6": -10,
    "default": -15,
    "max": 45
  },
  "LMP3": {
    "1": 10,
    "2": 5,
    "3": 2,
    "4": 0,
    "5": -2,
    "6": -5,
    "default": -10,
    "max": 30
  }
};
s5SprintData.config.rules.carSwitchPenaltyType = "zero_all_previous";
s5SprintData.config.driverRoster = []; // empty roster initially

s5SprintData.races = [
  { id: 1, name: "Round 1", track: "Algarve International Circuit", date: "7/8/26", status: "Scheduled" },
  { id: 2, name: "Round 2", track: "Sebring International Raceway", date: "7/15/26", status: "Scheduled" },
  { id: 3, name: "Round 3", track: "Autódromo José Carlos Pace", date: "7/22/26", status: "Scheduled" },
  { id: 4, name: "Round 4", track: "Lusail International Circuit", date: "7/29/26", status: "Scheduled" },
  { id: 5, name: "Round 5", track: "Circuit of the Americas", date: "8/5/26", status: "Scheduled" },
  { id: 6, name: "Round 6", track: "Circuit de Spa-Francorchamps", date: "8/12/26", status: "Scheduled" }
];

s5SprintData.qualifyingSettings = {
  "LMP3": { consecutiveLaps: 5, maxAvgTime: 120 },
  "LMGT3": { consecutiveLaps: 5, maxAvgTime: 140 }
};

fs.writeFileSync(path.join(srcDir, 'season5_sprint.json'), JSON.stringify(s5SprintData, null, 2));

console.log("Done generating S5 JSONs.");
