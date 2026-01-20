export async function queryInsightsEvents(filters: {
  event_type?: string;
  session_id?: string;
  trace_id?: string;
  limit?: number;
}) {
  const response = await fetch('/api/insights/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters)
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  return response.json();
}
