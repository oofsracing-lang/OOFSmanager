import pandas as pd

# Check the Silverstone sheet
df = pd.read_excel('XML Ingest - DEV.xlsx', sheet_name='Silverstone Circuit')
print("Silverstone Circuit columns:")
print(df.columns.tolist())
print("\nFirst 5 rows:")
print(df.head())
