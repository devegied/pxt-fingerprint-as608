/**
 * Makecode extension for Fingerprint scanner (AS608)
 * Copyright (C): 2023, devegied
 */
//% color=#8C644D weight=20 icon="\uf0a6"  block="Fingerprint"
namespace FingerprintAS608 {
    const enum PID {
        CMD = 0x01,
        DATA = 0x02,
        ACK = 0x07,
        EoD = 0x08
    }
    /**
     * Initial commands run after connection to the scanner
     */
    export const enum InitCmds {
        //% block="do nothing"
        Nothing = 0,
        //% block="handshake"
        Handshake = 1,
        //% block="verify password"
        VerifyPassword = 2,
        //% block="handshake & verify password"
        HandshakeAndVerifyPassword = 3,
        //% block="turn backlight off"
        BacklightOff = 4,
        //% block="handshake & turn backlight off"
        HandshakeAndBacklightOff = 5,
        //% block="verify password & turn backlight off"
        VerifyPasswordAndBacklightOff = 6,
        //% block="handshake & verify password & turn backlight off"
        HandshakeAndVerifyPasswordAndBacklightOff = 7
    }
    /**
     * Fingerprint characteristic storage slot
     */
    export const enum Slots {
        //% block="CharBuffer1"
        CharBuffer1 = 1,
        //% block="CharBuffer2"
        CharBuffer2 = 2
    }
    const enum _ScannerEvents {
        CommunicationError = 0b0000000000000001,
        FingerNotDetected = 0b0000000000000010,
        NotAFingerprint = 0b0000000000000100,
        NotTheSame = 0b0000000000001000,
        SaveFailed = 0b0000000000010000,
        AlreadyRegistered = 0b0000000000100000,
        NotFound = 0b0000000001000000,
        DirtyScanner = 0b0000000010000000,
        DeleteFailed = 0b0000000100000000
    }
    export const enum ScannerEvents {
        //% block="Communication Error"
        CommunicationError = 0b0000000000000001,
        //% block="Finger not detected on scanner"
        FingerNotDetected = 0b0000000000000010,
        //% block="Not a fingerprint"
        NotAFingerprint = 0b0000000000000100,
        //% block="Not the same finger"
        NotTheSame = 0b0000000000001000,
        //% block="Save to library failed"
        SaveFailed = 0b0000000000010000,
        //% block="Finger already registered"
        AlreadyRegistered = 0b0000000000100000,
        //% block="Matching fingerprint not found"
        NotFound = 0b0000000001000000,
        //% block="Dirty scanner"
        DirtyScanner = 0b0000000010000000,
        //% block="Delete from library failed"
        DeleteFailed = 0b0000000100000000,
        //% block="Any error"
        Any = 0b0000000111111111,
    }
    /**
     * Parameters from the scanner
     */
    export const enum ScannerParameters {
        //% block="Status register"
        statusRegister,
        //% block="System identifier code"
        systemIdentifier,
        //% block="Finger library size"
        librarySize,
        //% block="Security level"
        securityLevel,
        //% block="Device address"
        deviceAddress,
        //% block="Data packet size code"
        dataPacketSize,
        //% block="Baud rate code"
        serialBaudRate
    }
    export interface Parameters {
        statusRegister: uint16; //Status register
        systemIdentifier: uint16;//System identifier code
        librarySize: uint16;//Finger library size
        securityLevel: uint16;//Security level
        deviceAddress: uint32;//Device address
        dataPacketSize: uint16;//Data packet size
        serialBaudRate: uint16;//Baud settings
    }
    class EventHandler {
        event: ScannerEvents;
        handler: () => void;
        constructor(event: ScannerEvents, handler: () => void) {
            this.event = event
            this.handler = handler
        }
        onEvent(event: _ScannerEvents) {
            if ((event & this.event) !== 0)
                control.runInParallel(this.handler)
        }
    }
    //Hardcoded communication parameters
    let address: number = 0xFFFFFFFF
    let password: number = 0x00000000
    const pauseMS: number = 200
    //Scanner parameters
    let scannerParameters: Parameters
    //Last response buffer
    let respBuf: Buffer = null
    //Registered event handlers
    let eventHandlers: EventHandler[] = [];
    function propagateEvent(event: _ScannerEvents) {
        eventHandlers.forEach((th) => { th.onEvent(event) })
    }
    /**
     * Execute commands when scanner error event occurs
     * @param event to be checked, eg: ScannerEvents.CommunicationError
     * @param handler code to run when the event is raised
     */
    //% blockId=FingerprintAS608_on_event
    //% block="on $event"
    //% event.fieldEditor="gridpicker" event.fieldOptions.columns=2
    //% event.fieldOptions.tooltips="true"
    //% weight=65
    export function onEvent(event: ScannerEvents, handler: () => void) {
        eventHandlers.push(new EventHandler(event, handler))
    }
    /**
     * Packs and sends package identifier and array of package data bytes
     * @param pid package identifier
     * @param data package data bytes as number array
     */
    function packAndSend(pid: PID = PID.CMD, data: number[]): void {
        let cmd_buf = pins.createBuffer(11 + data.length)
        cmd_buf.setNumber(NumberFormat.UInt16BE, 0, 0xEF01) //Header
        cmd_buf.setNumber(NumberFormat.UInt32BE, 2, address)
        cmd_buf[6] = pid //Package identifier
        let csum: number = cmd_buf[6]
        cmd_buf.setNumber(NumberFormat.UInt16BE, 7, data.length + 2) //Package length
        csum += cmd_buf[7] + cmd_buf[8]
        let pos = 9
        for (const el of data) {
            cmd_buf[pos] = el //Package contents
            csum += cmd_buf[pos]
            pos++
        }
        cmd_buf.setNumber(NumberFormat.UInt16BE, pos, csum & 0xFFFF) //Package checksum
        serial.writeBuffer(cmd_buf)
    }
    /**
     * Receives answer from scanner
     * returns true when response from scanner is received, false on timeout or unknown response
     * @param timeout time in miliseconds to wait for first available byte from scanner
     */
    function receive(timeout: number = 1000): boolean {
        let received: Buffer
        let timer = 0
        function readByte(): uint8 {
            if (received && received.length > 0) {// there still are bytes in buffer
                let rv = received[0]
                received = received.slice(1)
                return rv
            } else
                return serial.readBuffer(1)[0]//will block until at least 1 byte available
        }
        while (true) {
            received = serial.readBuffer(0)//will not block
            if (received.length > 0)
                break
            basic.pause(1)
            if ((++timer) >= timeout)
                return false
        }
        respBuf = control.createBuffer(12)//smallest response
        respBuf[0] = readByte()
        if (respBuf[0] != 0xEF) return false;
        respBuf[1] = readByte()
        if (respBuf[1] != 0x01) return false;
        respBuf[2] = readByte()
        respBuf[3] = readByte()
        respBuf[4] = readByte()
        respBuf[5] = readByte()
        if (respBuf.getNumber(NumberFormat.UInt32BE, 2) != address) return false;
        respBuf[6] = readByte()
        respBuf[7] = readByte()
        respBuf[8] = readByte()
        let remaining = respBuf.getNumber(NumberFormat.UInt16BE, 7)
        let got = 0
        if (remaining > 3)//extend the buffer
            respBuf = respBuf.concat(control.createBuffer(remaining - 3))
        while (remaining > got)
            respBuf[9 + got++] = readByte()
        return true
    }

