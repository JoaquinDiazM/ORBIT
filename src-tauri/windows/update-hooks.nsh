LangString orbitUpdateBusy 1033 "ORBIT or another process still has the installed program open. Close ORBIT in this Windows session and retry the update."
LangString orbitUpdateBusy 1034 "ORBIT u otro proceso sigue usando el programa instalado. Cierra ORBIT en esta sesión de Windows y vuelve a intentar actualizar."
LangString orbitUpdateCheckFailed 1033 "Windows could not check whether ORBIT is closed. Close ORBIT and retry the update."
LangString orbitUpdateCheckFailed 1034 "Windows no pudo comprobar si ORBIT está cerrado. Cierra ORBIT y vuelve a intentar actualizar."

!macro NSIS_HOOK_PREINSTALL
  ; The running updater starts NSIS before its own process exits. In update mode,
  ; allow the exact installed file to become free before Tauri checks for locks.
  ${If} $UpdateMode == 1
  ${AndIf} ${FileExists} "$INSTDIR\${MAINBINARYNAME}.exe"
    Push $0
    Push $R0
    Push $R1
    StrCpy $R1 0
    ${Do}
      ; Use a fresh session so an earlier RmGetList snapshot cannot keep a
      ; process on the list after it has exited.
      !insertmacro RestartManager_StartSession $R0
      ${If} $R0 == ""
        StrCpy $0 -1
        ${ExitDo}
      ${EndIf}
      !insertmacro RestartManager_RegisterFile $R0 "$INSTDIR\${MAINBINARYNAME}.exe"
      ${If} $0 == 0
        ; An empty output buffer returns ERROR_MORE_DATA (234) while there are holders.
        System::Call 'RSTRTMGR::RmGetList(i R0, *i 0, *i 0, p 0, *i 0) i .r0'
      ${EndIf}
      !insertmacro RestartManager_EndSession $R0
      ${If} $0 != 234
      ${OrIf} $R1 >= 80
        ${ExitDo}
      ${EndIf}
      ${If} $R1 == 0
        DetailPrint "$(orbitUpdateBusy)"
      ${EndIf}
      Sleep 250
      IntOp $R1 $R1 + 1
    ${Loop}

    ${If} $0 == 234
      SetErrorLevel 1
      Abort "$(orbitUpdateBusy)"
    ${ElseIf} $0 != 0
      SetErrorLevel 1
      Abort "$(orbitUpdateCheckFailed)"
    ${EndIf}
    Pop $R1
    Pop $R0
    Pop $0
  ${EndIf}
!macroend
