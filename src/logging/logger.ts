import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({
  colorize: true
});

// TODO: make logger configurable
export const logger = pino({ level: 'info' }, stream);
