let navigationController = new AbortController();
const cleanupHandlers = new Set();

export const getNavigationSignal = () => navigationController.signal;

export const abortNavigationTasks = (reason = 'navigation-change') => {
  if (!navigationController.signal.aborted) {
    navigationController.abort(reason);
  }

  cleanupHandlers.forEach((cleanup) => {
    try {
      cleanup(reason);
    } catch (error) {
      console.error('Navigation cleanup failed:', error);
    }
  });

  navigationController = new AbortController();
};

export const registerNavigationCleanup = (cleanup) => {
  if (typeof cleanup !== 'function') {
    return () => {};
  }

  cleanupHandlers.add(cleanup);
  return () => cleanupHandlers.delete(cleanup);
};
