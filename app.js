// server.js
// Express backend: accept orderNumber + image, save locally in uploads/, then post image URL to Google Sheets via Apps Script Web‑App

// Install dependencies:
// npm install express multer axios

const express = require("express");
const path = require("path");
const multer = require("multer");
const axios = require("axios");

const app = express();

// Set up multer disk storage to save uploads in ./uploads
const uploadDir = path.join(__dirname, "uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // preserve original name or add timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Serve static files from uploads folder at /files
app.use('/files', express.static(uploadDir));

// Replace with your Apps Script Web App URL
targetSheetUrl =
  "https://script.google.com/macros/s/AKfycbzpVKQlv1A5LiCQ7tV9Io17LmNLO9dpihrzDHDdfdiTRs5R5MilSO4Og4tjiTvyKqf-/exec";

// Endpoint: POST /attach
// multipart/form-data: fields: orderNumber, image (file)
app.post("/attach", upload.single("image"), async (req, res) => {
  try {
    const { orderNumber } = req.body;
    const file = req.file;

    if (!orderNumber || !file) {
      return res.status(400).json({ error: "orderNumber and image file are required." });
    }

    // Construct public URL for saved file
    const imageUrl = `${req.protocol}://${req.get('host')}/files/${file.filename}`;

    // POST to the Apps Script Web App
    const sheetResp = await axios.post(targetSheetUrl, { orderNumber, imageUrl });
    const data = sheetResp.data;
    if (!data.ok) {
      return res.status(404).json({ error: data.error || "Order not found on sheet" });
    }

    res.json({ ok: true, message: `Image saved and attached to order ${orderNumber}`, imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: GET route to list uploaded files
app.get('/files', (req, res) => {
  const fs = require('fs');
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot list files' });
    // return array of URLs
    const list = files.map(name => `${req.protocol}://${req.get('host')}/files/${name}`);
    res.json(list);
  });
});

const PORT = process.env.PORT || 3025;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
