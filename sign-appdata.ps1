$cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object Subject -match 'CN=OmniStream' | Select-Object -First 1
Set-AuthenticodeSignature -FilePath "C:\Users\saichandram\AppData\Local\Programs\OmniStream\OmniStream.exe" -Certificate $cert
Get-ChildItem "C:\Users\saichandram\AppData\Local\Programs\OmniStream\*.dll" | ForEach-Object {
    Set-AuthenticodeSignature -FilePath $_.FullName -Certificate $cert
}
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\OmniStream.lnk")
$Shortcut.TargetPath = "C:\Users\saichandram\AppData\Local\Programs\OmniStream\OmniStream.exe"
$Shortcut.Save()
