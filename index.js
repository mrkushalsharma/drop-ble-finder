const dgram = require("dgram"),
    express = require("express"),
    app = express(),
    socket = dgram.createSocket('udp4'),
    config = require('./config'),
    path = require("path"),
    fs = require("fs"),
    protocol = require("./protocol");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

const DATABASE_PATH = path.join(__dirname, "database.json");

function readDatabase() {
    if (!fs.existsSync(DATABASE_PATH)) {
        fs.writeFileSync(DATABASE_PATH, JSON.stringify([])); // Create file if it doesn't exist
    }
    const data = fs.readFileSync(DATABASE_PATH, "utf-8");
    return JSON.parse(data);
}

// Helper function to write data to the file
function writeDatabase(data) {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(data, null, 2)); // Pretty print JSON
}

socket.on('listening', () => {
    const addr = socket.address();
    console.log(`Listening for UDP at ${addr.address}:${addr.port}`);
});

socket.on('error', (err) => {
    console.error(`UDP Error: ${err.stack}`);
});

socket.on('message', async (msg, rinfo) => {
    try {
        // Parse incoming message
        const parsed = protocol.parseMessage(msg, rinfo);

        // Filter by tag address
        if (parsed.tagAddress.startsWith("2034")) {
            const payload = {
                tagId: parsed.tagAddress,
                apMac: parsed.address,
                rssi: parsed.rssi,
            };

            // Read current database
            const database = readDatabase();
            const currentTime = new Date();

            // Check if tag exists
            const existingTag = database.find((tag) => tag.tagId === payload.tagId);

            if (existingTag) {
                // Update existing tag
                existingTag.apMac = payload.apMac;
                existingTag.rssi = payload.rssi;
                existingTag.lastPacketAt = currentTime.toISOString();
            } else {
                // Add new tag
                database.push({
                    ...payload,
                    lastPacketAt: currentTime.toISOString(),
                    createdAt: currentTime.toISOString(),
                });
            }

            // Write updated database
            writeDatabase(database);

            console.log(`Tag saved/updated: ${JSON.stringify(payload)}`);
        }
    } catch (error) {
        console.error("Error handling UDP message:", error);
    }
});

socket.bind(config.UDP_PORT);


// Endpoint to get filtered data
app.get("/filter-tags", (req, res) => {
    const { seconds, maxRssi } = req.query;
    const timeLimit = seconds ? parseInt(seconds, 10) : 60; // Default to last 60 seconds
    const maxRssiLimit = maxRssi ? parseFloat(maxRssi) : Infinity; // Default to no RSSI limit
    const currentTime = Date.now();
    const database = readDatabase();

    const filteredData = database.filter((record) => {
        const recordTime = new Date(record.lastPacketAt).getTime();
        return (
            currentTime - recordTime <= timeLimit * 1000 &&
            parseFloat(record.rssi) <= maxRssiLimit
        );
    });

    res.json({ filtered: filteredData, all: database });
});

// Endpoint to clear all records
app.delete("/clear-records", (req, res) => {
    writeDatabase([]);
    res.json({ message: "All records cleared." });
});


app.listen(config.PORT, () => {
    console.log(`Server running at http://localhost:${config.PORT}`);
});
