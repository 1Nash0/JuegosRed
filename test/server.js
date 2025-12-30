import express from 'express';
const app = express();
app.use(express.json());

const messages = [];

// Endpoint POST para crear un mensaje
app.post('/messages', (req, res) => {
  const { text, author } = req.body;
  const newMessage = {
    id: Date.now(), text, author,
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  res.status(201).json(newMessage);
});

app.get('/messages', (req, res) => {
    res.json(messages);
});

const connectedUsers = new Map();
const TIMEOUT = 5000; // 5 segundos

app.get('/connected', (req, res) => {
const ip = req.ip || req.connection.remoteAddress;
// Update this user's last seen time
connectedUsers.set(ip, Date.now());
res.json({
connected: connectedUsers.size
});
});

setInterval(() => {
// Aqui recorrer connectedUsers y borrar aquellos cuya ultima conexión sea hace X tiempo},
  const now = Date.now();
  for (const [ip, lastSeen] of connectedUsers) {
    if (now - lastSeen > TIMEOUT) {
      connectedUsers.delete(ip);
    }
  }
}, 2000);

app.listen(3000, () => {// Puerto cambiado a 3000
  console.log('Servidor en http://localhost:3000');
});