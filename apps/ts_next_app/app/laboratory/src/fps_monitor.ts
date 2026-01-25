/**
 * FPS Monitor Utility
 *
 * Event-based FPS (frames per second) monitoring for performance tracking.
 * Uses requestAnimationFrame to measure frame rates and collect diagnostics.
 */

export interface FPSMonitorConfig {
    measurement_duration_ms?: number;     // Default: 1000ms
    rolling_window_size?: number;         // Default: 60 samples
    include_diagnostics?: boolean;        // Default: true
}

export interface FPSSnapshot {
    fps_current: number;
    timestamp: number;
    frame_count: number;
    measurement_duration_ms: number;
    potentially_invalid?: boolean;        // True if tab was backgrounded
}

export interface FPSStats {
    fps_current: number;          // Most recent
    fps_avg_1min: number;         // Rolling average
    fps_min_1min: number;         // Min in window
    fps_max_1min: number;         // Max in window
    sample_count: number;
}

export interface PerformanceDiagnostics {
    memory_mb: number | null;             // performance.memory (Chrome only)
    memory_limit_mb: number | null;
    dom_nodes: number;                    // Total DOM elements
    visible_nodes: number;                // Visible elements only
}

interface PerformanceMemory {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
    memory?: PerformanceMemory;
}

export class FPSMonitor {
    private config: Required<FPSMonitorConfig>;
    private measuring: boolean = false;
    private rolling_samples: number[] = [];
    private last_snapshot: FPSSnapshot | null = null;

    constructor(config: FPSMonitorConfig = {}) {
        this.config = {
            measurement_duration_ms: config.measurement_duration_ms ?? 1000,
            rolling_window_size: config.rolling_window_size ?? 60,
            include_diagnostics: config.include_diagnostics ?? true,
        };
    }

    /**
     * Measure FPS over a specified duration using requestAnimationFrame
     * Returns a Promise that resolves with the FPS snapshot
     */
    async measure(duration_ms?: number): Promise<FPSSnapshot> {
        if (this.measuring) {
            throw new Error('FPS measurement already in progress');
        }

        // Check if RAF is available
        if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
            throw new Error('requestAnimationFrame not available');
        }

        const measure_duration = duration_ms ?? this.config.measurement_duration_ms;
        this.measuring = true;

        try {
            const snapshot = await this._measure_fps(measure_duration);

            // Update rolling statistics
            this.last_snapshot = snapshot;
            this.rolling_samples.push(snapshot.fps_current);

            // Trim to window size
            if (this.rolling_samples.length > this.config.rolling_window_size) {
                this.rolling_samples.shift();
            }

            return snapshot;
        } finally {
            this.measuring = false;
        }
    }

    /**
     * Internal RAF-based measurement
     */
    private _measure_fps(duration_ms: number): Promise<FPSSnapshot> {
        return new Promise((resolve) => {
            let frame_count = 0;
            let start_time = performance.now();
            let last_time = start_time;
            let was_backgrounded = false;

            const frame_callback = (current_time: number) => {
                frame_count++;

                // Detect if tab was backgrounded (gap > 100ms between frames)
                if (current_time - last_time > 100) {
                    was_backgrounded = true;
                }
                last_time = current_time;

                const elapsed = current_time - start_time;

                if (elapsed < duration_ms) {
                    requestAnimationFrame(frame_callback);
                } else {
                    // Calculate FPS
                    const fps = frame_count > 0 ? (frame_count / elapsed) * 1000 : 0;

                    const snapshot: FPSSnapshot = {
                        fps_current: Math.round(fps * 10) / 10, // Round to 1 decimal
                        timestamp: Date.now(),
                        frame_count,
                        measurement_duration_ms: Math.round(elapsed),
                    };

                    if (was_backgrounded) {
                        snapshot.potentially_invalid = true;
                    }

                    resolve(snapshot);
                }
            };

            requestAnimationFrame(frame_callback);
        });
    }

    /**
     * Get current rolling statistics
     */
    get_current_stats(): FPSStats {
        if (this.rolling_samples.length === 0) {
            return {
                fps_current: 0,
                fps_avg_1min: 0,
                fps_min_1min: 0,
                fps_max_1min: 0,
                sample_count: 0,
            };
        }

        const sum = this.rolling_samples.reduce((a, b) => a + b, 0);
        const avg = sum / this.rolling_samples.length;
        const min = Math.min(...this.rolling_samples);
        const max = Math.max(...this.rolling_samples);

        return {
            fps_current: this.last_snapshot?.fps_current ?? 0,
            fps_avg_1min: Math.round(avg * 10) / 10,
            fps_min_1min: Math.round(min * 10) / 10,
            fps_max_1min: Math.round(max * 10) / 10,
            sample_count: this.rolling_samples.length,
        };
    }

    /**
     * Collect performance diagnostics (memory, DOM stats)
     */
    get_diagnostics(): PerformanceDiagnostics | null {
        if (!this.config.include_diagnostics) {
            return null;
        }

        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return null;
        }

        // Memory stats (Chrome only)
        let memory_mb: number | null = null;
        let memory_limit_mb: number | null = null;

        try {
            const perf = performance as PerformanceWithMemory;
            if (perf.memory) {
                memory_mb = Math.round((perf.memory.usedJSHeapSize / 1024 / 1024) * 10) / 10;
                memory_limit_mb = Math.round((perf.memory.jsHeapSizeLimit / 1024 / 1024) * 10) / 10;
            }
        } catch (e) {
            // performance.memory not available
        }

        // DOM node counts
        let dom_nodes = 0;
        let visible_nodes = 0;

        try {
            const all_elements = document.getElementsByTagName('*');
            dom_nodes = all_elements.length;

            // Count visible nodes
            for (let i = 0; i < all_elements.length; i++) {
                const el = all_elements[i] as HTMLElement;
                const style = window.getComputedStyle(el);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    visible_nodes++;
                }
            }
        } catch (e) {
            // DOM access failed
        }

        return {
            memory_mb,
            memory_limit_mb,
            dom_nodes,
            visible_nodes,
        };
    }

    /**
     * Reset rolling statistics
     */
    reset(): void {
        this.rolling_samples = [];
        this.last_snapshot = null;
    }
}
