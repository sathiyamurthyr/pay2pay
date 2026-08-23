import b2sdk.v2 as b2
print([x for x in dir(b2) if "Download" in x or "Dest" in x])
from b2sdk.v2 import DownloadDestLocalFile
print("DownloadDestLocalFile exists:", DownloadDestLocalFile)
