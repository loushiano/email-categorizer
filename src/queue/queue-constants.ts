export const getRouteName = (event: Events) => {
  return `R_email_agent-${event}`;
};
export const getQueueName = (event: Events) => {
  return `Q_email_agent-${event}`;
};

export enum Events {
  RENEW_WATCH = 'renew_watch',
  RENEW_TOKEN = 'renew_token',
  PROCESS_INCOMING_EMAIL = 'process_incoming_email',
  DELETE_GMAIL_MESSAGE = 'delete_gmail_message',
  UNSUBSCRIBE_EMAIL = 'unsubscribe_email',
}

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getListening = (event: Events) => {
  return {
    exchange: 'exchange1',
    routingKey: getRouteName(event),
    queue: getQueueName(event),
  };
};
