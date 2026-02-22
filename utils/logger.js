/**
 * Logger utility to standardize logging across the application.
 * Only logs in development mode (__DEV__) by default.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const readLogLevel = () => {
  try {
    const v = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('LOG_LEVEL') : null;
    if (v && LOG_LEVELS[v.toUpperCase()] !== undefined) return LOG_LEVELS[v.toUpperCase()];
  } catch {}
  return null;
};

const DEFAULT_LEVEL = (typeof __DEV__ !== 'undefined' && __DEV__) ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
const CURRENT_LOG_LEVEL = readLogLevel() ?? DEFAULT_LEVEL;

const formatMessage = (message, data) => {
  if (data) {
    try {
      return `${message} ${JSON.stringify(data, null, 2)}`;
    } catch (e) {
      return `${message} [Circular/Unserializable]`;
    }
  }
  return message;
};

const logger = {
  debug: (message, data = null) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(`[DEBUG] ${formatMessage(message, data)}`);
    }
  },

  info: (message, data = null) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`[INFO] ${formatMessage(message, data)}`);
    }
  },

  warn: (message, data = null) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${formatMessage(message, data)}`);
    }
  },

  error: (message, error = null) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      if (error instanceof Error) {
        console.error(`[ERROR] ${message}`, error);
      } else {
        console.error(`[ERROR] ${formatMessage(message, error)}`);
      }
    }
  },
  
  // Agrupar logs relacionados
  group: (label) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.group(label);
    }
  },
  
  groupEnd: () => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.groupEnd();
    }
  }
};

export default logger;
