import pandas as pd

excel_file = 'XML Ingest - DEV.xlsx'
# Read with header=None to see actual first row
df_raw = pd.read_excel(excel_file, sheet_name='Drivers', header=None, nrows=3)
print("First 3 rows of raw data:")
print(df_raw)