    /**
     * Connect to fingerprint scanner on indicated pins and do selected operations
     * @param txpin microbit pin where scanner RX pin is connected
     * @param rxpin microbit pin where scanner TX pin is connected
     * @param doCommands operations done after connection is established
     */
    //% blockId=FingerprintAS608_init block="Connect scanner RX to $txpin, TX to $rxpin|| and $doCommands"
    //% weight=100
    //% txpin.fieldEditor="gridpicker" txpin.fieldOptions.columns=5
    //% rxpin.fieldEditor="gridpicker" rxpin.fieldOptions.columns=5
    //% doCommands.defl=FingerprintAS608.InitCmds.VerifyPasswordAndBacklightOff
    export function init(txpin: SerialPin, rxpin: SerialPin, doCommands?: InitCmds): void {
        if (isNaN(doCommands)) doCommands = InitCmds.VerifyPasswordAndBacklightOff //default value is only for GUI
        serial.redirect(txpin, rxpin, BaudRate.BaudRate57600)
        basic.pause(500)
        if (doCommands & InitCmds.Handshake) {
            packAndSend(PID.CMD, [0x17, 0])//Handshake
            if ((!receive())||(respBuf[9] != 0))
                propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
        }
        if (doCommands & InitCmds.VerifyPassword) {
            //Verify password with global bigendian value
            packAndSend(PID.CMD, [0x13, password & 0xFF000000 >> 24, password & 0x00FF0000 >> 16, password & 0x0000FF00 >> 8, password & 0x000000FF])
            if ((!receive())||(respBuf[9] != 0))
                propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
        }
        if (doCommands & InitCmds.BacklightOff)
            setLight(false)
        packAndSend(PID.CMD, [0x0F])//Read system Parameters
        if ((!receive())||(respBuf[9] != 0))
            propagateEvent(_ScannerEvents.CommunicationError)
        basic.pause(pauseMS)
        scannerParameters = {
            statusRegister: respBuf.getNumber(NumberFormat.UInt16BE, 10),//Status register in respBuf[10..11]
            systemIdentifier: respBuf.getNumber(NumberFormat.UInt16BE, 12),//System identifier code in respBuf[12..13]
            librarySize: respBuf.getNumber(NumberFormat.UInt16BE, 14),//Finger library size in respBuf[14..15]
            securityLevel: respBuf.getNumber(NumberFormat.UInt16BE, 16),//Security level in respBuf[16..17]
            deviceAddress: respBuf.getNumber(NumberFormat.UInt32BE, 18),//Device address in respBuf[18..21]
            dataPacketSize: respBuf.getNumber(NumberFormat.UInt16BE, 22),//Data packet size in respBuf[22..23]
            serialBaudRate: respBuf.getNumber(NumberFormat.UInt16BE, 24)//Baud settings in respBuf[24..25]
        }
    }

