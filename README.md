# socket.io-rabbitmq

A production-ready RabbitMQ adapter for Socket.IO, enabling scalable real-time communication using RabbitMQ as a message broker.

## Features

- **Scalable Messaging**: Utilizes RabbitMQ’s topic-based routing for efficient message broadcasting across multiple Socket.IO servers.
- **Production-Ready**: Includes robust connection retry logic, error handling, and connection management.
- **Room Support**: Seamlessly handles Socket.IO rooms and namespaces with RabbitMQ queues.
- **Drop-In Compatibility**: Works as a direct replacement for adapters like `socket.io-redis`.
- **Modular Design**: Clean, maintainable code with minimal dependencies.

## Installation

Install the package via npm:

```bash
npm install socket.io-rabbitmq
```

Ensure a RabbitMQ server is running. You can set one up locally or use a cloud provider like [CloudAMQP](https://www.cloudamqp.com/).

## Usage

### Basic Setup

Integrate the adapter into your Socket.IO server:

```javascript
const { Server } = require('socket.io');
const createAdapter = require('socket.io-rabbitmq');

const io = new Server(3000);
const rabbitmqAdapter = createAdapter('amqp://localhost', {
  prefix: 'socket.io', // Optional: prefix for exchange names
  channelSeparator: '#', // Optional: separator for routing keys
  maxRetries: 10, // Optional: retry attempts for RabbitMQ connection
  retryDelay: 3000, // Optional: delay between retries (ms)
});

io.adapter(rabbitmqAdapter);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a room
  socket.join('my-room');

  // Broadcast to a room
  io.to('my-room').emit('message', 'Hello, room!');

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

### Configuration Options

Customize the adapter with the following options:

| Option            | Type   | Default                   | Description                                      |
|-------------------|--------|---------------------------|--------------------------------------------------|
| `uri`             | String | -                         | RabbitMQ connection URI (e.g., `amqp://localhost`) |
| `prefix`          | String | `socket.io`               | Prefix for RabbitMQ exchange names              |
| `channelSeparator`| String | `#`                       | Separator for routing keys                      |
| `maxRetries`      | Number | `10`                      | Maximum connection retry attempts               |
| `retryDelay`      | Number | `3000`                    | Delay between retries (ms)                      |
| `serverId`        | String | `<hostname>-<pid>-<time>` | Unique server identifier                         |

Example with custom options:

```javascript
const rabbitmqAdapter = createAdapter('amqp://user:pass@host:5672', {
  prefix: 'myapp',
  channelSeparator: '.',
  maxRetries: 5,
  retryDelay: 5000,
});
io.adapter(rabbitmqAdapter);
```

### Running with Docker

To run RabbitMQ locally with Docker:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

Access the RabbitMQ management UI at `http://localhost:15672` (default credentials: `guest`/`guest`).

### Testing

Run the test suite using Mocha:

```bash
npm test
```

Tests use `mocha`, `chai`, `sinon`, and `socket.io-client`. Ensure your RabbitMQ server is running before testing.

## How It Works

The adapter connects Socket.IO with RabbitMQ by:

1. **Connection Management**: Establishes a reliable RabbitMQ connection with retry logic using `amqplib`.
2. **Exchange Setup**: Creates a topic exchange per Socket.IO namespace for broadcasts and room events.
3. **Queue Binding**: Binds server-specific queues to handle broadcast, room, and disconnect events.
4. **Message Routing**: Uses topic-based routing keys (e.g., `room.my-room.join`, `broadcast.all`) for efficient message delivery.
5. **Event Handling**: Processes incoming messages to trigger Socket.IO events like `join-room`, `leave-room`, and `disconnect`.

This ensures seamless communication across distributed Socket.IO servers.

## Why RabbitMQ?

Compared to `socket.io-redis`, this adapter offers:

- **Topic-Based Routing**: Fine-grained message delivery control.
- **Message Durability**: Configurable persistent messaging for reliability.
- **Scalability**: Handles large-scale deployments with RabbitMQ’s queuing system.
- **Flexibility**: Supports complex messaging patterns.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -m 'Add my feature'`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a pull request.

Include tests for new features and follow the [code style](https://github.com/FarzamAhmed48/socket.io-rabbitmq/blob/main/.eslintrc.json).

## Issues

Report bugs or request features on the [GitHub repository](https://github.com/FarzamAhmed48/socket.io-rabbitmq).

## License

[MIT License](LICENSE)

## Author

- Farzam Ahmed ([GitHub](https://github.com/FarzamAhmed48))

---

Build scalable real-time apps with Socket.IO and RabbitMQ! 🚀