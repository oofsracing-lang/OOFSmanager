const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'data', 'seasons');

// 1. Season 6 Endurance (based on S5 Multiclass rules, renamed to Endurance)
const s5MultiPath = path.join(srcDir, 'season5_multiclass.json');
const s5MultiData = JSON.parse(fs.readFileSync(s5MultiPath, 'utf8'));

const s6EnduranceData = {
  ...s5MultiData,
  season: "Season 6 - Endurance",
  id: "s6-endurance",
  config: {
    ...s5MultiData.config,
    seriesName: "Season 6 Endurance",
    classes: ["Hypercar", "LMGT3"],
    ui: {
      theme: "modern",
      showTeamColumn: true,
      showQualifying: true,
      showCarColumn: true,
      showTeamChampionship: true
    },
    rules: {
      ...s5MultiData.config.rules,
      ballastType: "custom_class",
      ballastRules: {
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
      },
      carSwitchPenaltyType: "zero_best_finish",
      dropRounds: true
    },
    driverRoster: []
  },
  currentRound: 0,
  totalRounds: 6,
  drivers: [],
  teams: [],
  penalties: {},
  manualPositions: {},
  exclusions: {},
  races: [
    { id: 1, name: "Round 1", track: "Fuji Default (WEC)", date: "10/1/26", status: "Scheduled" },
    { id: 2, name: "Round 2", track: "Circuit de Barcelona", date: "10/8/26", status: "Scheduled" },
    { id: 3, name: "Round 3", track: "WeatherTech Raceway Laguna Seca", date: "10/15/26", status: "Scheduled" },
    { id: 4, name: "Round 4", track: "Bahrain Default (WEC)*", date: "10/29/26", status: "Scheduled" },
    { id: 5, name: "Round 5", track: "Qatar (WEC)", date: "11/5/26", status: "Scheduled" },
    { id: 6, name: "Round 6", track: "Monza Default (WEC)", date: "11/12/26", status: "Scheduled" }
  ],
  qualifyingSettings: {
    "Hypercar": { consecutiveLaps: 5, maxAvgTime: 120 },
    "LMGT3": { consecutiveLaps: 5, maxAvgTime: 140 }
  }
};

fs.writeFileSync(path.join(srcDir, 'season6_endurance.json'), JSON.stringify(s6EnduranceData, null, 2));


// 2. Season 6 Sprint (Wednesday schedule, LMP3 & LMGT3, showQualifying: true)
const s5SprintPath = path.join(srcDir, 'season5_sprint.json');
const s5SprintData = JSON.parse(fs.readFileSync(s5SprintPath, 'utf8'));

const s6SprintData = {
  ...s5SprintData,
  season: "Season 6 - Sprint Series",
  id: "s6-sprint",
  config: {
    ...s5SprintData.config,
    seriesName: "Season 6 Sprint Series",
    classes: ["LMP3", "LMGT3"],
    ui: {
      theme: "gt3",
      showTeamColumn: true,
      showCarColumn: true,
      showQualifying: true,
      showTeamChampionship: true
    },
    rules: {
      ...s5SprintData.config.rules,
      ballastType: "custom_class",
      ballastRules: {
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
      },
      carSwitchPenaltyType: "zero_all_previous",
      dropRounds: true
    },
    driverRoster: []
  },
  currentRound: 0,
  totalRounds: 6,
  drivers: [],
  teams: [],
  penalties: {},
  manualPositions: {},
  exclusions: {},
  races: [
    { id: 1, name: "Round 1", track: "Fuji Default (WEC)", date: "9/30/26", status: "Scheduled" },
    { id: 2, name: "Round 2", track: "Circuit de Barcelona", date: "10/7/26", status: "Scheduled" },
    { id: 3, name: "Round 3", track: "WeatherTech Raceway Laguna Seca", date: "10/14/26", status: "Scheduled" },
    { id: 4, name: "Round 4", track: "Bahrain Default (WEC)*", date: "10/28/26", status: "Scheduled" },
    { id: 5, name: "Round 5", track: "Qatar (WEC)", date: "11/4/26", status: "Scheduled" },
    { id: 6, name: "Round 6", track: "Monza Default (WEC)", date: "11/11/26", status: "Scheduled" }
  ],
  qualifyingSettings: {
    "LMP3": { consecutiveLaps: 5, maxAvgTime: 120 },
    "LMGT3": { consecutiveLaps: 5, maxAvgTime: 140 }
  }
};

fs.writeFileSync(path.join(srcDir, 'season6_sprint.json'), JSON.stringify(s6SprintData, null, 2));

console.log("Done generating Season 6 JSONs (Endurance & Sprint).");