    /**
     * Turn scanner backlight on or off
     * @param state scanner backlight state
     */
    //% blockId=FingerprintAS608_turnlight block="Backlight $state"
    //% weight=90
    //% state.shadow="toggleOnOff" state.defl=false
    export function setLight(state: boolean): void {
        packAndSend(PID.CMD, [state ? 0x50 : 0x51])//Open/Close the fingerprint background lighting
        if ((!receive())||(respBuf[9] != 0))
            propagateEvent(_ScannerEvents.CommunicationError)
        basic.pause(pauseMS)
    }

    /**
     * Get number of fingerprint templates stored in the scanner
     * returns number of fingerprint templates stored in the scanner
     */
    //% blockId=FingerprintAS608_gettemplcount block="Stored template count"
    //% weight=80
    export function getTemplateCount(): number {
        let rv: number = -1
        packAndSend(PID.CMD, [0x1D])//Read finger template count
        if ((!receive()) || (respBuf[9] != 0))
            propagateEvent(_ScannerEvents.CommunicationError)
        else
            rv = respBuf.getNumber(NumberFormat.UInt16BE, 10)
        basic.pause(pauseMS)
        return rv
    }

    /**
     * Get storage positions of fingerprint templates in the scanner
     * returns array of fingerprint template positions in the scanner
     */
    //% blockId=FingerprintAS608_gettemplpos block="Stored template positions"
    //% weight=70
    export function getTemplatePos(): number[] {
        let rv: number[] = []
        packAndSend(PID.CMD, [0x1F, 0x00])//Read finger template positions at bank #0 - first 256 positions
        if ((!receive()) || (respBuf[9] != 0))
            propagateEvent(_ScannerEvents.CommunicationError)
        else {
            let bByte: number
            for (let b = 0; b < 32; b++) {
                bByte = respBuf[10 + b]
                for (let bit = 0; bit <= 7; bit++)
                    if (bByte & (1 << bit))
                        rv.push(b * 8 + bit)
            }
        }
        basic.pause(pauseMS)
        return rv
    }

