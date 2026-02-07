export const id = 'getting_started';
export const title = 'Getting Started';
export const order = 1;

export const content = `
## Overview

R.AI is a professional AI-powered medical note generation tool for Reproductive Endocrinology and Infertility (REI). It transforms clinical information into structured medical notes using customizable templates and large language models.

## Workflow

The core workflow follows three steps:

### 1. Select a Template

Choose a note template from the **Select Template** view. Templates define the structure of your output note using \`{{VARIABLE_NAME}}\` placeholders. Both built-in and custom templates are available.

### 2. Input Information

Collect clinical information in the **Input Information** view. You can enter information via:

- **Text mode** — Type or paste clinical data directly
- **Voice mode** — Dictate using the voice agent (requires microphone access)

The voice agent uses TIVI (Tidyscripts Voice Interface) for real-time speech recognition with configurable voice activity detection.

### 3. Generate Note

In the **Generate Note** view, the AI processes your collected information against the selected template to produce a structured medical note. You can:

- Edit the generated note inline
- Navigate through edit checkpoints (undo/redo history)
- Copy the final note to clipboard

## Additional Features

- **Template Editor** — Create, edit, and manage custom note templates
- **Dot Phrases** — Quick-insert text snippets using \`.\` prefix shortcuts
- **Test Interface** — Compare note generation across multiple AI models (requires Advanced Features in Settings)
- **Settings** — Configure AI models, voice settings, storage backend, and more
`;
