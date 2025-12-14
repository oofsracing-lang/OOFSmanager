import pandas as pd

excel_file = 'XML Ingest - DEV.xlsx'
df = pd.read_excel(excel_file, sheet_name='Drivers')
for col in df.columns:
    print(col)
