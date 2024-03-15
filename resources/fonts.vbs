Option Explicit

' 声明变量
Dim objShell, objFSO, objFile, objFolder
Dim objFolderItem, colItems, objFont
Dim strFileName

' 定义常量
Const FONTS = &H14& ' 字体文件夹

' 实例化对象
Set objShell = CreateObject("Shell.Application")
Set objFolder = objShell.Namespace(FONTS)
Set objFolderItem = objFolder.Self
Set colItems = objFolder.Items
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 遍历字体文件夹中的字体文件
For Each objFont in colItems
    ' 输出字体文件的路径和名称
    WScript.StdOut.WriteLine(objFont.Path & vbtab & objFont.Name)
Next

' 清理对象
Set objShell = nothing
Set objFile = nothing
Set objFolder = nothing
Set objFolderItem = nothing
Set colItems = nothing
Set objFont = nothing
Set objFSO = nothing

' 终止脚本执行
wscript.quit
