const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('XML Ingest - DEV.xlsx');

console.log('Available sheets:', workbook.SheetNames);

// Read the Driver tab (overall standings)
const driverSheet = workbook.Sheets['Driver'];
const driverData = XLSX.utils.sheet_to_json(driverSheet);

console.log('\n=== DRIVER STANDINGS ===');
console.log(JSON.stringify(driverData.slice(0, 5), null, 2)); // First 5 drivers

// Read race tabs (tabs 2-6)
const raceTabs = workbook.SheetNames.slice(1, 6); // Assuming tabs 2-6 are indices 1-5
console.log('\n=== RACE TABS ===');
raceTabs.forEach((tabName, index) => {
    const raceSheet = workbook.Sheets[tabName];
    const raceData = XLSX.utils.sheet_to_json(raceSheet);
    console.log(`\nRace ${index + 1} (${tabName}):`);
    console.log(JSON.stringify(raceData.slice(0, 3), null, 2)); // First 3 results
});

// Export to JSON for use in the app
const output = {
    drivers: driverData,
    races: {}
};

raceTabs.forEach((tabName) => {
    const raceSheet = workbook.Sheets[tabName];
    output.races[tabName] = XLSX.utils.sheet_to_json(raceSheet);
});

fs.writeFileSync('src/data/championship.json', JSON.stringify(output, null, 2));
console.log('\n✅ Data exported to src/data/championship.json');
