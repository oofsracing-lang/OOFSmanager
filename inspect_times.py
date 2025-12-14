import pandas as pd

excel_file = 'XML Ingest - DEV.xlsx'
df = pd.read_excel(excel_file, sheet_name='Drivers')

# Show first few rows of unnamed columns
unnamed_cols = [col for col in df.columns if 'Column' in str(col)]
print("Unnamed columns sample data:")
print(df[['Driver'] + unnamed_cols[:10]].head(10))
