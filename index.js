const dgram = require("dgram"),
    express = require("express"),
    app = express(),
    socket = dgram.createSocket('udp4'),
    config = require('./config'),
    path = require("path"),
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


app.get("/filter-tags", (req, res) => {
    try {
      const { maxRssi } = req.query;
  
      if (!maxRssi) {
        return res.status(400).json({ error: "maxRssi query parameter is required" });
      }
  
      const maxRssiValue = parseFloat(maxRssi);
      if (isNaN(maxRssiValue)) {
        return res.status(400).json({ error: "maxRssi must be a valid number" });
      }
  
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const database = readDatabase();
  
      // Filter data
      const filteredTags = database.filter(
        (tag) => new Date(tag.lastPacketAt) >= oneMinuteAgo && parseFloat(tag.rssi) <= maxRssiValue
      );
  
      res.status(200).json(filteredTags);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to filter tags" });
    }
  });

app.listen(config.PORT, () => {
    console.log(`Server running at http://localhost:${config.PORT}`);
});
