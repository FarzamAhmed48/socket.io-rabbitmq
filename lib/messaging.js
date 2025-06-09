class RabbitMessaging {
  constructor(channel, exchangeName) {
    this.channel = channel;
    this.exchange = exchangeName;
  }

  async setupExchange() {
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
  }

  async publish(routingKey, message) {
    return this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: false }
    );
  }

  async assertQueue(queueName, options = {}) {
    return this.channel.assertQueue(queueName, options);
  }

  async bindQueue(queue, pattern) {
    await this.channel.bindQueue(queue, this.exchange, pattern);
  }

  async consume(queue, callback) {
    await this.channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel.ack(msg);
        } catch (e) {
          console.error('Message processing failed', e);
          this.channel.nack(msg, false, false);
        }
      }
    });
  }
}

module.exports = RabbitMessaging;