    /**
     * Immediately detects finger and stores finger image in ImageBuffer
     * returns true if finger image stored, false on error
     */
    //% blockId=FingerprintAS608_genimg block="Scan finger"
    //% weight=100
    //% advanced = true
    export function genImg(): boolean {
        packAndSend(PID.CMD, [0x01])//collect finger image
        if (!receive()) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.FingerNotDetected)
                    return false;
            }
        }
    }
    /**
     * Generate characteristic file from scanned fingerprint in ImageBuffer
     * returns true if file generated and stored, false on error
     * @param slot to store generated file
     */
    //% blockId=FingerprintAS608_img2char block="Generate characteristic in $slot"
    //% slot.defl=FingerprintAS608.Slots.CharBuffer1
    //% weight=90
    //% advanced = true
    export function img2Tz(slot: Slots): boolean {
        packAndSend(PID.CMD, [0x02, slot])//generate character file from image
        if (!receive()) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.NotAFingerprint)
                    return false;
            }
        }
    }
    /**
     * Generate template from two stored characteristics
     * returns true if template generated and stored, false on error
     */
    //% blockId=FingerprintAS608_regmodel block="Generate template"
    //% weight=80
    //% advanced = true
    export function regModel(): boolean {
        packAndSend(PID.CMD, [0x05])//generate template
        if (!receive()) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.NotTheSame)
                    return false;
            }
        }
    }
    /**
     * Save template to permanent storage
     * returns true if template stored, false on error
     * @param position of permanent storage to store template
     */
    //% blockId=FingerprintAS608_store block="Store template to $position"
    //% weight=70
    //% advanced = true
    export function store(position: number): boolean {
        packAndSend(PID.CMD, [0x06, 0x01, (position >> 8) & 0xFF, position & 0xFF])//store template
        if (!receive()) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.SaveFailed)
                    return false;
            }
        }
    }

    /**
     * Automaticaly get 2 fingerprint scans, convert them to characteristics, 
     * make template from them and save it to permanent storage
     * returns true if template stored, false on error
     * @param position of permanent storage to store template
     */
    //% blockId=FingerprintAS608_autoenroll block="Auto enroll fingerprint to $position"
    //% weight=60
    export function autoEnroll(position: number): boolean {
        packAndSend(PID.CMD, [0x54, 0xFF, 0x02, (position >> 8) & 0xFF, position & 0xFF, 0x00])//AutoEnroll/Autologin (max wait time, two scans, do not allow to store duplicates)
        if (!receive(16000)) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        }
        if (respBuf[9] == 0x56) { //scan of first finger successfuly collected
            if (!receive(16000)) {
                propagateEvent(_ScannerEvents.CommunicationError)
                basic.pause(pauseMS)
                return false;
            }
        }
        basic.pause(pauseMS)
        switch (respBuf[9]) {
            case 0x0:
                return true;
            case 0x1:
                propagateEvent(_ScannerEvents.CommunicationError)
                return false;
            case 0x2:
                propagateEvent(_ScannerEvents.FingerNotDetected)
                return false;
            case 0x6:
            case 0x7:
                propagateEvent(_ScannerEvents.NotAFingerprint)
                return false;
            case 0xa:
                propagateEvent(_ScannerEvents.NotTheSame)
                return false;
            case 0xb:
                propagateEvent(_ScannerEvents.SaveFailed)
                return false;
            case 0x24:
                propagateEvent(_ScannerEvents.AlreadyRegistered)
                return false;
            default:
                propagateEvent(_ScannerEvents.DirtyScanner)
                return false;
        }
    }

    /**
     * Deletes template from permanent storage
     * returns true if template deleted, false on error
     * @param position of permanent storage to delete from
     */
    //% blockId=FingerprintAS608_delete block="Delete template from $position"
    //% weight=50
    export function delTempl(position: number): boolean {
        packAndSend(PID.CMD, [0x0C, (position >> 8) & 0xFF, position & 0xFF, 0x01])//delete single template
        if (!receive()) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.DeleteFailed)
                    return false;
            }
        }
    }

    /**
     * Search for matching stored template to the generated characteristic
     * returns true if match found, false on error or no match
     * @param slot to compare to
     */
    //% blockId=FingerprintAS608_search block="Search for match for characteristic in $slot"
    //% slot.defl=FingerprintAS608.Slots.CharBuffer1
    //% weight=50
    //% advanced = true
    export function search(slot: Slots): boolean {
        packAndSend(PID.CMD, [0x04, slot, 0x0, 0x0, (scannerParameters.librarySize >> 8) & 0xFF, scannerParameters.librarySize & 0xFF])//search finger library
        if (!receive()) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.NotFound)
                    return false;
            }
        }
    }

    /**
     * High speed search for matching stored template to the generated characteristic
     * returns true if match found, false on error or no match
     * @param slot to compare to
     */
    //% blockId=FingerprintAS608_fastsearch block="Fast search for match for characteristic in $slot"
    //% slot.defl=FingerprintAS608.Slots.CharBuffer1
    //% weight=40
    //% advanced = true
    export function fastSearch(slot: Slots): boolean {
        packAndSend(PID.CMD, [0x1B, slot, 0x0, 0x0, (scannerParameters.librarySize >> 8) & 0xFF, scannerParameters.librarySize & 0xFF])//search finger library
        if (!receive()) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.NotFound)
                    return false;
            }
        }
    }

    /**
     * Automatic search for matching stored template (scans fingerprint, creates characteristic, searches for match in stored templates)
     * returns true if match found, false on error or no match
     */
    //% blockId=FingerprintAS608_autosearch block="Auto search fingerprint"
    //% weight=40
    export function autoSearch(): boolean {
        packAndSend(PID.CMD, [0x55, 0xFF, 0x00, 0x00, (scannerParameters.librarySize >> 8) & 0xFF, scannerParameters.librarySize & 0xFF])//autosearch
        if (!receive(16000)) {
            propagateEvent(_ScannerEvents.CommunicationError)
            basic.pause(pauseMS)
            return false;
        } else {
            basic.pause(pauseMS)
            switch (respBuf[9]) {
                case 0x0:
                    return true;
                case 0x1:
                    propagateEvent(_ScannerEvents.CommunicationError)
                    return false;
                case 0x2:
                    propagateEvent(_ScannerEvents.FingerNotDetected)
                    return false;
                case 0x6:
                case 0x7:
                    propagateEvent(_ScannerEvents.NotAFingerprint)
                    return false;
                case 0x23:
                case 0x09:
                    propagateEvent(_ScannerEvents.NotFound)
                    return false;
                default:
                    propagateEvent(_ScannerEvents.DirtyScanner)
                    return false;
            }
        }
    }
    /**
     * Sends command and data to scanner and returns its answer as Buffer
     * @param cmdAndData command and data to send as number array
     */
    //% blockId=FingerprintAS608_comm block="Send $cmdAndData to scanner"
    //% weight=30
    //% advanced = true
    export function commScanner(cmdAndData: number[]): Buffer {
        packAndSend(PID.CMD, cmdAndData)
        receive()
        basic.pause(pauseMS)
        return respBuf
    }
    /**
     * Last response from the scanner as Buffer
     */
    //% blockId=FingerprintAS608_lastresp block="Last scanner response"
    //% weight=20
    //% advanced = true
    export function fingerprintResp(): Buffer {
        return respBuf
    }

    /**
     * Get scanner system parameter
     * @param one of the parameters
     */
    //% blockId=FingerprintAS608_getparameter block="Scanner parameter $parameter"
    //% weight=10
    //% advanced = true
    export function getParameter(parameter:ScannerParameters): number {
        switch(parameter){
            case ScannerParameters.statusRegister:
                return scannerParameters.statusRegister
            case ScannerParameters.systemIdentifier:
                return scannerParameters.systemIdentifier
            case ScannerParameters.deviceAddress:
                return scannerParameters.deviceAddress
            case ScannerParameters.librarySize:
                return scannerParameters.librarySize
            case ScannerParameters.securityLevel:
                return scannerParameters.securityLevel
            case ScannerParameters.dataPacketSize:
                return scannerParameters.dataPacketSize
            case ScannerParameters.serialBaudRate:
                return scannerParameters.serialBaudRate
            default:
                return 0
        }
        
    }
}