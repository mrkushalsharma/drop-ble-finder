const { Schema, model } = require('mongoose')

const TagSchema = new Schema({
    tagId: {
        type: String,
        required: true
    },
    apMac: {
        type: String,
        required: true
    },
    rssi: {
        type: String,
        required: true
    },
    lastPacketAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    }
});

const Tag = model('Tag', TagSchema)

module.exports = Tag;