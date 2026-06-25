const { routingKeys } = require('../queues/events');
const { publishEvent } = require('../queues/rabbitmq');

function publishUserRegistered(user) {
  return publishEvent(routingKeys.userRegistered, {
    user: {
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });
}

module.exports = { publishUserRegistered };
