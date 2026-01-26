/**
 * Observer Leak Detector
 * Tracks ResizeObserver, MutationObserver, IntersectionObserver
 */

interface ObserverEntry {
  type: 'ResizeObserver' | 'MutationObserver' | 'IntersectionObserver';
  stack: string;
  timestamp: number;
  targetCount: number;
  id: number;
}

class ObserverTracker {
  private observers = new Map<number, ObserverEntry>();
  private nextId = 1;
  private isTracking = false;

  start() {
    if (this.isTracking) return;
    this.isTracking = true;

    const tracker = this;

    // Patch ResizeObserver
    const OriginalResizeObserver = (window as any).ResizeObserver;
    (window as any).ResizeObserver = function(callback: any) {
      const id = tracker.nextId++;
      const observer = new OriginalResizeObserver(callback);

      tracker.observers.set(id, {
        type: 'ResizeObserver',
        stack: new Error().stack || '',
        timestamp: Date.now(),
        targetCount: 0,
        id
      });

      const originalObserve = observer.observe.bind(observer);
      const originalDisconnect = observer.disconnect.bind(observer);

      observer.observe = function(target: any, options?: any) {
        const entry = tracker.observers.get(id);
        if (entry) {
          entry.targetCount++;
        }
        return originalObserve(target, options);
      };

      observer.disconnect = function() {
        tracker.observers.delete(id);
        return originalDisconnect();
      };

      return observer;
    };

    // Patch MutationObserver
    const OriginalMutationObserver = (window as any).MutationObserver;
    (window as any).MutationObserver = function(callback: any) {
      const id = tracker.nextId++;
      const observer = new OriginalMutationObserver(callback);

      tracker.observers.set(id, {
        type: 'MutationObserver',
        stack: new Error().stack || '',
        timestamp: Date.now(),
        targetCount: 0,
        id
      });

      const originalObserve = observer.observe.bind(observer);
      const originalDisconnect = observer.disconnect.bind(observer);

      observer.observe = function(target: any, options?: any) {
        const entry = tracker.observers.get(id);
        if (entry) {
          entry.targetCount++;
        }
        return originalObserve(target, options);
      };

      observer.disconnect = function() {
        tracker.observers.delete(id);
        return originalDisconnect();
      };

      return observer;
    };

    // Patch IntersectionObserver
    const OriginalIntersectionObserver = (window as any).IntersectionObserver;
    (window as any).IntersectionObserver = function(callback: any, options?: any) {
      const id = tracker.nextId++;
      const observer = new OriginalIntersectionObserver(callback, options);

      tracker.observers.set(id, {
        type: 'IntersectionObserver',
        stack: new Error().stack || '',
        timestamp: Date.now(),
        targetCount: 0,
        id
      });

      const originalObserve = observer.observe.bind(observer);
      const originalDisconnect = observer.disconnect.bind(observer);

      observer.observe = function(target: any) {
        const entry = tracker.observers.get(id);
        if (entry) {
          entry.targetCount++;
        }
        return originalObserve(target);
      };

      observer.disconnect = function() {
        tracker.observers.delete(id);
        return originalDisconnect();
      };

      return observer;
    };

    console.log('[ObserverTracker] Started tracking observers');
  }

  getReport() {
    const byType = {
      ResizeObserver: 0,
      MutationObserver: 0,
      IntersectionObserver: 0
    };

    const details: any[] = [];

    for (const entry of this.observers.values()) {
      byType[entry.type]++;

      // Extract meaningful stack info
      const stackLines = entry.stack.split('\n').slice(2, 5);

      details.push({
        id: entry.id,
        type: entry.type,
        targetCount: entry.targetCount,
        ageMs: Date.now() - entry.timestamp,
        stack: stackLines.join(' <- ')
      });
    }

    return {
      total: this.observers.size,
      byType,
      details: details.sort((a, b) => b.ageMs - a.ageMs)
    };
  }

  printReport() {
    const report = this.getReport();
    console.log('=== Observer Leak Report ===');
    console.log(`Total observers: ${report.total}`);
    console.table(report.byType);
    console.log('\nOldest observers (potential leaks):');
    console.table(report.details.slice(0, 10));
  }
}

export const observerTracker = new ObserverTracker();

// Must start BEFORE React loads
if (typeof window !== 'undefined') {
  observerTracker.start();
  (window as any).observerTracker = observerTracker;
}
