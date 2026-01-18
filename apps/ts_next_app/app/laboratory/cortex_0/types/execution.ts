export interface ExecutionSnapshot {
  executionId: string;
  timestamp: number;
  code: string;
  status: 'success' | 'error';
  error?: string;
  duration: number;
  functionCalls: FunctionCallEvent[];
  variableAssignments: VariableAssignment[];
  sandboxLogs: SandboxLog[];
}

export interface FunctionCallEvent {
  name: string;
  args: any[];
  result?: any;
  duration?: number;
  error?: string;
  timestamp: number;
  callId: string;
  status?: 'running' | 'success' | 'error';
}

export interface VariableAssignment {
  name: string;
  value: any;
  timestamp: number;
}

export interface SandboxLog {
  level: 'log' | 'error' | 'warn' | 'info';
  args: any[];
  timestamp: number;
}
