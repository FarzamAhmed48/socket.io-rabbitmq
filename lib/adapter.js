// const { Adapter } = require('socket.io-adapter');
// const os = require('os');
// const RabbitConnection = require('./connection');
// const RabbitMessaging = require('./messaging');

// class RabbitMQAdapter extends Adapter {
//   constructor(nsp, opts = {}) {
//     super(nsp);
//     this.uri = opts.uri;
//     this.prefix = opts.prefix || 'socket.io';
//     this.channelSeparator = opts.channelSeparator || '#';
//     this.serverId = opts.serverId || `${os.hostname()}-${process.pid}-${Date.now()}`;

//     this.exchange = `${this.prefix}${this.channelSeparator}${nsp.name}`;

//     this.connectionManager = new RabbitConnection(this.uri, opts);
//     this.messaging = null;

//     this.queueName = `${this.exchange}.${this.serverId}`;

//     this.init();
//   }

//   async init() {
//     try {
//       await this.connectionManager.connect();

//       this.messaging = new RabbitMessaging(this.connectionManager.channel, this.exchange);

//       await this.messaging.setupExchange();

//       const q = await this.messaging.assertQueue(this.queueName, {
//         exclusive: false,
//         durable: false,
//         autoDelete: true,
//       });

//       // Bind queue to catch all broadcast and room events
//       await this.messaging.bindQueue(q.queue, 'broadcast.#');
//       await this.messaging.bindQueue(q.queue, 'room.#');
//       await this.messaging.bindQueue(q.queue, 'broadcast.disconnect'); // 🟡 NEW for disconnect
//       await this.messaging.consume(q.queue, this.onMessage.bind(this));

//       console.log(`[${this.serverId}] RabbitMQ Adapter initialized`);
//     } catch (err) {
//       console.error('RabbitMQ Adapter init error', err);
//     }
//   }

//   async onMessage(packet) {
//     if (packet.serverId === this.serverId) return; // ignore own messages

//     switch (packet.type) {
//       case 'broadcast':
//         super.broadcast(packet.data, packet.opts, true);
//         break;

//       case 'join-room':
//         this.emit('join-room', packet.room, packet.sid);
//         break;

//       case 'leave-room':
//         this.emit('leave-room', packet.room, packet.sid);
//         break;

//       case 'disconnect': // 🟡 NEW
//         this.emit('disconnect', packet.sid);
//         break;

//       default:
//         console.warn('Unknown packet type:', packet.type);
//     }
//   }

//   async broadcast(packet, opts, remote = false) {
//     super.broadcast(packet, opts, true);

//     if (remote) return;

//     if (!this.messaging) {
//       console.warn('Messaging not initialized, cannot publish');
//       return;
//     }

//     const routingKey = opts?.rooms?.length ? `room.${opts.rooms.join('.')}` : 'broadcast.all';

//     const message = {
//       type: 'broadcast',
//       serverId: this.serverId,
//       data: packet,
//       opts,
//       timestamp: Date.now(),
//     };

//     await this.messaging.publish(routingKey, message);
//   }

//   async add(sid, room, callback) {
//     super.add(sid, room, callback);

//     if (!this.messaging) return;

//     const message = {
//       type: 'join-room',
//       serverId: this.serverId,
//       sid,
//       room,
//       nsp: this.nsp.name,
//       timestamp: Date.now(),
//     };

//     await this.messaging.publish(`room.${room}.join`, message);
//   }

//   async del(sid, room, callback) {
//     super.del(sid, room, callback);

//     if (!this.messaging) return;

//     const message = {
//       type: 'leave-room',
//       serverId: this.serverId,
//       sid,
//       room,
//       nsp: this.nsp.name,
//       timestamp: Date.now(),
//     };

//     await this.messaging.publish(`room.${room}.leave`, message);
//   }

//   async delAll(sid) {
//     super.delAll(sid);

//     if (!this.messaging) return;

//     const message = {
//       type: 'disconnect',
//       serverId: this.serverId,
//       sid,
//       timestamp: Date.now(),
//     };

//     await this.messaging.publish(`broadcast.disconnect`, message);
//   }

//   async close() {
//     await this.connectionManager.close();
//   }
// }

// module.exports = RabbitMQAdapter;


const { Adapter } = require('socket.io-adapter');
const os = require('os');
const RabbitConnection = require('./connection');
const RabbitMessaging = require('./messaging');

