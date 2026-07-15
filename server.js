const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'dashboard.json');
const SEED_FILE = path.join(__dirname, 'data', 'seed.json');

app.use(express.json({ limit: '5mb' }));

// Friendly URL for the read-only client link (must come before static middleware)
app.get('/client', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// Make sure a working data file exists (copy from seed on first boot)
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = fs.readFileSync(SEED_FILE, 'utf-8');
    fs.writeFileSync(DATA_FILE, seed);
  }
}
ensureDataFile();

// GET current dashboard data
app.get('/api/data', (req, res) => {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  res.json(JSON.parse(raw));
});

// SAVE dashboard data
app.post('/api/data', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to save' });
  }
});

// RESET to original seed content
app.post('/api/reset', (req, res) => {
  try {
    const seed = fs.readFileSync(SEED_FILE, 'utf-8');
    fs.writeFileSync(DATA_FILE, seed);
    res.json({ ok: true, data: JSON.parse(seed) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to reset' });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard running on port ${PORT}`);
});
