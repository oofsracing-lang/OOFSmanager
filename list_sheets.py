import openpyxl

wb = openpyxl.load_workbook('XML Ingest - DEV.xlsx')
print("Available sheets:")
for sheet_name in wb.sheetnames:
    print(f"  - {sheet_name}")
