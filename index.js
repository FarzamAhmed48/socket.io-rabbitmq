const RabbitMQAdapter = require('./lib/adapter');

function createAdapter(uri, opts = {}) {
  return function (nsp) {
    return new RabbitMQAdapter(nsp, { uri, ...opts });
  };
}

module.exports = createAdapter;
