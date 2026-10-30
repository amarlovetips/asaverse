Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c ""cd /d d:\asaverse && npm.cmd run dev > d:\asaverse\dev.log 2>&1""", 0, False