Option Explicit
Dim shell, files, folder, nodePath, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
nodePath = "C:\Program Files\nodejs\node.exe"
shell.CurrentDirectory = folder
command = Chr(34) & nodePath & Chr(34) & " " & Chr(34) & files.BuildPath(folder, "server.js") & Chr(34)
exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
