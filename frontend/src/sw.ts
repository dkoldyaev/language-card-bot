/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Step 1: Add event listener for the message event
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

export {};
