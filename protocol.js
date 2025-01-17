var nack_reason=["","timeout","sequence already match","cancelled","invalid params","command unsupported","invalid mode","","","",];

function parseMessage(message, remote) {
    let ch = message.readUInt8(message.length - 1);
    let rssi = (message.readUInt16LE(message.length - 3) - 65535);
    let cmd = message.readUInt8(7);
    let seqId = message.readUInt8(0).toString(16);
    let newSeqId = (message.readUInt8(0) + 1).toString(16);
    let data = null;
    if(cmd == 0x21){
        cmd = "BEACON";
    }
    if(cmd == 0x20){
        cmd = "SYNC";
    }
    if(cmd == 0x00){
        cmd = "ACK";
    }
    if(cmd == 0x01){
        cmd = "NACK";
        data = nack_reason[message.readUInt8(8)];
    }
    if(ch > 39 || ch < 37){
        ch = 0;
        rssi = (message.readUInt16LE(message.length - 2) - 65535);
    }
    return {
        address: remote.address,
        port: remote.port,
        message: message.toString('hex'),
        seqId: ("0" + seqId).slice(-2),
        newSeqId: ("0" + newSeqId).slice(-2),
        cmd: cmd,
        ch : ch,
        tagAddress: message.readUInt16LE(5).toString(16) + message.readUInt32LE(1).toString(16),
        rssi: rssi,
        status: message.readUInt8(8),
        batt: parseInt(message.readUInt8(9)) / 10.00,
        data
    }
}


module.exports = {
    parseMessage: parseMessage,
};