/**
 * Generic type-safe event emitter
 * @template TEventMap - Map of event names to their callback signatures
 */
export class EventEmitter<TEventMap extends Record<string, (...args: any[]) => void>> {
  private listeners: Map<keyof TEventMap, Set<Function>> = new Map();

  /**
   * Register an event listener
   * @param event - Event name
   * @param callback - Callback function
   */
  on<K extends keyof TEventMap>(event: K, callback: TEventMap[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove an event listener
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  off<K extends keyof TEventMap>(event: K, callback: TEventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   * @param event - Event name
   * @param args - Arguments to pass to callbacks
   */
  protected emit<K extends keyof TEventMap>(
    event: K,
    ...args: Parameters<TEventMap[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for '${String(event)}':`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if none specified
   * @param event - Optional event name
   */
  removeAllListeners<K extends keyof TEventMap>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEventMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
