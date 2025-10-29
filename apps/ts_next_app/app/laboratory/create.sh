#!/bin/bash

# Script to create a new laboratory app with boilerplate code
# Usage: ./create.sh <app_name>

set -e

# Check if app name is provided
if [ -z "$1" ]; then
    echo "Usage: ./create.sh <app_name>"
    echo "Example: ./create.sh my_cool_app"
    echo "         ./create.sh \"My Cool App\""
    exit 1
fi

# Normalize app name: convert to lowercase and spaces to underscores
APP_NAME=$(echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')

# Convert app_name to display title: underscores to spaces, capitalize each word
DISPLAY_TITLE=$(echo "$APP_NAME" | tr '_' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1')

# Convert app_name to PascalCase for component name
COMPONENT_NAME=$(echo "$APP_NAME" | sed 's/_\([a-z]\)/\U\1/g' | sed 's/^\([a-z]\)/\U\1/')

echo "App name (filename): $APP_NAME"
echo "Display title: $DISPLAY_TITLE"
echo "Component name: $COMPONENT_NAME"
echo ""

# Prompt for description
echo "Enter a description for this app:"
read -r DESCRIPTION

if [ -z "$DESCRIPTION" ]; then
    DESCRIPTION="A laboratory application"
fi

echo ""
echo "Creating laboratory app..."

# Create directory
if [ -d "$APP_NAME" ]; then
    echo "Error: Directory $APP_NAME already exists!"
    exit 1
fi

mkdir "$APP_NAME"
cd "$APP_NAME"

# Create the main component file
cat > "${APP_NAME}.tsx" << EOF
'use client';

import React from 'react';
import { Button, Typography, Container, Box } from '@mui/material';

const ${COMPONENT_NAME} = () => {
  return (
    <Container>
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='100%'>
        <div>
          <Typography variant='h4' gutterBottom>
            ${DISPLAY_TITLE}
          </Typography>
          <Typography variant='body1' gutterBottom>
            ${DESCRIPTION}
          </Typography>
          <Button variant='contained' color='primary'>
            Click Me
          </Button>
        </div>
      </Box>
    </Container>
  );
};

export default ${COMPONENT_NAME};
EOF

# Create page.tsx
cat > "page.tsx" << EOF
import ${COMPONENT_NAME} from './${APP_NAME}'

export default ${COMPONENT_NAME} ;
EOF

echo "✓ Created ${APP_NAME}/${APP_NAME}.tsx"
echo "✓ Created ${APP_NAME}/page.tsx"

# Ask if user wants to add to menu
echo ""
echo "App created successfully at: $(pwd)"
echo ""
echo "Would you like to automatically add it to the menu? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    cd ..

    # Create the menu entry
    MENU_ENTRY="
\t  <MLink href=\"/laboratory/${APP_NAME}\">
\t      <Card style={card_style}>
\t\t  <Typography variant=\"h5\" color=\"primary\">${DISPLAY_TITLE}</Typography>
\t\t  <p>
\t\t      ${DESCRIPTION}
\t\t  </p>
\t      </Card >
\t  </MLink>
"

    # Create a backup
    cp index.tsx index.tsx.backup

    # Insert the menu entry before the closing comment section
    awk -v entry="$MENU_ENTRY" '
        /\{\/\*/ && !inserted {
            print entry
            inserted=1
        }
        { print }
    ' index.tsx.backup > index.tsx

    echo "✓ Added ${APP_NAME} to laboratory menu"
    echo "✓ Backup created at index.tsx.backup"
else
    echo "Skipping menu update. You can manually add it later."
fi

echo ""
echo "Done! Your app is ready at /laboratory/${APP_NAME}"
