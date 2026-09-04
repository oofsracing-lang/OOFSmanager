const fs = require('fs');
const file = 'src/data/seasons/season4_sprint.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const newRoster = [
  { "name": "Andrew Canelli", "class": "LMGT3", "number": "44", "reserve": false },
  { "name": "Nitin Murthy", "class": "LMGT3", "number": "472", "reserve": false },
  { "name": "Parker Thomas", "class": "LMGT3", "number": "69", "reserve": false },
  { "name": "Gage Galvin", "class": "LMGT3", "number": "93", "reserve": false },
  { "name": "Owen Beerkircher", "class": "LMGT3", "number": "977", "reserve": false },
  { "name": "Matthew Heslep", "class": "LMGT3", "number": "33", "reserve": false },
  { "name": "Dave Carter", "class": "LMGT3", "number": "420", "reserve": false },
  { "name": "Richie Wood", "class": "LMGT3", "number": "101", "reserve": false },
  { "name": "Brian Rouleau", "class": "LMGT3", "number": "15", "reserve": false },
  { "name": "JD Bagnoli", "class": "LMGT3", "number": "13", "reserve": false },
  { "name": "Dan Gomez", "class": "LMGT3", "number": "24", "reserve": false },
  { "name": "Michael Landry", "class": "LMGT3", "number": "710", "reserve": false },
  { "name": "Vinny Delvillano", "class": "LMGT3", "number": "25", "reserve": false },
  { "name": "Ethan Gonzales", "class": "LMGT3", "number": "985", "reserve": false },
  { "name": "William Neron", "class": "LMGT3", "number": "94", "reserve": false },
  { "name": "Joris Butkus", "class": "LMGT3", "number": "11", "reserve": false },
  { "name": "Gene Gertzwulf", "class": "LMGT3", "number": "7", "reserve": false },
  { "name": "Guillermo Paret", "class": "LMGT3", "number": "52", "reserve": false },
  { "name": "Harrison Miller", "class": "LMGT3", "number": "397", "reserve": false },
  { "name": "Willie Mangram", "class": "LMGT3", "number": "2", "reserve": false },
  { "name": "Dylan Gager", "class": "LMGT3", "number": "4", "reserve": false },
  { "name": "Christian Gomez", "class": "LMGT3", "number": "48", "reserve": false },
  { "name": "Thomas Hosteng", "class": "LMGT3", "number": "42", "reserve": false },
  { "name": "Joel Klaus", "class": "LMGT3", "number": "902", "reserve": false },
  { "name": "Ricky Swaby", "class": "LMGT3", "number": "79", "reserve": false },
  { "name": "Rich Dyer", "class": "LMGT3", "number": "8", "reserve": false },
  { "name": "Michen Wallace", "class": "LMGT3", "number": "37", "reserve": false },
  { "name": "Bort Bonerson", "class": "LMGT3", "number": "507", "reserve": false },
  { "name": "Greg Kachadurian", "class": "LMGT3", "number": "1", "reserve": false }
];

data.config.driverRoster = newRoster;
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Updated sprint roster');
