import { useState } from 'react';

interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json';
  description?: string;
  options?: string[]; // For select type
  defaultValue?: any;
  optional?: boolean;
}

interface MethodExecutorProps {
  methodName: string;
  description: string;
  parameters: Parameter[];
  onExecute: (params: any) => Promise<any>;
  resultRenderer?: (result: any) => React.ReactNode;
  cacheIndicator?: boolean;
}

export function MethodExecutor({
  methodName,
  description,
  parameters,
  onExecute,
  resultRenderer,
  cacheIndicator = false
}: MethodExecutorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        initial[param.name] = param.defaultValue;
      }
    });
    return initial;
  });
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const handleParamChange = (name: string, value: any, type: string) => {
    if (type === 'number') {
      setParamValues(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else if (type === 'boolean') {
      setParamValues(prev => ({ ...prev, [name]: value === 'true' }));
    } else if (type === 'json') {
      setParamValues(prev => ({ ...prev, [name]: value }));
    } else {
      setParamValues(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setExecutionTime(null);
    setFromCache(false);

    try {
      // Build params object
      const params: any = {};
      parameters.forEach(param => {
        const value = paramValues[param.name];
        if (value !== undefined && value !== '') {
          if (param.type === 'json') {
            try {
              params[param.name] = JSON.parse(value);
            } catch (e) {
              throw new Error(`Invalid JSON for ${param.name}`);
            }
          } else {
            params[param.name] = value;
          }
        } else if (!param.optional) {
          // For required params, use default if available
          if (param.defaultValue !== undefined) {
            params[param.name] = param.defaultValue;
          }
        }
      });

      const startTime = performance.now();
      const res = await onExecute(params);
      const endTime = performance.now();
      const duration = endTime - startTime;

      setResult(res);
      setExecutionTime(duration);

      // Check if result came from cache (if it has a _cached property)
      if (res && typeof res === 'object' && '_cached' in res) {
        setFromCache(res._cached);
      }
    } catch (err: any) {
      setError(err.message || 'Execution failed');
      console.error(`[MethodExecutor] ${methodName} failed:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '6px',
      marginBottom: '10px',
      overflow: 'hidden'
    }}>
      <div
        style={{
          padding: '12px 15px',
          background: isExpanded ? '#f0f0f0' : '#fafafa',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isExpanded ? '1px solid #ddd' : 'none'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px' }}>
            {methodName}()
          </span>
          <span style={{ color: '#666', fontSize: '13px', marginLeft: '10px' }}>
            {description}
          </span>
        </div>
        <span style={{ fontSize: '18px' }}>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div style={{ padding: '15px' }}>
          {/* Parameters Form */}
          {parameters.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '13px' }}>
                Parameters:
              </div>
              {parameters.map(param => (
                <div key={param.name} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
                    {param.name}
                    {!param.optional && <span style={{ color: '#f44336' }}> *</span>}
                    {param.description && <span style={{ fontStyle: 'italic', marginLeft: '5px' }}>
                      - {param.description}
                    </span>}
                  </label>

                  {param.type === 'select' ? (
                    <select
                      value={paramValues[param.name] || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value, param.type)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">-- Select --</option>
                      {param.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : param.type === 'boolean' ? (
                    <select
                      value={paramValues[param.name] !== undefined ? String(paramValues[param.name]) : ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value, param.type)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">-- Select --</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : param.type === 'json' ? (
                    <textarea
                      value={paramValues[param.name] || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value, param.type)}
                      placeholder={param.defaultValue ? JSON.stringify(param.defaultValue, null, 2) : '{}'}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        minHeight: '80px'
                      }}
                    />
                  ) : (
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={paramValues[param.name] !== undefined ? paramValues[param.name] : ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value, param.type)}
                      placeholder={param.defaultValue ? String(param.defaultValue) : ''}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={isLoading}
            style={{
              padding: '8px 20px',
              background: isLoading ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            {isLoading ? 'Executing...' : 'Execute'}
          </button>

          {/* Execution Info */}
          {executionTime !== null && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              Execution time: {executionTime.toFixed(2)}ms
              {cacheIndicator && fromCache && (
                <span style={{ marginLeft: '10px', color: '#4caf50', fontWeight: 'bold' }}>
                  ● FROM CACHE
                </span>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              background: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '4px',
              color: '#c62828',
              fontSize: '13px'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Result Display */}
          {result !== null && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                Result:
              </div>
              {resultRenderer ? (
                resultRenderer(result)
              ) : (
                <pre style={{
                  background: '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  border: '1px solid #ddd'
                }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
