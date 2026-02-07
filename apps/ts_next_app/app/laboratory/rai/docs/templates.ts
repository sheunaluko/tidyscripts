export const id = 'templates';
export const title = 'Templates';
export const order = 3;

export const content = `
## Template System

Templates are the backbone of R.AI's note generation. Each template defines the structure of a medical note using placeholder variables that get filled by the AI based on your clinical input.

### Template Structure

A template is plain text (or markdown) with \`{{VARIABLE_NAME}}\` placeholders:

\`\`\`
Patient: {{PATIENT_NAME}}
Date: {{DATE_OF_VISIT}}

History of Present Illness:
{{HPI}}

Assessment and Plan:
{{ASSESSMENT_AND_PLAN}}
\`\`\`

Variables are automatically extracted from the template text. The AI maps your collected clinical information to these variables during generation.

### Default Templates

R.AI ships with built-in templates for common REI note types. These cannot be edited or deleted, but you can create custom variants based on them.

### Custom Templates

Create your own templates in the **Template Editor**:

1. Navigate to **Template Editor** from the sidebar
2. Click **Create New Template**
3. Enter a title, description, and template body
4. Use \`{{VARIABLE_NAME}}\` syntax for any field the AI should fill
5. The preview panel shows extracted variables and validation status
6. Save — your template appears alongside defaults in the template picker

Custom templates are persisted via the active storage backend (local or cloud).

### Template Validation

The editor validates templates in real-time:

- Variables must use the \`{{NAME}}\` format
- Duplicate variable names are flagged
- Empty templates are rejected
- Preview shows how the template will be parsed

### Dot Phrases

Dot phrases are quick-insert text snippets available during information input. Type a \`.\` prefix to trigger autocomplete with your saved phrases. Manage them in **Settings > Dot Phrases**.
`;
