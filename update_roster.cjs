const fs = require('fs');
const file = 'src/data/seasons/season4_multiclass.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const newRoster = [
  { "name": "Greg Kachadurian", "class": "Hypercar", "number": "123", "reserve": false },
  { "name": "Andrew Canelli", "class": "Hypercar", "number": "44", "reserve": false },
  { "name": "Dave Harris", "class": "Hypercar", "number": "91", "reserve": false },
  { "name": "Grayson Head", "class": "Hypercar", "number": "34", "reserve": false },
  { "name": "James Rubio", "class": "Hypercar", "number": "27", "reserve": false },
  { "name": "Christopher McLennan", "class": "Hypercar", "number": "114", "reserve": false },
  { "name": "Michael Landry", "class": "Hypercar", "number": "710", "reserve": false },
  { "name": "Julian Muñoz", "class": "Hypercar", "number": "55", "reserve": false },
  { "name": "Jeffrey Aroyan", "class": "Hypercar", "number": "233", "reserve": false },
  { "name": "Santhosh Kumarasamy", "class": "Hypercar", "number": "444", "reserve": false },
  { "name": "Willie Mangram", "class": "Hypercar", "number": "2", "reserve": false },
  { "name": "Nate Sides", "class": "Hypercar", "number": "12", "reserve": false },
  { "name": "Christian Gomez", "class": "Hypercar", "number": "48", "reserve": false },
  { "name": "Thomas Hosteng", "class": "Hypercar", "number": "42", "reserve": false },
  { "name": "Ross McLean", "class": "Hypercar", "number": "297", "reserve": false },
  { "name": "Ryan Bellune", "class": "Hypercar", "number": "228", "reserve": true },
  { "name": "Joris Butkus", "class": "Hypercar", "number": "11", "reserve": true },
  { "name": "Arjun Lakshmi Narashimhan", "class": "Hypercar", "number": "45", "reserve": true },

  { "name": "David Paccagnini", "class": "LMGT3", "number": "808", "reserve": false },
  { "name": "Nitin Murthy", "class": "LMGT3", "number": "472", "reserve": false },
  { "name": "Abe Wozniak", "class": "LMGT3", "number": "25", "reserve": false },
  { "name": "Josh Popov", "class": "LMGT3", "number": "6", "reserve": false },
  { "name": "Parker Thomas", "class": "LMGT3", "number": "69", "reserve": false },
  { "name": "Gage Galvin", "class": "LMGT3", "number": "93", "reserve": false },
  { "name": "Dustin Rand", "class": "LMGT3", "number": "5", "reserve": false },
  { "name": "Dakota Botello", "class": "LMGT3", "number": "1", "reserve": false },
  { "name": "Richie Wood", "class": "LMGT3", "number": "101", "reserve": false },
  { "name": "Jesse Olsen", "class": "LMGT3", "number": "16", "reserve": false },
  { "name": "Dave Carter", "class": "LMGT3", "number": "420", "reserve": false },
  { "name": "Ron Heslop", "class": "LMGT3", "number": "22", "reserve": false },
  { "name": "Avinash Ganti", "class": "LMGT3", "number": "46", "reserve": false },
  { "name": "Matthew Canelli", "class": "LMGT3", "number": "33", "reserve": false },
  { "name": "Chase Coughlan", "class": "LMGT3", "number": "18", "reserve": false },
  { "name": "Guillermo Paret", "class": "LMGT3", "number": "52", "reserve": false },
  { "name": "Kasi Jackman", "class": "LMGT3", "number": "868", "reserve": false },
  { "name": "Harrison Miller", "class": "LMGT3", "number": "397", "reserve": false },
  { "name": "Donnie Greathouse", "class": "LMGT3", "number": "666", "reserve": false },
  { "name": "Javier Tellex", "class": "LMGT3", "number": "67", "reserve": false },
  { "name": "Logan Breakey", "class": "LMGT3", "number": "29", "reserve": false },
  { "name": "Kevin Sakamoto", "class": "LMGT3", "number": "72", "reserve": false },
  { "name": "Trenton Jump", "class": "LMGT3", "number": "146", "reserve": false },
  { "name": "Dan Jr Poulin", "class": "LMGT3", "number": "113", "reserve": true },
  { "name": "Zac Beauclaire", "class": "LMGT3", "number": "311", "reserve": true }
];

data.config.driverRoster = newRoster;
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Updated roster');
