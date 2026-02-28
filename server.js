const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, 'public');
const scenariosPath = path.join(__dirname, 'content', 'scenarios.json');

app.use(express.static(publicDir));

app.get('/api/scenarios', async (_req, res) => {
  try {
    const raw = await fs.readFile(scenariosPath, 'utf8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load scenarios.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ProtectCard running on http://localhost:${PORT}`);
});
