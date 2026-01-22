/**
 * Lotus Functions - Node-specific functions for local agent
 */

import { file_system_functions } from './file_system'
import { shell_functions } from './shell'

export const lotus_functions = [
  // Core response function
  {
    enabled: true,
    description: "Function for responding to the user",
    name: "respond_to_user",
    parameters: { response: "string" },
    fn: async (ops: any) => {
      const { user_output, log } = ops.util
      const { response } = ops.params

      log(`user response: ${String(response)}`)
      await user_output(response)

      return `Responded to user with: ${response}`
    },
    return_type: "string"
  },

  // File system functions
  ...file_system_functions,

  // Shell functions
  ...shell_functions,

  // Add more function groups as needed
]

// Export individual function groups for flexibility
export { file_system_functions } from './file_system'
export { shell_functions } from './shell'
