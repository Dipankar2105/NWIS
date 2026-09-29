import shutil

src = r"C:\Users\User\Downloads\NWIS-Dipankar\NWIS\app\services\document_preprocessing.py"
dst = r"app\services\document_preprocessing.py"
shutil.copyfile(src, dst)
print("SUCCESS: Copied document_preprocessing.py")
