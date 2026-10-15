$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$Shortcut = $WshShell.CreateShortcut("$Desktop\Art_Studio_System.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\run_art_studio.bat"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.Description = "Atelier Art Studio Management System"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully at: $Desktop\Art_Studio_System.lnk"
