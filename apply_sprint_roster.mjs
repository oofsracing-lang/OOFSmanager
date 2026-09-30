import { applyRoster } from './update_s6_rosters.mjs';

const sprintRoster = [
  // LMP3
  { name: "Nitin Murthy", class: "LMP3", car: "Ginetta", number: "", reserve: false },
  { name: "Ethan Gonzales", class: "LMP3", car: "Ginetta", number: "", reserve: false },
  { name: "Nick Johnson", class: "LMP3", car: "Duqueine", number: "", reserve: false },
  { name: "William Neron", class: "LMP3", car: "Ligier", number: "", reserve: false },
  { name: "Ily Bordiyan", class: "LMP3", car: "Duqueine", number: "", reserve: false },
  { name: "Philippe Brazeau", class: "LMP3", car: "Ginetta", number: "", reserve: false },
  { name: "Hans Montes", class: "LMP3", car: "Duqueine", number: "", reserve: false },
  { name: "C M Wilson", class: "LMP3", car: "Ginetta", number: "", reserve: false },
  { name: "Dave Harris", class: "LMP3", car: "Ginetta", number: "", reserve: false },
  { name: "Irail Santiago", class: "LMP3", car: "Ginetta", number: "", reserve: false },

  // LMGT3
  { name: "Greg Kachadurian", class: "LMGT3", car: "Ford Mustang GT3", number: "", reserve: false },
  { name: "Karl Fredricksen", class: "LMGT3", car: "Ford Mustang GT3", number: "", reserve: false },
  { name: "Timo White", class: "LMGT3", car: "Ferrari 296 GT3", number: "", reserve: false },
  { name: "Andrew Canelli", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "Parker thom", class: "LMGT3", car: "Porsche 911 GT3 R", number: "", reserve: false },
  { name: "Richie Wood", class: "LMGT3", car: "Aston Martin Vantage AMR GT3 Evo", number: "", reserve: false },
  { name: "Wesley Ambrose", class: "LMGT3", car: "Ford Mustang GT3", number: "", reserve: false },
  { name: "Willie Mangram", class: "LMGT3", car: "Ford Mustang GT3", number: "", reserve: false },
  { name: "Michael Landry", class: "LMGT3", car: "BMW M4 LMGT3", number: "", reserve: false },
  { name: "Harrison Miller", class: "LMGT3", car: "Ford Mustang GT3", number: "", reserve: false },
  { name: "Ricardo Swaby", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "Keith Drury", class: "LMGT3", car: "Ferrari 296 GT3", number: "", reserve: false },
  { name: "Alex Laplante", class: "LMGT3", car: "Porsche 911 GT3 R", number: "", reserve: false },
  { name: "Guillermo Paret", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "Jay Steed", class: "LMGT3", car: "Ford Mustang GT3", number: "", reserve: false },
  { name: "Scarlett Brown", class: "LMGT3", car: "Porsche 911 GT3 R", number: "", reserve: false },
  { name: "Shae Lewis", class: "LMGT3", car: "McLaren 720S GT3 Evo", number: "", reserve: false },
  { name: "Preston Parenti", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "Daniel Valasco", class: "LMGT3", car: "McLaren 720S GT3 Evo", number: "", reserve: false },
  { name: "Neil Lorch", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "Travis Brown", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "bt bt", class: "LMGT3", car: "Porsche 911 GT3 R", number: "", reserve: false },
  { name: "John Pflibsen", class: "LMGT3", car: "Porsche 911 GT3 R", number: "", reserve: false },
  { name: "Alexandre Urie", class: "LMGT3", car: "Chevrolet Corvette Z06 GT3.R", number: "", reserve: false },
  { name: "Patricio Fernandez", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "Carl Brown", class: "LMGT3", car: "Lexus RC F GT3", number: "", reserve: false },
  { name: "John Calbick", class: "LMGT3", car: "Chevrolet Corvette Z06 GT3.R", number: "", reserve: false },
  { name: "hashim ali", class: "LMGT3", car: "Chevrolet Corvette Z06 GT3.R", number: "", reserve: false },
  { name: "Jay Dizzle", class: "LMGT3", car: "Mercedes-AMG GT3 Evo", number: "", reserve: false }
];

async function main() {
  try {
    await applyRoster('s6-sprint', sprintRoster);
    console.log("Successfully applied Sprint roster!");
    process.exit(0);
  } catch (err) {
    console.error("Error applying roster:", err);
    process.exit(1);
  }
}

main();
