$cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object Subject -match 'CN=OmniStream' | Select-Object -First 1
Set-AuthenticodeSignature -FilePath "C:\Program Files\OmniStream\OmniStream.exe" -Certificate $cert
