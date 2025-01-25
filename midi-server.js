// server.js
const express = require('express');
const path = require('path');

// Get port from command line arguments, default to 3000 if not provided
const port = process.argv[2] || 3000;

const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`MIDI Player server running at http://localhost:${port}`);
    console.log(`Directory being served: ${__dirname}`);
});
