const MUTED_THREE_AND_EXPO_GL_MESSAGES = [
  'THREE.WARNING: Multiple instances of Three.js being imported.',
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
  "EXGL: gl.pixelStorei() doesn't support this parameter yet!",
  'THREE.WebGLRenderer: WEBGL_lose_context extension not supported.',
];

const toLogMessage = (arg) => {
  if (typeof arg === 'string') {
    return arg;
  }

  if (arg?.message && typeof arg.message === 'string') {
    return arg.message;
  }

  return '';
};

const hasMutedMessage = (args) => {
  const message = args.map(toLogMessage).filter(Boolean).join(' ');

  return MUTED_THREE_AND_EXPO_GL_MESSAGES.some((mutedMessage) => message.includes(mutedMessage));
};

const installKnownThreeLogFilter = () => {
  if (globalThis.__VISIOBAL_THREE_LOG_FILTER_INSTALLED__) {
    return;
  }

  globalThis.__VISIOBAL_THREE_LOG_FILTER_INSTALLED__ = true;

  const originalWarn = console.warn.bind(console);
  const originalLog = console.log.bind(console);

  console.warn = (...args) => {
    if (!hasMutedMessage(args)) {
      originalWarn(...args);
    }
  };

  console.log = (...args) => {
    if (!hasMutedMessage(args)) {
      originalLog(...args);
    }
  };
};

installKnownThreeLogFilter();