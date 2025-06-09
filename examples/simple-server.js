const { createServer } = require('http');
const { Server } = require('socket.io');
const createAdapter = require('../index');

const httpServer = createServer();

const io = new Server(httpServer);

io.adapter(createAdapter('amqp://guest:guest@localhost:5672'));

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  socket.on('message', (msg) => {
    console.log('Received message:', msg);
    io.emit('message', msg); // broadcast
  });
});

httpServer.listen(3000, () => {
  console.log('Socket.IO server listening on port 3000');
});
