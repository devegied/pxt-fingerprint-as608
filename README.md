
> Open this page at [https://devegied.github.io/pxt-fingerprint-as608/](https://devegied.github.io/pxt-fingerprint-as608/)

## Using fingerprint scanner with microbit

**Important**: Acording to [micro:bit hardware specifications](https://tech.microbit.org/hardware/powersupply/) when v1 board is powered over USB it can provide only 90mA current for connected devices.
Peek usage current of fingerprint scanner based on AS608 chip can reach 130mA and it means it can not be safely used with v1 board powered over USB.
Micro:bit v2 board can provide up to 270mA current for external devices when powered over USB and it means it can be safely used with fingerprint scanner.

## Use as Extension

This repository can be added as an **extension** in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **New Project** or open existing project
* click on **Extensions** under the gearwheel menu or in toolbox
* search for **devegied/pxt-fingerprint-as608** and import

## Edit this project

To edit this repository in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **Import** then click on **Import URL**
* paste **https://github.com/devegied/pxt-fingerprint-as608** and click import

## Simple API

```package
FingerprintAS608=github:devegied/pxt-fingerprint-as608
```
```sig
FingerprintAS608.init(SerialPin.P1, SerialPin.P2)
```
Connect to fingerprint scanner on indicated pins and do selected operations
  - txpin microbit pin where scanner RX pin is connected, eg: SerialPin.P1
  - rxpin microbit pin where scanner TX pin is connected, eg: SerialPin.P2
  - doCommands operations done after connection is established, eg: FingerprintAS608.InitCmds.VerifyPassword



## Blocks preview

This image shows the blocks code from the last commit in master.
This image may take a few minutes to refresh.

![A rendered view of the blocks](https://github.com/devegied/pxt-fingerprint-as608/raw/master/.github/makecode/blocks.png)

```cards
FingerprintAS608.init(SerialPin.P1, SerialPin.P2)
FingerprintAS608.onEvent(FingerprintAS608.ScannerEvents.Any, () => {

})
FingerprintAS608.autoEnroll(1)
FingerprintAS608.autoSearch()

FingerprintAS608.setLight(false)
FingerprintAS608.getTemplateCount()
FingerprintAS608.getTemplatePos()
FingerprintAS608.genImg()
FingerprintAS608.img2Tz(FingerprintAS608.Slots.CharBuffer1)
FingerprintAS608.regModel()
FingerprintAS608.store(2)
FingerprintAS608.delTempl(2)
FingerprintAS608.search(FingerprintAS608.Slots.CharBuffer1)
FingerprintAS608.fastSearch(FingerprintAS608.Slots.CharBuffer1)
FingerprintAS608.commScanner([0x50])
FingerprintAS608.fingerprintResp()
FingerprintAS608.getParameters()
```

## License  

Licensed under the MIT License (MIT). See LICENSE file for more details.

Copyright (c) 2023, devegied

#### Metadata (used for search, rendering)

* for PXT/microbit
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
