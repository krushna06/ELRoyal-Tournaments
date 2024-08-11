const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3003;

app.use(express.json());

app.get('/api/v1/tournaments', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'tournaments.json');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading file');
      return;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
