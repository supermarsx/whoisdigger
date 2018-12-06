; #INDEX# =======================================================================================================================
; Title .........: WHOIS Digger
; Version .......: 1.0
; AutoIt Version : 3.3.12
; Language ......: English
; Description ...: Crawl whois database using a domain list
; Author(s) .....: Eduardo Mota
; BIN ...........: Whois.bin from Sysinternals
; ===============================================================================================================================

#include <ButtonConstants.au3>
#include <EditConstants.au3>
#include <GUIConstantsEx.au3>
#include <WindowsConstants.au3>
#include <GuiEdit.au3>
#include <String.au3>
#include <Constants.au3>
#include <File.au3>
#include <String.au3>
#include <Crypt.au3>
#include <Array.au3>

#NoTrayIcon

Global $cfg_domainlist = "domains.list", _	; Domains List file to crawl
$cfg_tld = ".com", _ 						; Preferred TLD: .com, .net, .edu (Verisign)
$cfg_mode = "multi", _ 						; Crawling Mode (single process, slow, safer: single OR multi process, fast: multi)
$cfg_tmpext = ".part", _ 					; Multi mode, temporary file extension
$cfg_hashsalt = Random(10000,99999), _ 		; Multi mode, file hash salt
$cfg_tmpdir = "temp", _						; Temporary folder name
$cfg_delayreq = 0, _ 						; Single mode: delay between requests, Multi mode: delay between process spawn, low/no delay can trigger a whois block
$cfg_digtimeout = 10000, _ 					; Whois requests process timeout
$cfg_dbglogfile = "debug.log", _			; Debug log filename
$cfg_arrsort = 0							; Sorting domain list, 0 - no sort, 1 - asc sort, 2 - desc sort, 3 - Shuffle/Random // single mode recommended

; ASCII Table structure
Global 	$tbl_line 	= "+----------------------+------+---------------------+-------------+-------------+-------------+", _
		$tbl_header = "| Domain  Name         | Free | Registrar           | Expiration  | Updated     | Created     |"

; Buf vars
Global $i = 0, $bf_file, $bf_whois, $bf_doms

; If process is spawned via Multi process
If $CmdLine[0] = 2 Then
	_digexport($CmdLine[1],$CmdLine[2])
	Exit
Endif

; UI Initialization
$ui_hndl = GUICreate("WHOIS Digger", 739, 484, -1, -1)
$ui_result = GUICtrlCreateEdit("", 8, 8, 721, 441)
GUICtrlSetFont(-1, 10, 400, 0, "Consolas")
$btn_dig = GUICtrlCreateButton("Dig", 8, 456, 363, 25)
$btn_save = GUICtrlCreateButton("Export to file", 376, 456, 179, 25)
$btn_clean = GUICtrlCreateButton("Clean up files", 560, 456, 171, 25)
GUISetState(@SW_SHOW)

While 1
	$nMsg = GUIGetMsg()
	Switch $nMsg
		Case $GUI_EVENT_CLOSE
			Exit

		Case $btn_dig
			_digselector()
		Case $btn_save
		Case $btn_clean
			_digremove()
	EndSwitch
WEnd

; Remove Temp folder
Func _digremove()
	DirRemove($cfg_tmpdir,1)
EndFunc

