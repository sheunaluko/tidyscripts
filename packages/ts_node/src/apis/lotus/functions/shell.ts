/**
 * Shell Functions for Lotus
 *
 * Local shell command execution for the Lotus agent
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const shell_functions = [
  {
    enabled: true,
    description: "Execute a shell command locally. Returns stdout and stderr.",
    name: "execute_command",
    parameters: { command: "string" },
    fn: async (ops: any) => {
      const { command } = ops.params
      const { log } = ops.util

      log(`Executing command: ${command}`)

      try {
        const { stdout, stderr } = await execAsync(command)

        log(`Command completed`)
        if (stderr) log(`stderr: ${stderr}`)

        return {
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        }
      } catch (error: any) {
        log(`Command failed: ${error.message}`)
        return {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || error.message
        }
      }
    },
    return_type: "object"
  },
  {
    enabled: true,
    description: "Get the current working directory",
    name: "get_cwd",
    parameters: null,
    fn: async (ops: any) => {
      const { log } = ops.util
      const cwd = process.cwd()
      log(`Current directory: ${cwd}`)
      return cwd
    },
    return_type: "string"
  },
  {
    enabled: true,
    description: "Change the current working directory",
    name: "change_directory",
    parameters: { path: "string" },
    fn: async (ops: any) => {
      const { path } = ops.params
      const { log } = ops.util

      log(`Changing directory to: ${path}`)
      process.chdir(path)
      const newCwd = process.cwd()
      log(`Changed to: ${newCwd}`)

      return `Changed directory to ${newCwd}`
    },
    return_type: "string"
  },
  {
    enabled: true,
    description: "Get environment variable value",
    name: "get_env_var",
    parameters: { name: "string" },
    fn: async (ops: any) => {
      const { name } = ops.params
      const { log } = ops.util

      const value = process.env[name]
      log(`Environment variable ${name}: ${value ? 'set' : 'not set'}`)

      return value || null
    },
    return_type: "string"
  }
]
