export const getRouteName = (event: Events) => {
  return `R_${process.env.ENVIRONMENT || 'production'}-${event}`;
};
export const getQueueName = (event: Events) => {
  return `Q_${process.env.ENVIRONMENT || 'production'}-${event}`;
};

export enum Events {
  EMAIL_SENDING = 'email_sending',
}

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getListening = (event: Events) => {
  return {
    exchange: 'exchange1',
    routingKey: getRouteName(event),
    queue: getQueueName(event),
  };
};
