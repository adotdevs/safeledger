When I rrun npm run electron:server, it opens the app and wors fine


but when I run npm run electron:build, it made the windows app and the app isnt opening:

  • electron-builder  version=25.0.5 os=10.0.26100
  • loaded configuration  file=package.json ("build" field)
  • description is missed in the package.json  appPackageFile=D:\safecoinledger-new\FE\package.json
  • writing effective config  file=dist-electron\builder-effective-config.yaml
  • executing @electron/rebuild  electronVersion=32.1.2 arch=x64 buildFromSource=false appDir=./
  • installing native dependencies  arch=x64
  • completed installing native dependencies
  • packaging       platform=win32 arch=x64 electron=32.1.2 appOutDir=dist-electron\win-unpacked
  • updating asar integrity executable resource  executablePath=D:\safecoinledger-new\FE\dist-electron\win-unpacked\Safe Coin Ledger.exe
  • executing @electron/rebuild  electronVersion=32.1.2 arch=ia32 buildFromSource=false appDir=./
  • installing native dependencies  arch=ia32
  • completed installing native dependencies
  • packaging       platform=win32 arch=ia32 electron=32.1.2 appOutDir=dist-electron\win-ia32-unpacked
  • updating asar integrity executable resource  executablePath=D:\safecoinledger-new\FE\dist-electron\win-ia32-unpacked\Safe Coin Ledger.exe
  • building        target=nsis file=dist-electron\Safe Coin Ledger Setup 0.1.0.exe archs=x64, ia32 oneClick=false perMachine=false
  • building block map  blockMapFile=dist-electron\Safe Coin Ledger Setup 0.1.0.exe.blockmap

D:\safecoinledger-new\FE>