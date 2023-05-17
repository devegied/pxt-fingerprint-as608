// tests go here; this will not be compiled when this package is used as an extension.
// Tests scanner connected to micro:bit pins P12 (scanner RX) and P16 (scanner TX)
// - connects serial lines
// - sends verify password command
// - sends backlight off command
// - receives stored template number and shows it on LED matrix
// - receives stored template positions and shows first 25 as lights on LED matrix
// - on error displays sad face on LED matrix
FingerprintAS608.onEvent(FingerprintAS608.ScannerEvents.Any, function () {
  basic.showIcon(IconNames.Sad)
})
FingerprintAS608.init(SerialPin.P12, SerialPin.P16, FingerprintAS608.InitCmds.VerifyPasswordAndBacklightOff)
basic.showNumber(FingerprintAS608.getTemplateCount())
basic.pause(1000)
pos = FingerprintAS608.getTemplatePos()
basic.clearScreen()
for (let value of pos) {
    led.plot(value % 5, Math.idiv(value, 5))
}