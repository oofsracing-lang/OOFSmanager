import pandas as pd
import json

# Read the Excel file
excel_file = 'XML Ingest - DEV.xlsx'
driver_df = pd.read_excel(excel_file, sheet_name='Drivers')

# Map class names
class_map = {
    'LMP2_ELMS': 'LMP2',
    'GT3': 'LMGT3'
}

# Race sheet mapping
race_sheets = [
    ('Sebring International Raceway', 1),
    ('Lusail International Circuit', 2),
    ('Autodromo Nazionale Monza', 3),
    ('Circuit de la Sarthe', 4),
    ('Silverstone Circuit', 5)
]

# Convert to JavaScript format
drivers = []
for idx, row in driver_df.iterrows():
    driver = {
        'id': idx + 1,
        'name': row['Driver'],
        'class': class_map.get(row['CarClass'], row['CarClass']),
        'totalPoints': int(row['Championship Points']) if pd.notna(row['Championship Points']) else 0,
        'currentBallast': int(row['Current Ballast']) if pd.notna(row['Current Ballast']) else 0,
        'team': 'OOFS Racing',
        'raceResults': []
    }
    
    # Add race results from driver sheet
    for race_name, race_id in race_sheets:
        points_col = f'points {race_name}'
        attendance_col = f'attendance {race_name}'
        ballast_col = f'Ballast {race_name}'
        
        if points_col in row and pd.notna(row[points_col]):
            result = {
                'raceId': race_id,
                'points': int(row[points_col]),
                'attendance': row[attendance_col] if pd.notna(row[attendance_col]) else 'Unknown',
                'ballastChange': int(row[ballast_col]) if pd.notna(row[ballast_col]) else 0
            }
            
            # Try to get race time from race sheet
            try:
                race_df = pd.read_excel(excel_file, sheet_name=race_name)
                driver_race_data = race_df[race_df['Driver'] == driver['name']]
                
                if not driver_race_data.empty:
                    race_row = driver_race_data.iloc[0]
                    result['finishTime'] = float(race_row['FinishTime']) if pd.notna(race_row['FinishTime']) else None
                    result['finishTimeFormatted'] = str(race_row['FinishTimeFormatted']) if pd.notna(race_row['FinishTimeFormatted']) else None
                    result['timePenalty'] = int(race_row['TimePenalty']) if pd.notna(race_row['TimePenalty']) else 0
                    result['laps'] = int(race_row['Laps']) if pd.notna(race_row['Laps']) else 0
            except Exception as e:
                print(f"Warning: Could not get race time for {driver['name']} in {race_name}: {e}")
                result['finishTime'] = None
                result['finishTimeFormatted'] = None
                result['timePenalty'] = 0
                result['laps'] = 0
            
            driver['raceResults'].append(result)
    
    drivers.append(driver)

# Create races list
races_data = [
    {'id': 1, 'name': 'Sebring', 'date': '2024-10-23', 'track': 'Sebring International Raceway'},
    {'id': 2, 'name': 'Qatar', 'date': '2024-10-30', 'track': 'Lusail International Circuit'},
    {'id': 3, 'name': 'Monza', 'date': '2024-11-06', 'track': 'Autodromo Nazionale Monza'},
    {'id': 4, 'name': 'Le Mans', 'date': '2024-11-13', 'track': 'Circuit de la Sarthe'},
    {'id': 5, 'name': 'Silverstone', 'date': '2024-11-20', 'track': 'Silverstone Circuit'},
    {'id': 6, 'name': 'Bahrain', 'date': '2024-12-04', 'track': 'Bahrain International Circuit'},
    {'id': 7, 'name': 'Fuji', 'date': '2024-12-11', 'track': 'Fuji Speedway'},
    {'id': 8, 'name': 'Spa', 'date': '2024-12-18', 'track': 'Circuit de Spa-Francorchamps'},
]

# Create JavaScript file content
js_content = f"""// Championship data extracted from Excel
export const championshipData = {{
  season: "Season 2",
  currentRound: 5,
  totalRounds: 8,
  
  drivers: {json.dumps(drivers, indent=2)},
  
  races: {json.dumps(races_data, indent=2)}
}};
"""

# Write to file
with open('src/data/championship.js', 'w') as f:
    f.write(js_content)

print("✅ Championship data updated successfully!")
print(f"Total drivers: {len(drivers)}")
print(f"LMP2 drivers: {len([d for d in drivers if d['class'] == 'LMP2'])}")
print(f"LMGT3 drivers: {len([d for d in drivers if d['class'] == 'LMGT3'])}")

