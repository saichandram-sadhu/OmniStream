$cert = New-SelfSignedCertificate -Type Custom -Subject "CN=OmniStream" -KeyUsage DigitalSignature -FriendlyName "OmniStream Cert" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")
Set-AuthenticodeSignature -FilePath "release\OmniStream Setup 1.0.0.exe" -Certificate $cert
Export-Certificate -Cert $cert -FilePath "release\cert.cer"
Import-Certificate -FilePath "release\cert.cer" -CertStoreLocation "Cert:\CurrentUser\Root"
