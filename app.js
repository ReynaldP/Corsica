const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Servir les fichiers statiques du build React
app.use(express.static(path.join(__dirname, 'build')));

// Route toutes les requêtes vers l'index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Serveur en écoute sur le port ${port}`);
});