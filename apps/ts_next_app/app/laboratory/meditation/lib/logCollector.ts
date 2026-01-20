export class LogCollector {
  private logs: Array<{ timestamp: Date; type: string; message: string }> = [];
  private events: any[] = [];
  private testResults: any[] = [];
  private queryResults: any[] = [];
  private apiResponses: any[] = [];
  private clientState: any = {};

  log(type: string, message: string) {
    this.logs.push({
      timestamp: new Date(),
      type,
      message
    });
  }

  addEvent(event: any) {
    this.events.push({
      ...event,
      capturedAt: new Date()
    });
  }

  addTestResult(result: any) {
    this.testResults.push({
      ...result,
      capturedAt: new Date()
    });
  }

  addQueryResult(query: any, results: any) {
    this.queryResults.push({
      query,
      results,
      capturedAt: new Date()
    });
  }

  addAPIResponse(endpoint: string, request: any, response: any) {
    this.apiResponses.push({
      endpoint,
      request,
      response,
      capturedAt: new Date()
    });
  }

  updateClientState(state: any) {
    this.clientState = {
      ...state,
      capturedAt: new Date()
    };
  }

  generateReport(): string {
    const separator = '='.repeat(80);
    const subSeparator = '-'.repeat(80);

    let report = '';

    // Header
    report += `${separator}\n`;
    report += `MEDITATION - INSIGHTS CLIENT LOG REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `${separator}\n\n`;

    // Client State
    report += `CLIENT STATE\n`;
    report += `${subSeparator}\n`;
    report += `Session ID: ${this.clientState.sessionId || 'N/A'}\n`;
    report += `Batch Size: ${this.clientState.batchSize || 0}\n`;
    report += `Chain Depth: ${this.clientState.chainDepth || 0}\n`;
    report += `Enabled: ${this.clientState.enabled ? 'Yes' : 'No'}\n`;
    report += `Last Updated: ${this.clientState.capturedAt?.toLocaleString() || 'N/A'}\n`;
    report += `\n`;

    // Console Logs
    report += `CONSOLE LOGS (${this.logs.length} entries)\n`;
    report += `${subSeparator}\n`;
    this.logs.forEach(log => {
      report += `[${log.timestamp.toLocaleTimeString()}] [${log.type}] ${log.message}\n`;
    });
    report += `\n`;

    // Events
    report += `EVENTS CREATED (${this.events.length} events)\n`;
    report += `${subSeparator}\n`;
    this.events.forEach((event, i) => {
      report += `Event ${i + 1}:\n`;
      report += `  Type: ${event.type}\n`;
      report += `  Event ID: ${event.eventId}\n`;
      report += `  Timestamp: ${event.timestamp?.toLocaleString() || 'N/A'}\n`;
      report += `  Captured At: ${event.capturedAt?.toLocaleString() || 'N/A'}\n`;
      report += `\n`;
    });
    report += `\n`;

    // Test Results
    if (this.testResults.length > 0) {
      report += `VALIDATION TEST RESULTS (${this.testResults.length} tests)\n`;
      report += `${subSeparator}\n`;
      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.length - passed;
      report += `Summary: ${passed} passed, ${failed} failed\n\n`;

      this.testResults.forEach(result => {
        report += `Test: ${result.name}\n`;
        report += `  Status: ${result.passed ? 'PASS ✓' : 'FAIL ✗'}\n`;
        report += `  Message: ${result.message}\n`;
        report += `  Captured At: ${result.capturedAt?.toLocaleString() || 'N/A'}\n`;
        report += `\n`;
      });
      report += `\n`;
    }

    // Query Results
    if (this.queryResults.length > 0) {
      report += `DATABASE QUERY RESULTS (${this.queryResults.length} queries)\n`;
      report += `${subSeparator}\n`;
      this.queryResults.forEach((qr, i) => {
        report += `Query ${i + 1}:\n`;
        report += `  Filters: ${JSON.stringify(qr.query, null, 2)}\n`;
        report += `  Results Count: ${qr.results?.length || 0}\n`;
        report += `  Captured At: ${qr.capturedAt?.toLocaleString() || 'N/A'}\n`;
        if (qr.results && qr.results.length > 0) {
          report += `  Sample Results (first 3):\n`;
          qr.results.slice(0, 3).forEach((result: any, idx: number) => {
            report += `    ${idx + 1}. Event ${result.event_id} - ${result.event_type}\n`;
          });
        }
        report += `\n`;
      });
      report += `\n`;
    }

    // API Responses
    if (this.apiResponses.length > 0) {
      report += `API RESPONSES (${this.apiResponses.length} calls)\n`;
      report += `${subSeparator}\n`;
      this.apiResponses.forEach((api, i) => {
        report += `API Call ${i + 1}:\n`;
        report += `  Endpoint: ${api.endpoint}\n`;
        report += `  Request: ${JSON.stringify(api.request, null, 2)}\n`;
        report += `  Response: ${JSON.stringify(api.response, null, 2)}\n`;
        report += `  Captured At: ${api.capturedAt?.toLocaleString() || 'N/A'}\n`;
        report += `\n`;
      });
      report += `\n`;
    }

    // Footer
    report += `${separator}\n`;
    report += `END OF REPORT\n`;
    report += `Total Console Logs: ${this.logs.length}\n`;
    report += `Total Events: ${this.events.length}\n`;
    report += `Total Tests: ${this.testResults.length}\n`;
    report += `Total Queries: ${this.queryResults.length}\n`;
    report += `Total API Calls: ${this.apiResponses.length}\n`;
    report += `${separator}\n`;

    return report;
  }

  clear() {
    this.logs = [];
    this.events = [];
    this.testResults = [];
    this.queryResults = [];
    this.apiResponses = [];
    this.clientState = {};
  }

  getStats() {
    return {
      logs: this.logs.length,
      events: this.events.length,
      tests: this.testResults.length,
      queries: this.queryResults.length,
      apiCalls: this.apiResponses.length
    };
  }
}

// Singleton instance
export const logCollector = new LogCollector();
