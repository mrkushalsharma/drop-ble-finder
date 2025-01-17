const dgram = require("dgram"),
    express = require("express"),
    app = express(),
    socket = dgram.createSocket('udp4'),
    config = require('./config'),
    mongoose = require('./dbConnection'),
    protocol = require("./protocol"),
    Tag = require('./model/Tag');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));


socket.on('listening', () => {
    const addr = socket.address();
    console.log(`Listening for UDP at ${addr.address}:${addr.port}`);
});

socket.on('error', (err) => {
    console.error(`UDP Error: ${err.stack}`);
});

socket.on('message', async(msg, rinfo) => {
    const parsed = protocol.parseMessage(msg, rinfo);
    if (parsed.tagAddress.startsWith('2034')) {
        const payload = {
            apMac: parsed.address,
            tagId: parsed.tagAddress,
            rssi: parsed.rssi,
            lastPacketAt: new Date(),
            createdAt: new Date()
        };
        await Tag.findOneAndUpdate(
            { tagId: payload.tagId }, // Match based on tagId
            {
                $set: {
                    apMac: payload.apMac,
                    rssi: payload.rssi,
                    lastPacketAt: payload.lastPacketAt,
                },
                $setOnInsert: {
                    createdAt: payload.createdAt,
                },
            },
            { upsert: true, new: true } // Create if not exists, return updated document
        );
    }
});

socket.bind(config.UDP_PORT);


app.get('/filter-tags', async (req, res) => {
    try {
        const { maxRssi } = req.query; // Get max RSSI filter from query params

        if (!maxRssi) {
            return res.status(400).json({ error: "maxRssi query parameter is required" });
        }

        const maxRssiValue = parseFloat(maxRssi); // Convert maxRssi to a number
        if (isNaN(maxRssiValue)) {
            return res.status(400).json({ error: "maxRssi must be a valid number" });
        }

        // Calculate the timestamp for 1 minute ago
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

        // Query the database
        const tags = await Tag.find({
            lastPacketAt: { $gte: oneMinuteAgo }, // Records from the last 1 minute
            rssi: { $lte: maxRssiValue }         // RSSI less than or equal to maxRssi
        });

        res.status(200).json(tags);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while filtering tags" });
    }
});

app.listen(config.PORT, () => {
    console.log(`Server running at http://localhost:${config.PORT}`);
});
