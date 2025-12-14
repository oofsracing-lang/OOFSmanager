import pandas as pd

excel_file = 'XML Ingest - DEV.xlsx'
df = pd.read_excel(excel_file, sheet_name='Drivers')
print("Columns:", df.columns.tolist())
