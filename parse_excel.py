import pandas as pd
import json

# Read the Excel file
excel_file = 'XML Ingest - DEV.xlsx'
xls = pd.ExcelFile(excel_file)

print("Available sheets:", xls.sheet_names)
print("\n" + "="*50)

# Read the Driver tab (overall standings)
driver_df = pd.read_excel(excel_file, sheet_name='Drivers')
print("\n=== DRIVER TAB COLUMNS ===")
print(driver_df.columns.tolist())
print("\n=== FIRST 5 ROWS ===")
print(driver_df.head())

# Save to JSON for inspection
output = {
    "sheets": xls.sheet_names,
    "driver_columns": driver_df.columns.tolist(),
    "driver_data": driver_df.to_dict('records')
}

with open('excel_data.json', 'w') as f:
    json.dump(output, f, indent=2, default=str)

print("\n✅ Data exported to excel_data.json")
print(f"Total drivers: {len(driver_df)}")
