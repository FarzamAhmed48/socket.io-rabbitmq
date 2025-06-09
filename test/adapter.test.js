const io = require('socket.io')();
const createAdapter = require('../index'); // your package entry point

io.adapter(createAdapter('your connection url here!'));

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.join('room1');
  io.to('room1').emit('message', 'Hello room1!');
});

io.listen(3000);
console.log('Server listening on port 3000');