class RabbitMQAdapter extends Adapter {
  constructor(nsp, opts = {}) {
    super(nsp);
    this.uri = opts.uri;
    this.prefix = opts.prefix || 'socket.io';
    this.channelSeparator = opts.channelSeparator || '#';
    this.serverId = opts.serverId || `${os.hostname()}-${process.pid}-${Date.now()}`;

    this.exchange = `${this.prefix}${this.channelSeparator}${nsp.name}`;

    this.connectionManager = new RabbitConnection(this.uri, opts);
    this.messaging = null;

    this.queueName = `${this.exchange}.${this.serverId}`;

    this.init();
  }

  async init() {
    try {
      await this.connectionManager.connect();

      this.messaging = new RabbitMessaging(this.connectionManager.channel, this.exchange);

      await this.messaging.setupExchange();

      const q = await this.messaging.assertQueue(this.queueName, {
        exclusive: false,
        durable: false,
        autoDelete: true,
      });

      // Bind queue to catch all broadcast and room events
      await this.messaging.bindQueue(q.queue, 'broadcast.#');
      await this.messaging.bindQueue(q.queue, 'room.#');
      await this.messaging.bindQueue(q.queue, 'broadcast.disconnect'); // 🟡 NEW for disconnect
      await this.messaging.consume(q.queue, this.onMessage.bind(this));

      console.log(`[${this.serverId}] RabbitMQ Adapter initialized`);
    } catch (err) {
      console.error('RabbitMQ Adapter init error', err);
    }
  }

  async onMessage(packet) {
    if (packet.serverId === this.serverId) return; // ignore own messages

    switch (packet.type) {
      case 'broadcast':
        const opts = {
          rooms: new Set(packet.opts.rooms),
          except: new Set(packet.opts.except),
          remote: true, // Mark this as a remote message
        };
        this.broadcast(packet.data, opts);
        break;

      case 'join-room':
        this.emit('join-room', packet.room, packet.sid);
        break;

      case 'leave-room':
        this.emit('leave-room', packet.room, packet.sid);
        break;

      case 'disconnect': // 🟡 NEW
        this.emit('disconnect', packet.sid);
        break;

      default:
        console.warn('Unknown packet type:', packet.type);
    }
  }

  // in adapter.js

  async broadcast(packet, opts) {
    // Always broadcast to the local clients first.
    // The base adapter handles filtering by rooms.
    super.broadcast(packet, opts);

    // If the 'remote' flag is set, it means this message came from RabbitMQ.
    // We have already broadcasted it locally above, so we should not publish it again.
    if (opts.remote) {
      return;
    }

    if (!this.messaging) {
      console.warn('Messaging not initialized, cannot publish');
      return;
    }

    // Determine the routing key for RabbitMQ.
    const routingKey = opts.rooms.size > 0 ? `room.${[...opts.rooms].join('.')}` : 'broadcast.all';

    // Prepare the message for other server instances.
    // We convert Sets to Arrays because they don't serialize to JSON well.
    const message = {
      type: 'broadcast',
      serverId: this.serverId,
      data: packet,
      opts: {
        rooms: [...opts.rooms],
        except: [...opts.except],
      },
      timestamp: Date.now(),
    };

    // Publish the message to RabbitMQ for other servers.
    await this.messaging.publish(routingKey, message);
  }

  async add(sid, room, callback) {
    super.add(sid, room, callback);

    if (!this.messaging) return;

    const message = {
      type: 'join-room',
      serverId: this.serverId,
      sid,
      room,
      nsp: this.nsp.name,
      timestamp: Date.now(),
    };

    await this.messaging.publish(`room.${room}.join`, message);
  }

  async del(sid, room, callback) {
    super.del(sid, room, callback);

    if (!this.messaging) return;

    const message = {
      type: 'leave-room',
      serverId: this.serverId,
      sid,
      room,
      nsp: this.nsp.name,
      timestamp: Date.now(),
    };

    await this.messaging.publish(`room.${room}.leave`, message);
  }

  async delAll(sid) {
    super.delAll(sid);

    if (!this.messaging) return;

    const message = {
      type: 'disconnect',
      serverId: this.serverId,
      sid,
      timestamp: Date.now(),
    };

    await this.messaging.publish(`broadcast.disconnect`, message);
  }

  async close() {
    await this.connectionManager.close();
  }
}

module.exports = RabbitMQAdapter;
