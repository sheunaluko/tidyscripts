/**
 * File System Functions for Lotus
 *
 * Local file system operations for the Lotus agent
 */

import * as fs from 'fs/promises'
import * as path from 'path'

export const file_system_functions = [
  {
    enabled: true,
    description: "Read a file from the local file system. Provide absolute or relative path.",
    name: "read_file",
    parameters: { path: "string" },
    fn: async (ops: any) => {
      const { path: filePath } = ops.params
      const { log } = ops.util

      log(`Reading file: ${filePath}`)
      const content = await fs.readFile(filePath, 'utf-8')
      log(`Read ${content.length} characters`)

      return content
    },
    return_type: "string"
  },
  {
    enabled: true,
    description: "Write content to a file on the local file system. Creates parent directories if needed.",
    name: "write_file",
    parameters: { path: "string", content: "string" },
    fn: async (ops: any) => {
      const { path: filePath, content } = ops.params
      const { log } = ops.util

      log(`Writing to file: ${filePath}`)

      // Create parent directory if needed
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(filePath, content, 'utf-8')
      log(`Wrote ${content.length} characters`)

      return `Successfully wrote ${content.length} characters to ${filePath}`
    },
    return_type: "string"
  },
  {
    enabled: true,
    description: "List files and directories in a directory",
    name: "list_directory",
    parameters: { path: "string" },
    fn: async (ops: any) => {
      const { path: dirPath } = ops.params
      const { log } = ops.util

      log(`Listing directory: ${dirPath}`)
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      const result = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, entry.name)
      }))

      log(`Found ${result.length} entries`)
      return result
    },
    return_type: "array"
  },
  {
    enabled: true,
    description: "Check if a file or directory exists",
    name: "file_exists",
    parameters: { path: "string" },
    fn: async (ops: any) => {
      const { path: filePath } = ops.params
      const { log } = ops.util

      try {
        await fs.access(filePath)
        log(`Path exists: ${filePath}`)
        return true
      } catch {
        log(`Path does not exist: ${filePath}`)
        return false
      }
    },
    return_type: "boolean"
  },
  {
    enabled: true,
    description: "Delete a file from the file system",
    name: "delete_file",
    parameters: { path: "string" },
    fn: async (ops: any) => {
      const { path: filePath } = ops.params
      const { log } = ops.util

      log(`Deleting file: ${filePath}`)
      await fs.unlink(filePath)
      log(`Deleted: ${filePath}`)

      return `Successfully deleted ${filePath}`
    },
    return_type: "string"
  },
  {
    enabled: true,
    description: "Create a directory. Creates parent directories if needed.",
    name: "create_directory",
    parameters: { path: "string" },
    fn: async (ops: any) => {
      const { path: dirPath } = ops.params
      const { log } = ops.util

      log(`Creating directory: ${dirPath}`)
      await fs.mkdir(dirPath, { recursive: true })
      log(`Created: ${dirPath}`)

      return `Successfully created directory ${dirPath}`
    },
    return_type: "string"
  },
  {
    enabled: true,
    description: "Get file or directory information (size, type, modification time)",
    name: "get_file_info",
    parameters: { path: "string" },
    fn: async (ops: any) => {
      const { path: filePath } = ops.params
      const { log } = ops.util

      log(`Getting info for: ${filePath}`)
      const stats = await fs.stat(filePath)

      const info = {
        size: stats.size,
        type: stats.isDirectory() ? 'directory' : 'file',
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString()
      }

      log(`Info retrieved for: ${filePath}`)
      return info
    },
    return_type: "object"
  }
]
