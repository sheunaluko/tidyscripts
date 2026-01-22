/**
 * InsightsClientNode - Node.js-specific extension for direct database access
 *
 * Extends the common InsightsClient to use direct database connection
 * instead of API endpoints when running in Node.js environments.
 */

import * as tsc from 'tidyscripts_common'
import type { InsightsEvent, InsightsConfig } from 'tidyscripts_common'
const { InsightsClient } = tsc.insights
const { logger } = tsc
import * as surreal from './surreal'

const log = logger.get_logger({ id: "insights_node" })

/**
 * Node.js InsightsClient that writes directly to database
 */
export class InsightsClientNode extends InsightsClient {
  /**
   * Override flushBatch to use direct database connection
   */
  async flushBatch(): Promise<void> {
    // Access the protected eventBatch through the parent class
    const eventBatch = (this as any).eventBatch as InsightsEvent[]

    if (eventBatch.length === 0) {
      return
    }

    // Take the current batch and clear it
    const eventsToSend = [...eventBatch]
    ;(this as any).eventBatch = []

    try {
      await this.flushViaDatabase(eventsToSend)
    } catch (error) {
      // Silent failure - log but don't throw
      log(`Error flushing batch: ${error}`)

      // Put events back in the batch to try again later
      // But limit the size to prevent infinite growth
      const config = (this as any).config
      if (eventBatch.length < config.batch_size * 2) {
        eventBatch.unshift(...eventsToSend)
      }
    }
  }

  /**
   * Flush directly to database (Node only)
   */
  private async flushViaDatabase(events: InsightsEvent[]): Promise<void> {
    log(`Flushing ${events.length} events directly to database`)

    let db: any = null

    try {
      // Connect using environment variables
      const surrealUrl = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL || 'ws://localhost:8000/rpc'
      const surrealUser = process.env.SURREAL_TIDYSCRIPTS_BACKEND_USER || 'root'
      const surrealPw = process.env.SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD || 'root'
      const surrealNamespace = 'production'
      const surrealDatabase = 'insights_events'

      db = await surreal.connect_to_surreal({
        url: surrealUrl,
        namespace: surrealNamespace,
        database: surrealDatabase,
        auth: {
          username: surrealUser,
          password: surrealPw,
        },
      })

      log('Connected to SurrealDB')

      // Insert events (same logic as API route)
      let events_stored = 0

      for (const event of events) {
        try {
          // Convert timestamp to Date
          const timestamp = typeof event.timestamp === 'number'
            ? new Date(event.timestamp)
            : new Date(event.timestamp)

          // Build parameters
          const params: any = {
            event_id: event.event_id,
            event_type: event.event_type,
            app_name: event.app_name,
            app_version: event.app_version,
            user_id: event.user_id,
            session_id: event.session_id,
            timestamp: timestamp,
            payload: event.payload || {},
          }

          // Add optional fields
          if (event.trace_id) params.trace_id = event.trace_id
          if (event.parent_event_id) params.parent_event_id = event.parent_event_id
          if (event.tags) params.tags = event.tags
          if (event.duration_ms !== undefined) params.duration_ms = event.duration_ms
          if (event.client_info) params.client_info = event.client_info

          // Build SET clause
          const setFields = [
            'event_id = $event_id',
            'event_type = $event_type',
            'app_name = $app_name',
            'app_version = $app_version',
            'user_id = $user_id',
            'session_id = $session_id',
            'timestamp = $timestamp',
            'payload = $payload',
          ]

          if (params.trace_id) setFields.push('trace_id = $trace_id')
          if (params.parent_event_id) setFields.push('parent_event_id = $parent_event_id')
          if (params.tags) setFields.push('tags = $tags')
          if (params.duration_ms !== undefined) setFields.push('duration_ms = $duration_ms')
          if (params.client_info) setFields.push('client_info = $client_info')

          const query = `CREATE type::thing('insights_events', $event_id) SET ${setFields.join(', ')}`

          await db.query(query, params)
          events_stored++
        } catch (error: any) {
          log(`Failed to store event ${event.event_id}: ${error.message}`)
        }
      }

      log(`Successfully stored ${events_stored}/${events.length} events`)
    } finally {
      if (db) {
        await db.close()
        log('Database connection closed')
      }
    }
  }
}

/**
 * Create a Node.js InsightsClient with direct database access
 */
export function createNodeClient(config: InsightsConfig): InsightsClientNode {
  return new InsightsClientNode(config)
}

/**
 * Export all types from common for convenience
 */
export type { InsightsEvent, InsightsConfig } from 'tidyscripts_common'
const { createClient, generateSessionId, generateEventId, generateTraceId } = tsc.insights
export { createClient, generateSessionId, generateEventId, generateTraceId }
