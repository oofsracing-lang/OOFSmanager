import pandas as pd

excel_file = 'XML Ingest - DEV.xlsx'
df = pd.read_excel(excel_file, sheet_name='Drivers')

# Get all column names
all_cols = df.columns.tolist()

# Find columns with 'finish' or 'time' (case insensitive)
time_cols = [col for col in all_cols if 'finish' in str(col).lower() or 'time' in str(col).lower()]

print("Columns with 'finish' or 'time':")
for col in time_cols:
    print(f"  - {col}")

# Also show a sample of data from these columns
if time_cols:
    print("\nSample data:")
    print(df[['Driver'] + time_cols[:5]].head(5))
