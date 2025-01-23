/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, CallableRequest } from "firebase-functions/v2/https";
import * as tsc from "tidyscripts_common" 

import {
  Firestore,
  FieldValue,
} from "@google-cloud/firestore";


import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
const db = new Firestore();

// Define interface for embedding data
interface EmbeddingData {
  start: number;
  end: number;
  embedding: number[];
  metadata: { sid: string; [key: string]: any };
}

/**
 * Cloud Function to store an embedding
 */
export const storeEmbedding = onCall(
  async (request: CallableRequest<EmbeddingData>) => {
    // Access auth information directly from request.auth
    if (!request.auth) {
      throw new Error("Unauthenticated request. User must be logged in.");
    }

    const userId = request.auth.uid;
    const { start, end, embedding, metadata } = request.data;

    if (!metadata.sid) {
      throw new Error("Metadata must include an SID.");
    }

     let eid = await tsc.apis.cryptography.object_sha256(request.data) as string; 
    const userPath = `/users/${userId}/tex/spaces/embedding_space`;

    try {
      const docRef = db.collection(userPath).doc(eid);
      const doc = await docRef.get();

      if (doc.exists) {
        throw new Error("Embedding with the same EID already exists.");
      }

      await docRef.set({
        start,
        end,
        embedding: FieldValue.vector(embedding),
        metadata,
      });

      logger.info("Embedding stored successfully", { eid, userId });
      return { success: true, message: "Embedding stored successfully." };
    } catch (error) {
      const errorMessage = (error as Error).message || "Failed to store embedding.";
      logger.error(errorMessage, { error });
      throw new Error(errorMessage);
    }
  }
);

/**
 * Cloud Function to retrieve embeddings
 * Note: CORS is disabled by default for callable functions.
 */
export const retrieveEmbedding = onCall(
  async (request: CallableRequest<{ queryVector: number[]; limit: number }>) => {
    // Access auth information directly from request.auth
    if (!request.auth) {
      throw new Error("Unauthenticated request. User must be logged in.");
    }

    const userId = request.auth.uid;
    const { queryVector, limit } = request.data;

    if (!queryVector || !Array.isArray(queryVector) || queryVector.some(isNaN)) {
      throw new Error("Invalid query vector format. Must be an array of numbers.");
    }

    if (!limit || typeof limit !== "number" || limit <= 0 || limit > 100) {
      throw new Error("Limit must be a positive number less than or equal to 100.");
    }

    const userPath = `/users/${userId}/tex/spaces/embedding_space`;

    try {
      const coll = db.collection(userPath);
      const vectorQuery = coll.findNearest({
        vectorField: "embedding",
        queryVector,
        limit,
        distanceMeasure: "COSINE",
      });

      const vectorQuerySnapshot = await vectorQuery.get();

      if (vectorQuerySnapshot.empty) {
        throw new Error("No matching embeddings found.");
      }

      const results = vectorQuerySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      logger.info("Embeddings retrieved successfully", { userId, count: results.length });
      return { success: true, results };
    } catch (error) {
      const errorMessage = (error as Error).message || "Failed to retrieve embeddings.";
      logger.error(errorMessage, { error });
      throw new Error(errorMessage);
    }
  }
);
