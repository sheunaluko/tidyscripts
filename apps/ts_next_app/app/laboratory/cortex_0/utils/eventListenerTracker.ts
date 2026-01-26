/**
 * Event Listener Leak Detector
 *
 * Tracks all addEventListener/removeEventListener calls to detect leaks
 */

interface ListenerEntry {
  type: string;
  target: string;
  stack: string;
  timestamp: number;
}

class EventListenerTracker {
  private listeners = new Map<string, ListenerEntry>();
  private listenerCount = new Map<string, number>();
  private isTracking = false;

  start() {
    if (this.isTracking) return;
    this.isTracking = true;

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

    const tracker = this;

    // @ts-ignore
    EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
      const targetName = tracker.getTargetName(this);
      const key = `${targetName}:${type}:${tracker.getListenerKey(listener)}`;

      if (!tracker.listeners.has(key)) {
        tracker.listeners.set(key, {
          type,
          target: targetName,
          stack: new Error().stack || '',
          timestamp: Date.now()
        });
      }

      const count = tracker.listenerCount.get(type) || 0;
      tracker.listenerCount.set(type, count + 1);

      return originalAddEventListener.call(this, type, listener, options);
    };

    // @ts-ignore
    EventTarget.prototype.removeEventListener = function(type: string, listener: any, options?: any) {
      const targetName = tracker.getTargetName(this);
      const key = `${targetName}:${type}:${tracker.getListenerKey(listener)}`;

      tracker.listeners.delete(key);

      const count = tracker.listenerCount.get(type) || 0;
      if (count > 0) {
        tracker.listenerCount.set(type, count - 1);
      }

      return originalRemoveEventListener.call(this, type, listener, options);
    };

    console.log('[EventListenerTracker] Started tracking');
  }

  stop() {
    this.isTracking = false;
    // Note: We don't restore the original methods because that would be complex
    // In production, this should be handled more carefully
  }

  private getTargetName(target: any): string {
    if (target === window) return 'window';
    if (target === document) return 'document';
    if (target instanceof HTMLElement) {
      return `${target.tagName}.${target.className || target.id || 'anonymous'}`;
    }
    return target.constructor?.name || 'unknown';
  }

  private getListenerKey(listener: any): string {
    if (typeof listener === 'function') {
      return listener.name || 'anonymous';
    }
    return 'unknown';
  }

  getReport() {
    const report = {
      totalListeners: this.listeners.size,
      byType: Object.fromEntries(this.listenerCount.entries()),
      byTarget: new Map<string, number>(),
      details: Array.from(this.listeners.values())
    };

    // Group by target
    for (const entry of this.listeners.values()) {
      const count = report.byTarget.get(entry.target) || 0;
      report.byTarget.set(entry.target, count + 1);
    }

    return report;
  }

  printReport() {
    const report = this.getReport();
    console.log('=== Event Listener Report ===');
    console.log(`Total listeners: ${report.totalListeners}`);
    console.log('\nBy event type:');
    console.table(report.byType);
    console.log('\nBy target:');
    console.table(Object.fromEntries(report.byTarget.entries()));
  }
}

export const eventListenerTracker = new EventListenerTracker();

// Auto-start in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  eventListenerTracker.start();

  // Expose globally for debugging
  (window as any).listenerTracker = eventListenerTracker;

  // Report every 10 seconds
  setInterval(() => {
    const report = eventListenerTracker.getReport();
    if (report.totalListeners > 50) {
      console.warn(`[LEAK WARNING] ${report.totalListeners} event listeners detected!`);
      eventListenerTracker.printReport();
    }
  }, 10000);
}
