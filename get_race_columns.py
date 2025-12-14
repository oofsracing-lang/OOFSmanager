import pandas as pd

# Check the Silverstone sheet
df = pd.read_excel('XML Ingest - DEV.xlsx', sheet_name='Silverstone Circuit')
print("All columns:")
for i, col in enumerate(df.columns):
    print(f"{i}: {col}")

print("\n\nSample data (first 3 rows):")
print(df[['Driver', 'CarClass', 'FinalClassPosition', 'FinishTime_formatted', 'FinalPoints']].head(10))
