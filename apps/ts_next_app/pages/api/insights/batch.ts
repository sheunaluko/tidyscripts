// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import * as tsn from "tidyscripts_node";
const { get_logger } = tsn.common.logger;

type Data = any;

const log = get_logger({ id: "insights-batch" });

export const config = {
  maxDuration: 300, // Can run for 300s (5 minutes)
};

/**
 * Batch insights endpoint - stores event tracking data
 *
 * POST /api/insights/batch
 * Body: { events: InsightsEvent[] }
 * Returns: { success, events_received, events_stored, errors? }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Validate request body
  const { events } = req.body;

  if (!events || !Array.isArray(events)) {
    return res.status(400).json({
      success: false,
      message: 'Events array is required',
      events_received: 0,
      events_stored: 0,
    });
  }

  if (events.length === 0) {
    return res.status(200).json({
      success: true,
      events_received: 0,
      events_stored: 0,
    });
  }

  // Capture server logs for client-side visibility
  const serverLogs: string[] = [];
  const logWithCapture = (message: string) => {
    log(message);
    serverLogs.push(`[${new Date().toISOString()}] ${message}`);
  };

  logWithCapture(`Received ${events.length} events for storage`);

  let db: any = null;
  const errors: string[] = [];
  let events_stored = 0;

  try {
    // Connect to SurrealDB - using tidyscripts backend
    const surrealUrl = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL || 'ws://localhost:8000/rpc';
    const surrealUser = process.env.SURREAL_TIDYSCRIPTS_BACKEND_USER || 'root';
    const surrealPw = process.env.SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD || 'root';
    const surrealNamespace = 'production';
    const surrealDatabase = 'insights_events';

    db = await tsn.apis.surreal.connect_to_surreal({
      url: surrealUrl,
      namespace: surrealNamespace,
      database: surrealDatabase,
      auth: {
        username: surrealUser,
        password: surrealPw,
      },
    });

    logWithCapture('Connected to SurrealDB');

    // Process events in batches of 200 (SurrealDB recommended batch size)
    const batchSize = 200;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      try {
        // Insert events using deterministic IDs
        for (const event of batch) {
          try {
            // Convert timestamp to JavaScript Date object
            const timestamp = typeof event.timestamp === 'number'
              ? new Date(event.timestamp)
              : new Date(event.timestamp);

            // Build query parameters - only include defined values
            const params: any = {
              event_id: event.event_id,
              event_type: event.event_type,
              app_name: event.app_name,
              app_version: event.app_version,
              user_id: event.user_id,
              session_id: event.session_id,
              timestamp: timestamp,
              payload: event.payload || {},
            };

            // Add optional fields only if they exist
            if (event.trace_id) params.trace_id = event.trace_id;
            if (event.parent_event_id) params.parent_event_id = event.parent_event_id;
            if (event.tags) params.tags = event.tags;
            if (event.duration_ms !== undefined) params.duration_ms = event.duration_ms;
            if (event.client_info) params.client_info = event.client_info;

            // Build SET clause dynamically
            const setFields = [
              'event_id = $event_id',
              'event_type = $event_type',
              'app_name = $app_name',
              'app_version = $app_version',
              'user_id = $user_id',
              'session_id = $session_id',
              'timestamp = $timestamp',
              'payload = $payload',
            ];

            if (params.trace_id) setFields.push('trace_id = $trace_id');
            if (params.parent_event_id) setFields.push('parent_event_id = $parent_event_id');
            if (params.tags) setFields.push('tags = $tags');
            if (params.duration_ms !== undefined) setFields.push('duration_ms = $duration_ms');
            if (params.client_info) setFields.push('client_info = $client_info');

            const query = `CREATE type::thing('insights_events', $event_id) SET ${setFields.join(', ')}`;

            await db.query(query, params);

            events_stored++;
          } catch (error: any) {
            const errorMsg = `Failed to store event ${event.event_id}: ${error.message}`;
            logWithCapture(errorMsg);
            errors.push(errorMsg);
          }
        }

        logWithCapture(`Stored batch ${i / batchSize + 1}: ${batch.length} events`);
      } catch (error: any) {
        const errorMsg = `Batch insert failed: ${error.message}`;
        logWithCapture(errorMsg);
        errors.push(errorMsg);
      }
    }

    logWithCapture(`Successfully stored ${events_stored}/${events.length} events`);

    // Return response with server logs
    const response = {
      success: events_stored > 0,
      events_received: events.length,
      events_stored,
      errors: errors.length > 0 ? errors : undefined,
      server_logs: serverLogs,
    };

    res.status(200).json(response);
  } catch (error: any) {
    logWithCapture(`Error in insights batch endpoint: ${error.message}`);

    res.status(500).json({
      success: false,
      events_received: events.length,
      events_stored,
      errors: [error.message],
      server_logs: serverLogs,
    });
  } finally {
    // Close database connection
    if (db) {
      try {
        await db.close();
        log('Database connection closed');
      } catch (error: any) {
        log(`Error closing database: ${error.message}`);
      }
    }
  }
}