; Process Whois requests with selected mode
Func _digselector()
	Local $dig_selector = $cfg_mode,  $i, $a, $tmp_result

	GUICtrlSendMsg($ui_result, $EM_LIMITTEXT, -1, 0)	; Disable Edit char limit
	$bf_doms = FileReadToArray($cfg_domainlist) 		; Read domain list
	Switch $cfg_arrsort
		Case 1 ; Asc Sort
			_ArraySort($bf_doms)
			;_ArrayDisplay($bf_doms)
		Case 2 ; Desc Sort
			_ArraySort($bf_doms,1)
		Case 3 ; Shuffle
			_ArrayShuffle($bf_doms)
	EndSwitch

	_GUICtrlEdit_InsertText($ui_result, $tbl_line & @CRLF & $tbl_header & @CRLF & $tbl_line & @CRLF) ; Insert table header

	; Single Mode
	If $dig_selector = "single" Then
		For $i = 0 To UBound($bf_doms) - 1
			$tmp_result = _dig($bf_doms[$i] & $cfg_tld)
			_GUICtrlEdit_InsertText($ui_result, $tmp_result & @CRLF)
			Sleep($cfg_delayreq)
		Next

	; Multi Mode
	ElseIf $dig_selector = "multi" Then
		$dig_executepath = '"' & @ScriptFullPath & '"'
		DirRemove($cfg_tmpdir,1)
		DirCreate($cfg_tmpdir)
		GUISetState(@SW_HIDE,$ui_hndl)	; Hide UI
		ProgressOn("Querying WHOIS server", "Launching WHOIS query(ies)")
		For $i = 0 To UBound($bf_doms) - 1
			ProgressSet($i * 100 / (UBound($bf_doms) - 1), $i & " of " & UBound($bf_doms) - 1 & " Domain(s) : " & $bf_doms[$i] & $cfg_tld)
			$dig_execparams = $bf_doms[$i] & $cfg_tld & ' ' & $cfg_tmpdir & '\' & _Crypt_HashData($bf_doms[$i] & $cfg_hashsalt,$CALG_MD5) & $cfg_tmpext ; execute whois with hash filename
			ShellExecute($dig_executepath, $dig_execparams, @ScriptDir, "", @SW_HIDE)
			Sleep($cfg_delayreq)
		Next

		$dig_timeout = TimerInit()	; Init Whois req timeout count
		ProgressSet(0,"","Waiting for complete query(ies) or timeout")
		While 1
			$a = _FileListToArray(@ScriptDir & '\' & $cfg_tmpdir)
			IF TimerDiff($dig_timeout) >= $cfg_digtimeout Then ExitLoop
			If IsArray($a) Then
				ProgressSet(UBound($bf_doms) * 100 / ($a[0] + 1), $a[0] + 1 & " of " & UBound($bf_doms) & " Domain(s) : " & (UBound($bf_doms) - $a[0] + 1) & " left" )
				If $a[0] >= UBound($bf_doms) - 1 Or TimerDiff($dig_timeout) >= $cfg_digtimeout Then ExitLoop
			EndIf
		WEnd

		ProgressSet(0,"","Inserting results")
		For $i = 0 To UBound($bf_doms) - 1
			ProgressSet(($i + 1) * 100 / UBound($bf_doms), $i + 1 & " of " & UBound($bf_doms) & " Domain(s) : " & $bf_doms[$i] & $cfg_tld)
			$dig_output = _HexToString(FileRead($cfg_tmpdir & '\' & _Crypt_HashData($bf_doms[$i] & $cfg_hashsalt,$CALG_MD5) & $cfg_tmpext))
			If @error Then $dig_output = "| " & StringFormat("%-20.20s",$bf_doms[$i]) & " | ?1   | ------------------- | ----------- | ----------- | ----------- |"
			_GUICtrlEdit_InsertText($ui_result, $dig_output & @CRLF)
		Next

		DirRemove($cfg_tmpdir,1)
		GUISetState(@SW_SHOW,$ui_hndl)	; Show UI
		ProgressOff()
	Endif
	_GUICtrlEdit_InsertText($ui_result, $tbl_line)
Endfunc

; Process multi mode Whois request to file
Func _digexport($dig_domain, $dig_file)
	;_dbgmsg($dig_domain & $dig_file)
	$dig_result = _StringToHex(_dig($dig_domain)) ;
	FileWrite($dig_file, $dig_result)
	Exit
Endfunc

; Do Whois request to server
Func _dig($dig_domain)
	Local $dig_registrar
;~ 	_dbgmsg('"' & @ScriptDir & '\whois.bin" -v ' & $dig_domain & ' -nobanner')
	$bf_whois = _RunCmd('"' & @ScriptDir & '\whois.bin" -v ' & $dig_domain & ' -nobanner')
;~ 	_dbgmsg($bf_whois)
	If Not StringInStr($bf_whois, "No Match") Then
		$dig_registrar = _StringBetween($bf_whois,"Registrar: ",@CRLF)
;~  	If @error Then $dig_registrar[0] = '-'
		If StringInStr($bf_whois,"Expiration Date") <> 0 Then
			$dig_expiration = _StringBetween($bf_whois,"Expiration Date: ",@CRLF)
		ElseIf StringInStr($bf_whois,"Expiry Date") <> 0 Then
			$dig_expiration = _StringBetween($bf_whois,"Expiry Date: ",@CRLF)
		Else
			$dig_expiration[0] = "-"
		EndIf
;~ 		If @error Then $dig_expiration[0] = '-'
		$dig_updated = _StringBetween($bf_whois,"Updated Date: ",@CRLF)
;~ 		If @error Then $dig_updated[0] = '-'
		$dig_creation = _StringBetween($bf_whois,"Creation Date: ",@CRLF)
;~ 		If @error Then $dig_creation[0] = '-'

;~ 		If IsArray($dig_registrar) And IsArray($dig_expiration) And IsArray($dig_updated) And IsArray($dig_creation) Then
;~ 		While @error = Null
			$dig_registrar[0] = StringStripCR($dig_registrar[0])
			$dig_expiration[0] = StringStripCR($dig_expiration[0])
			$dig_updated[0] = StringStripCR($dig_updated[0])
			$dig_creation[0] = StringStripCR($dig_creation[0])
			$output = "| " & StringFormat("%-20.20s",$dig_domain) & " | NO   | " & _
			StringFormat("%-19.19s",$dig_registrar[0]) & " | " & _
			StringFormat("%-11.11s",$dig_expiration[0]) & " | " & _
			StringFormat("%-11.11s",$dig_updated[0]) & " | " & _
			StringFormat("%-11.11s",$dig_creation[0]) & " | "
;~ 			ExitLoop
;~ 		WEnd
;~ 		If @error Then $output = "| " & StringFormat("%-20.20s",$dig_domain) & " | ?2   | ------------------- | ----------- | ----------- | ----------- |"
;~ 		Else
;~ 			$output = "| " & StringFormat("%-20.20s",$dig_domain) & " | ?2   | ------------------- | ----------- | ----------- | ----------- |"
;~ 		EndIf
	Else
		$output = "| " & StringFormat("%-20.20s",$dig_domain) & " | YES  | ------------------- | ----------- | ----------- | ----------- |"
	Endif

	Return $output
Endfunc

; Debug message short
Func _dbgmsg($msg)
	MsgBox(0,"Debug message",$msg,15)
EndFunc

; Debug logging short
Func _dbglog($msg)
	_FileWriteLog($cfg_dbglogfile, $msg)
EndFunc

; Run commandline process
Func _RunCmd ($sCommand)
	 If StringLeft ($sCommand, 1) = " " Then $sCommand = " " & $sCommand

	 Local $nPid = Run (@Comspec & " /c" & $sCommand, "", @SW_Hide, 8), $sRet = ""
	 If @Error then Return "ERROR:" & @ERROR
	 ProcessWait ($nPid)
	 While 1
	 $sRet &= StdoutRead($nPID)
	 If @error Or (Not ProcessExists ($nPid)) Then ExitLoop
	 WEnd
	 Return $sRet
EndFunc ; ==> _RunCmd