export const id = 'templates';
export const title = 'Templates';
export const order = 3;

export const content = `
## Template System

Templates are the backbone of R.AI's note generation. Each template defines the structure of a medical note using placeholder variables that get filled by the AI based on your clinical input.

### Template Syntax Guide

Templates support three types of variable syntax for dynamic content:

#### Presence/Absence (one | separator)

\`\`\`
{{ @variable | fallback }}
\`\`\`

- If variable has data → use the variable value
- If variable absent → use fallback text

Examples:
- \`{{ @reason | consultation }}\` → "initial fertility workup" OR "consultation"
- \`{{ Semen analysis: @results | f/u semen analysis }}\` → "Semen analysis: 15M/mL" OR "f/u semen analysis"

> Text before/after @variable (prefix/postfix) is included only when the variable is present.

#### Boolean (three | separators, variable ends with ?)

\`\`\`
{{ @variable? | text_if_true | text_if_false | text_if_undefined }}
\`\`\`

- If variable is true/yes → use first text
- If variable is false/no → use second text
- If variable is undefined/missing → use third text

Examples:
- \`{{ @needs_appointment? | [ ] schedule appointment | no appointment needed | appointment status unknown }}\`
- \`{{ @is_male? | Male factor evaluation | Female factor evaluation | Gender not specified }}\`
- \`{{ @smoking? | Patient smokes | Non-smoker | Smoking history not documented }}\`

> Use the ? suffix to indicate boolean variables. All three conditions must be provided.

#### Traditional (legacy)

\`\`\`
{{VARIABLE_NAME}}
\`\`\`

Simple placeholder replacement using all uppercase letters and underscores.

Examples: \`{{PATIENT_NAME}}\` → "John Doe" • \`{{VISIT_DATE}}\` → "2024-03-15"

#### Template End Marker

\`\`\`
@END_TEMPLATE
\`\`\`

Content after this marker is visible to the voice agent but hidden from the note generator. Use this to give voice agent instructions about required fields and collection strategy.

Example:
\`\`\`
# Template Content
{{ @age | not documented }}
{{ @consult_needed? | Yes | No | Not assessed }}

@END_TEMPLATE

## VOICE AGENT INSTRUCTIONS
### REQUIRED FIELDS
Make sure I specify: age, consult_needed

### COLLECTION STRATEGY
1. Always ask patient age if not mentioned
2. Confirm whether specialist consult is needed
\`\`\`

### Default Templates

R.AI ships with built-in templates for common REI note types. These cannot be edited or deleted, but you can create custom variants based on them.

### Custom Templates

Create your own templates in the **Template Editor**:

1. Navigate to **Template Editor** from the sidebar
2. Click **Create New Template**
3. Enter a title, description, and template body
4. Use any of the variable syntax patterns above
5. The preview panel shows extracted variables and validation status
6. Save — your template appears alongside defaults in the template picker

Custom templates are persisted via the active storage backend (local or cloud).

### Template Validation

The editor validates templates in real-time:

- Variables must use a recognized syntax pattern
- Duplicate variable names are flagged
- Empty templates are rejected
- Preview shows how the template will be parsed

### Dot Phrases

Dot phrases are quick-insert text snippets available during information input. Type a \`.\` prefix to trigger autocomplete with your saved phrases. Manage them in **Settings > Dot Phrases**.
`;
