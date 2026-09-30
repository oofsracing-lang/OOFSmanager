import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enduranceRoster = [
  // Hypercar (12)
  { name: "Greg Kachadurian", class: "Hypercar", car: "Porsche 963", number: "123", reserve: false },
  { name: "Ethan Gonzales", class: "Hypercar", car: "Alpine A424", number: "985", reserve: false },
  { name: "Willie Mangram", class: "Hypercar", car: "Ferrari 499P", number: "2", reserve: false },
  { name: "Ryan Bellune", class: "Hypercar", car: "Genesis GMR-001", number: "228", reserve: false },
  { name: "Dakota Botello", class: "Hypercar", car: "Ferrari 499P", number: "33", reserve: false },
  { name: "Owen LaMarra", class: "Hypercar", car: "Alpine A424", number: "811", reserve: false },
  { name: "Christopher MacLennan", class: "Hypercar", car: "Peugeot 9X8 2024", number: "114", reserve: false },
  { name: "Daniel Valasco", class: "Hypercar", car: "Porsche 963", number: "477", reserve: false },
  { name: "Owen Beerkircher", class: "Hypercar", car: "Porsche 963", number: "997", reserve: false },
  { name: "Jeffrey Aroyan", class: "Hypercar", car: "Porsche 963", number: "233", reserve: false },
  { name: "C M Wilson", class: "Hypercar", car: "Genesis GMR-001", number: "177", reserve: false },
  { name: "Michael Quandt", class: "Hypercar", car: "BMW M Hybrid V8", number: "106", reserve: false },

  // LMGT3 (32)
  { name: "Abe Wozniak", class: "LMGT3", car: "Aston Martin Vantage AMR GT3 Evo", number: "25", reserve: false },
  { name: "Dave Carter", class: "LMGT3", car: "Ferrari 296 GT3", number: "390", reserve: false },
  { name: "Andrew Canelli", class: "LMGT3", car: "BMW M4 LMGT3", number: "44", reserve: false },
  { name: "Richie Wood", class: "LMGT3", car: "Aston Martin Vantage AMR GT3 Evo", number: "101", reserve: false },
  { name: "Jesse Olsen", class: "LMGT3", car: "BMW M4 LMGT3", number: "16", reserve: false },
  { name: "Wesley Ambrose", class: "LMGT3", car: "Ford Mustang GT3", number: "332", reserve: false },
  { name: "Parker thom", class: "LMGT3", car: "Porsche 911 GT3 R", number: "69", reserve: false },
  { name: "Brian Crane", class: "LMGT3", car: "Aston Martin Vantage AMR GT3 Evo", number: "223", reserve: false },
  { name: "Mike Dougherty", class: "LMGT3", car: "Ferrari 296 GT3", number: "26", reserve: false },
  { name: "Joe Marsiglia", class: "LMGT3", car: "Ferrari 296 GT3", number: "517", reserve: false },
  { name: "Dustin Rand", class: "LMGT3", car: "Ford Mustang GT3", number: "5", reserve: false },
  { name: "Ryan Dangler", class: "LMGT3", car: "Lamborghini Huracan GT3", number: "11", reserve: false },
  { name: "Dick Garcia", class: "LMGT3", car: "Aston Martin Vantage AMR GT3 Evo", number: "57", reserve: false },
  { name: "Daniel DuChaine", class: "LMGT3", car: "Ford Mustang GT3", number: "173", reserve: false },
  { name: "Ron Heslop", class: "LMGT3", car: "McLaren 720S GT3 Evo", number: "22", reserve: false },
  { name: "Harrison Miller", class: "LMGT3", car: "Ford Mustang GT3", number: "17", reserve: false },
  { name: "Ily Bordiyan", class: "LMGT3", car: "Porsche 911 GT3 R", number: "3", reserve: false },
  { name: "Keith Drury", class: "LMGT3", car: "Ferrari 296 GT3", number: "86", reserve: false },
  { name: "Holden Gawehn", class: "LMGT3", car: "BMW M4 LMGT3", number: "420", reserve: false },
  { name: "Alex Laplante", class: "LMGT3", car: "Porsche 911 GT3 R", number: "260", reserve: false },
  { name: "Grayson Head", class: "LMGT3", car: "Porsche 911 GT3 R", number: "34", reserve: false },
  { name: "Justin Jackson", class: "LMGT3", car: "Porsche 911 GT3 R", number: "13", reserve: false },
  { name: "Guillermo Paret", class: "LMGT3", car: "Lexus RC F GT3", number: "52", reserve: false },
  { name: "Josh Popov", class: "LMGT3", car: "Porsche 911 GT3 R", number: "6", reserve: false },
  { name: "Donnie Greathouse", class: "LMGT3", car: "BMW M4 LMGT3", number: "666", reserve: false },
  { name: "Dan Jr Poulin", class: "LMGT3", car: "Lexus RC F GT3", number: "418", reserve: false },
  { name: "Scarlett Brown", class: "LMGT3", car: "Porsche 911 GT3 R", number: "42", reserve: false },
  { name: "Christian Holmes", class: "LMGT3", car: "Lexus RC F GT3", number: "202", reserve: false },
  { name: "John Calbick", class: "LMGT3", car: "Chevrolet Corvette Z06 GT3.R", number: "9", reserve: false },
  { name: "bt bt", class: "LMGT3", car: "Porsche 911 GT3 R", number: "43", reserve: false },
  { name: "Brian Harris", class: "LMGT3", car: "Ferrari 296 GT3", number: "74", reserve: false },
  { name: "Nick Johnson", class: "LMGT3", car: "Porsche 911 GT3 R", number: "696", reserve: false }
];

const filePath = path.join(__dirname, 'src', 'data', 'seasons', 'season6_endurance.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

data.config.driverRoster = enduranceRoster.map(d => ({
  name: d.name.trim(),
  class: d.class.trim(),
  number: String(d.number || '').trim(),
  car: d.car ? String(d.car).trim() : '',
  reserve: Boolean(d.reserve),
  team: d.team ? String(d.team).trim() : ''
}));

data.drivers = data.config.driverRoster.map((d, idx) => ({
  id: idx + 1,
  name: d.name,
  class: d.class,
  team: d.team || '',
  car: d.car || '',
  number: d.number || '',
  totalPoints: 0,
  raceResults: []
}));

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log(`Updated season6_endurance.json with ${data.config.driverRoster.length} roster entries and ${data.drivers.length} drivers.`);
