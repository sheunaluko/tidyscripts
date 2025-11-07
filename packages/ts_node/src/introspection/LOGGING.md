# Logging Guide

## Current Logging Assessment

### ✅ Strengths
- **Progress Tracking**: Clear file-level and node-level progress
- **Operation Status**: Visual ✓/✗ markers for success/failure
- **Cache Visibility**: Hit/miss logging for embedding cache
- **Statistics**: Comprehensive summaries at end of operations

### ⚠️ Areas for Improvement
- **Error Context**: Limited context when errors occur (which file, node, operation)
- **Debug Levels**: No way to toggle verbose/quiet modes
- **Performance Metrics**: Missing timing for individual operations
- **Stack Traces**: Not always preserved in error logging

## New Logging Utility

A structured logging utility (`logger.ts`) is now available that provides:

### Features

1. **Log Levels**
   - `DEBUG`: Detailed debugging info
   - `INFO`: Standard operational messages (default)
   - `WARN`: Warning messages
   - `ERROR`: Error messages
   - `SILENT`: No output

2. **Structured Context**
   ```typescript
   logger.error('Failed to process node', error, {
     file: 'test.ts',
     nodeId: 123,
     nodeName: 'myFunction',
     operation: 'create'
   });
   ```

3. **Performance Tracking**
   ```typescript
   logger.startTimer('file-sync');
   // ... do work ...
   const duration = logger.endTimer('file-sync');
   logger.logTiming('File sync', duration);
   ```

4. **Contextual Error Logging**
   ```typescript
   logger.logNodeError('create', 'myFunction', 123, 'test.ts', error);
   logger.logFileError('parse', 'test.ts', error);
   ```

5. **Progress Tracking**
   ```typescript
   logger.logProgress(5, 10, 'Processing file.ts');
   // Output: [5/10] (50.0%) Processing file.ts
   ```

## Usage

### Setting Log Level

Via environment variable:
```bash
export TS_INTROSPECTION_LOG_LEVEL=DEBUG  # DEBUG, INFO, WARN, ERROR, SILENT
```

Via code:
```typescript
import { logger, LogLevel } from './logger';

logger.setLevel(LogLevel.DEBUG);
```

### Example: Enhanced Error Logging

**Before** (in reconciler.ts):
```typescript
try {
  await insertFunctionNode(db, nodeData);
  console.log(`  ✓ Created: ${node.name}`);
} catch (error) {
  console.error(`  ✗ Failed to create ${node.name}:`, error);
  throw error;
}
```

**After** (with new logger):
```typescript
import { logger } from './logger';

try {
  await insertFunctionNode(db, nodeData);
  logger.success(`Created: ${node.name}`, {
    nodeId: node.id,
    filePath: node.filePath
  });
} catch (error) {
  logger.logNodeError(
    'create',
    node.name,
    node.id,
    node.filePath,
    error as Error
  );
  throw error;
}
```

### Example: Performance Tracking

**Adding to sync.ts**:
```typescript
import { logger } from './logger';

export async function syncFile(filePath: string, db: Surreal, jdoc: JDocNode) {
  logger.startTimer(`sync-${filePath}`);

  try {
    // ... existing sync logic ...

    const duration = logger.endTimer(`sync-${filePath}`);
    logger.logTiming(`File sync: ${filePath}`, duration);
  } catch (error) {
    logger.logFileError('sync', filePath, error as Error);
    throw error;
  }
}
```

### Example: Debug Logging

```typescript
import { logger } from './logger';

// Only logged when LOG_LEVEL=DEBUG
logger.debug('Checking file hash', {
  file: filePath,
  localHash: localHash.slice(0, 8),
  remoteHash: remoteHash?.slice(0, 8)
});
```

## Migration Plan

### Phase 1: Add logger without changing existing code
✅ Create logger.ts
✅ Export from index.ts
- Keep existing console.log statements

### Phase 2: Gradual migration (optional)
- Replace console.error with logger.error (preserve stack traces)
- Add context to critical errors
- Add performance timing to slow operations
- Add debug logging for troubleshooting

### Phase 3: Advanced usage (future)
- Log to file in addition to console
- Structured JSON logging for log aggregation
- Separate log streams (errors to stderr, info to stdout)

## Recommendations

### Must Fix Now
None - current logging is functional for MVP

### Should Add Soon
1. **Error context** in reconciler.ts and sync.ts
   - Add file path, node ID to error logs
   - Preserve stack traces

2. **Performance timing** for slow operations
   - File sync timing
   - Embedding generation timing
   - Database query timing

3. **Debug mode** for troubleshooting
   - Set TS_INTROSPECTION_LOG_LEVEL=DEBUG
   - Log reconciliation decisions
   - Log cache lookups

### Nice to Have
1. Structured JSON logs for production
2. Log levels per module
3. Log rotation for file output

## Debugging Tips

### Enable Debug Logging
```bash
TS_INTROSPECTION_LOG_LEVEL=DEBUG ts-node -e "import('./sync.js').then(m => m.fullSync())"
```

### Common Issues

**Error without context:**
```
✗ Failed to create node
```

**Better (with logger):**
```
[2025-11-06T12:00:00.000Z] [ERROR] Failed to create node
{
  operation: 'create',
  nodeName: 'myFunction',
  nodeId: 123,
  filePath: 'src/test.ts',
  errorMessage: 'Connection timeout'
}
Stack trace: ...
```

**Slow operation:**
```bash
# Enable timing logs
TS_INTROSPECTION_LOG_LEVEL=DEBUG
```

Then you'll see:
```
⏱️  File sync: src/test.ts: 2341ms (2.34s)
⏱️  Embedding generation: 1523ms (1.52s)
```

## Summary

**Current logging is adequate for:**
- Basic operation tracking
- Success/failure visibility
- Final statistics

**New logger provides:**
- Better debugging capabilities
- Error context
- Performance metrics
- Flexible log levels

**Recommendation:**
- Keep current logging as-is for now (it works!)
- Use new logger for future enhancements
- Add to critical error paths first
- Enable DEBUG mode when troubleshooting
