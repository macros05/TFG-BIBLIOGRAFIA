const express = require('express');
const path = require('path');
const app = express();

const DIST_FOLDER = path.join(__dirname, 'dist/tecno-ambiente/browser');  // Cambia esta ruta si es necesario

app.use(express.static(DIST_FOLDER));

// Redirigir TODAS las rutas a index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_FOLDER, 'index.html'));
});

const PORT = process.env.PORT || 4200;  // Cambia el puerto si lo necesitas
app.listen(PORT, () => {
  console.log(`Servidor Angular en http://0.0.0.0:${PORT}`);
});
