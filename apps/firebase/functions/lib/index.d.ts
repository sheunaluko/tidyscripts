/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
interface EmbeddingData {
    start: number;
    end: number;
    embedding: number[];
    metadata: {
        sid: string;
        [key: string]: any;
    };
}
/**
 * Cloud Function to store an embedding
 */
export declare const storeEmbedding: import("firebase-functions/v2/https").CallableFunction<EmbeddingData, Promise<{
    success: boolean;
    message: string;
}>, unknown>;
/**
 * Cloud Function to retrieve embeddings
 * Note: CORS is disabled by default for callable functions.
 */
export declare const retrieveEmbedding: import("firebase-functions/v2/https").CallableFunction<{
    queryVector: number[];
    limit: number;
}, Promise<{
    success: boolean;
    results: {
        id: string;
    }[];
}>, unknown>;
export {};
