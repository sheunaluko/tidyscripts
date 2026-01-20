import type { NextApiRequest, NextApiResponse } from 'next';
import * as tsn from "tidyscripts_node";
const { get_logger } = tsn.common.logger;

const log = get_logger({ id: "insights-query" });

export const config = {
  maxDuration: 300,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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

  const { event_type, session_id, trace_id, limit = 50 } = req.body;

  let db: any = null;

  try {
    // Connect to SurrealDB
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

    log('Connected to SurrealDB for query');

    // Build query
    let query = 'SELECT * FROM insights_events';
    const conditions = [];
    const params: any = {};

    if (event_type) {
      conditions.push('event_type = $event_type');
      params.event_type = event_type;
    }
    if (session_id) {
      conditions.push('session_id = $session_id');
      params.session_id = session_id;
    }
    if (trace_id) {
      conditions.push('trace_id = $trace_id');
      params.trace_id = trace_id;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT $limit';
    params.limit = limit;

    log(`Executing query: ${query}`);
    log(`Params: ${JSON.stringify(params)}`);

    const result = await db.query(query, params);

    log(`Query returned ${result[0]?.length || 0} events`);

    res.status(200).json({
      success: true,
      events: result[0] || []
    });
  } catch (error: any) {
    log(`Query error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      events: []
    });
  } finally {
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
