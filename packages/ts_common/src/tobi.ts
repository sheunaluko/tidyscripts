/**
 * Tobi - Universal WebSocket Client
 *
 * Works in both browser and Node.js environments
 * Handles message broadcasting and multiple message handlers
 */

import * as logger from './logger';

const log = logger.get_logger({ id: "tobi" });

type MessageHandler = (data: any) => void;

// Determine the WebSocket implementation based on environment
function getWebSocketImpl(): any {
    if (typeof WebSocket !== 'undefined') {
        // Browser environment
        return WebSocket;
    } else {
        // Node.js environment
        try {
            const { WebSocket } = require('ws');
            return WebSocket;
        } catch (e) {
            throw new Error('WebSocket not available. In Node.js, please install the "ws" package.');
        }
    }
}

export class TobiClient {
    private ws: any | null = null;
    private handlers: MessageHandler[] = [];
    private url: string = 'localhost';
    private port: number = 8002;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;

    constructor(url: string = 'localhost', port: number = 8002) {
        this.url = url;
        this.port = port;
    }

    /**
     * Connect to the WebSocket server
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const WebSocketImpl = getWebSocketImpl();
                const wsUrl = `ws://${this.url}:${this.port}`;

                log(`Connecting to ${wsUrl}...`);
                this.ws = new WebSocketImpl(wsUrl);

                this.ws.onopen = () => {
                    log(`Connected to ${wsUrl}`);
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event: any) => {
                    const data = this.parseMessage(event.data);
                    log(`Received message: ${JSON.stringify(data)}`);

                    // Run all registered handlers
                    this.handlers.forEach(handler => {
                        try {
                            handler(data);
                        } catch (error) {
                            log(`Error in message handler: ${error}`);
                        }
                    });
                };

                this.ws.onerror = (error: any) => {
                    log(`WebSocket error: ${error}`);
                    reject(error);
                };

                this.ws.onclose = () => {
                    log(`Connection closed`);
                    this.attemptReconnect();
                };

            } catch (error) {
                log(`Failed to connect: ${error}`);
                reject(error);
            }
        });
    }

    /**
     * Parse incoming message (handles both string and buffer data)
     */
    private parseMessage(data: any): any {
        try {
            // Handle Buffer (Node.js)
            if (data instanceof Buffer) {
                return JSON.parse(data.toString());
            }
            // Handle string
            if (typeof data === 'string') {
                return JSON.parse(data);
            }
            // Already an object
            return data;
        } catch (e) {
            // If not JSON, return as is
            return data;
        }
    }

    /**
     * Attempt to reconnect after disconnection
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                this.connect().catch(err => {
                    log(`Reconnection attempt failed: ${err}`);
                });
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            log(`Max reconnection attempts reached`);
        }
    }

    /**
     * Send a message to the WebSocket server
     */
    send(data: any): void {
        if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
            throw new Error('WebSocket is not connected');
        }

        const message = typeof data === 'string' ? data : JSON.stringify(data);
        log(`Sending message: ${message}`);
        this.ws.send(message);
    }

    /**
     * Send a message, automatically connecting if needed
     * Abstracts away connection logic
     */
    async autoSend(data: any): Promise<void> {
        // Connect if not already connected
        if (!this.isConnected()) {
            log(`Not connected, connecting first...`);
            await this.connect();
        }

        // Send the message
        this.send(data);
    }

    /**
     * Register a message handler
     * All registered handlers will be called when a message is received
     */
    registerHandler(handler: MessageHandler): void {
        this.handlers.push(handler);
        log(`Handler registered. Total handlers: ${this.handlers.length}`);
    }

    /**
     * Remove a specific handler
     */
    removeHandler(handler: MessageHandler): void {
        const index = this.handlers.indexOf(handler);
        if (index > -1) {
            this.handlers.splice(index, 1);
            log(`Handler removed. Total handlers: ${this.handlers.length}`);
        }
    }

    /**
     * Clear all handlers
     */
    clearHandlers(): void {
        this.handlers = [];
        log(`All handlers cleared`);
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect(): void {
        if (this.ws) {
            this.maxReconnectAttempts = 0; // Prevent auto-reconnect
            this.ws.close();
            this.ws = null;
            log(`Disconnected`);
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === 1; // 1 = OPEN
    }

    /**
     * Get the number of registered handlers
     */
    getHandlerCount(): number {
        return this.handlers.length;
    }
}

/**
 * Create a new Tobi client instance
 */
export function createClient(url: string = 'localhost', port: number = 8002): TobiClient {
    return new TobiClient(url, port);
}

/**
 * Default client instance for convenience
 */
let defaultClient: TobiClient | null = null;

export function getDefaultClient(): TobiClient {
    if (!defaultClient) {
        defaultClient = new TobiClient();
    }
    return defaultClient;
}

/**
 * Send a message using the default client
 * Abstracts away both client creation and connection logic
 */
export async function send(data: any): Promise<void> {
    const client = getDefaultClient();
    await client.autoSend(data);
}

export interface ChartData {
    title: string;
    x: any[];
    y: any[];
}

export interface ObjectData {
    data: any;
}

/**
 * Display a bar chart
 * @param params - Chart parameters {title, x, y}
 */
export async function bar_chart(params: ChartData): Promise<void> {
    await send({
        type: 'bar_chart',
        ...params,
        timestamp: Date.now()
    });
}

/**
 * Display a time series chart
 * @param params - Chart parameters {title, x, y}
 */
export async function time_series_chart(params: ChartData): Promise<void> {
    await send({
        type: 'time_series_chart',
        ...params,
        timestamp: Date.now()
    });
}

/**
 * Display an object using the inspector
 * @param params - Object parameters {data}
 */
export async function display_object(params: ObjectData): Promise<void> {
    await send({
        type: 'object',
        ...params,
        timestamp: Date.now()
    });
}
