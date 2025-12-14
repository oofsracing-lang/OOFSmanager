import pandas as pd
import openpyxl

# Open the Excel file directly with openpyxl to see actual headers
wb = openpyxl.load_workbook('XML Ingest - DEV.xlsx')
ws = wb['Drivers']

# Get the first row (headers)
headers = []
for cell in ws[1]:
    headers.append(cell.value)

print("All column headers:")
for i, header in enumerate(headers):
    print(f"{i}: {header}")
