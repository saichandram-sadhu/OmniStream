$script = {
    $cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object Subject -match 'CN=OmniStream' | Select-Object -First 1
    Set-AuthenticodeSignature -FilePath "C:\Program Files\OmniStream\OmniStream.exe" -Certificate $cert
    
    # Also sign all DLLs in the folder just in case Smart App Control is strict about dependencies
    Get-ChildItem "C:\Program Files\OmniStream\*.dll" | ForEach-Object {
        Set-AuthenticodeSignature -FilePath $_.FullName -Certificate $cert
    }
}
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script.ToString()))
Start-Process powershell -ArgumentList "-EncodedCommand $encoded" -Verb RunAs
