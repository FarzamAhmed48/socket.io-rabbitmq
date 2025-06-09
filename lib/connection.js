const amqp = require('amqplib');

class RabbitConnection {
  constructor(uri, options = {}) {
    this.uri = uri;
    this.options = options;
    this.connection = null;
    this.channel = null;
    this.isConnected = false;

    this.maxRetries = options.maxRetries || 10; // Increased for Docker startup
    this.retryDelay = options.retryDelay || 3000; // Increased delay
  }

  async connect() {
    let attempts = 0;
    console.log(`Attempting to connect to RabbitMQ at ${this.uri}...`);
    
    while (attempts < this.maxRetries) {
      try {
        console.log(`Connection attempt ${attempts + 1}/${this.maxRetries}...`);
        
        this.connection = await amqp.connect(this.uri);
        
        this.connection.on('error', (err) => {
          console.error('RabbitMQ connection error:', err.message);
          this.isConnected = false;
        });
        
        this.connection.on('close', () => {
          console.warn('RabbitMQ connection closed');
          this.isConnected = false;
        });

        this.channel = await this.connection.createChannel();
        this.isConnected = true;
        
        console.log('Successfully connected to RabbitMQ');
        return;
        
      } catch (err) {
        attempts++;
        const isDockerStartup = err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED';
        
        if (isDockerStartup && attempts < this.maxRetries) {
          console.log(`Waiting for RabbitMQ Docker container to start... (${attempts}/${this.maxRetries})`);
        } else {
          console.error(`Connection failed:`, err.message);
        }
        
        if (attempts < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await new Promise(r => setTimeout(r, this.retryDelay));
        }
      }
    }
    
    throw new Error(`Failed to connect to RabbitMQ after ${this.maxRetries} attempts. Make sure Docker container is running.`);
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.isConnected = false;
      console.log('RabbitMQ connection closed');
    } catch (err) {
      console.error('Error closing RabbitMQ connection:', err.message);
    }
  }
}

module.exports = RabbitConnection;