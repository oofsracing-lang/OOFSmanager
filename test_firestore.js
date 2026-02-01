// Quick test to verify standings/2 exists in Firestore
// Open browser console and paste this

fetch('https://firestore.googleapis.com/v1/projects/oofs-manager/databases/(default)/documents/standings/2')
    .then(r => r.json())
    .then(data => {
        console.log('Standings/2 exists:', !!data.fields);
        console.log('Drivers count:', data.fields?.drivers?.arrayValue?.values?.length || 0);
        console.log('Calculation source:', data.fields?.calculationSource?.stringValue);
        console.log('Full data:', data);
    })
    .catch(err => console.error('Error:', err));
