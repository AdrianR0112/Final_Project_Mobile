require('dotenv').config({ override: true });

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { setIO } = require('./sockets/io');
const setupSocket = require('./sockets/socket');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

setIO(io);
setupSocket(io);

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
