
> Open this page at [https://devegied.github.io/pxt-fingerprint-as608/](https://devegied.github.io/pxt-fingerprint-as608/)

# Fingerprint scanner

Makecode extension for Fingerprint scanner based on AS608 chip.

![](icon.png)

I think there are several scanners based on AS608 chip with different firmware and they support different command sets. I got mine from [AliExpress](https://www.aliexpress.com/wholesale?catId=0&SearchText=FPM10A) for 5.5€ and it supports relatively wide command set.

Scanner also works with [Adafruit libraries](https://learn.adafruit.com/adafruit-optical-fingerprint-sensor/) but after a lot of searching on Google for "光学指纹模块 用户手册" (*Optical Fingerprint Module User Manual* in Chinese) I found PDF document with `AutoLogin` and `AutoSearch` commands which combines 7 and 3 basic commands respectively and makes this device more accessible to beginners.

## Using fingerprint scanner with microbit

**Important**: Acording to [micro:bit hardware specifications](https://tech.microbit.org/hardware/powersupply/) when v1 board is powered over USB it can provide only 90mA current for connected devices.
Peek usage current of fingerprint scanner based on AS608 chip can reach 130mA and it means it can not be safely used with v1 board powered over USB.
Micro:bit v2 board can provide up to 270mA current for external devices when powered over USB and it means it can be safely used with fingerprint scanner.

## Use as Extension

In your micro:bit [Makecode](https://makecode.microbit.org/) project click on **Extensions** under the gearwheel menu or in toolbox,
search for **devegied/pxt-fingerprint-as608** and import it.

## Simple API

```package
FingerprintAS608=github:devegied/pxt-fingerprint-as608
```
```sig
FingerprintAS608.init(SerialPin.P1, SerialPin.P2, FingerprintAS608.InitCmds.VerifyPasswordAndBacklightOff)
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
FingerprintAS608.init(SerialPin.P1, SerialPin.P2, FingerprintAS608.InitCmds.VerifyPasswordAndBacklightOff)
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

<script src="https://devegied.github.io/makecode-devegied-gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>