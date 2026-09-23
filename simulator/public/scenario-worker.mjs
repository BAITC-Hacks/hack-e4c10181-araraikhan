import { findBestScenario } from './scenarios.mjs';

self.onmessage = ({ data }) => {
  try {
    const result = findBestScenario({
      event: data.event,
      onProgress: (evaluated) => self.postMessage({ type: 'progress', evaluated }),
    });
    self.postMessage({ type: 'result', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};
