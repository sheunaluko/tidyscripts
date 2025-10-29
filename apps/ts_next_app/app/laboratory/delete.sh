#!/bin/bash

# Script to delete a laboratory app and remove it from the menu
# Usage: ./delete.sh [app_name]

set -e

# Get list of available apps (directories with page.tsx)
get_available_apps() {
    local apps=()
    for dir in */; do
        # Skip src directory and any hidden directories
        if [ "$dir" != "src/" ] && [ -f "${dir}page.tsx" ]; then
            apps+=("${dir%/}")
        fi
    done
    echo "${apps[@]}"
}

# If app name is provided as argument
if [ -n "$1" ]; then
    # Normalize app name: convert to lowercase and spaces to underscores
    APP_NAME=$(echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')

    # Check if directory exists
    if [ ! -d "$APP_NAME" ]; then
        echo "Error: Directory $APP_NAME does not exist!"
        echo ""
        echo "Run ./delete.sh without arguments to see available apps."
        exit 1
    fi
else
    # No argument provided, show interactive menu
    echo "Available laboratory apps:"
    echo ""

    # Get apps into an array
    mapfile -t APPS < <(get_available_apps | tr ' ' '\n' | sort)

    if [ ${#APPS[@]} -eq 0 ]; then
        echo "No apps found!"
        exit 1
    fi

    # Display numbered list
    for i in "${!APPS[@]}"; do
        # Convert underscore to space and capitalize for display
        display_name=$(echo "${APPS[$i]}" | tr '_' ' ' | awk '{for(j=1;j<=NF;j++) $j=toupper(substr($j,1,1)) tolower(substr($j,2));}1')
        printf "%2d. %s (%s)\n" $((i+1)) "$display_name" "${APPS[$i]}"
    done

    echo ""
    echo "Enter the number of the app to delete (or 'q' to quit):"
    read -r selection

    # Check if user wants to quit
    if [[ "$selection" == "q" ]] || [[ "$selection" == "Q" ]]; then
        echo "Cancelled."
        exit 0
    fi

    # Validate selection
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#APPS[@]} ]; then
        echo "Error: Invalid selection!"
        exit 1
    fi

    # Get the selected app name
    APP_NAME="${APPS[$((selection-1))]}"
fi

# Convert app_name to display title for confirmation
DISPLAY_TITLE=$(echo "$APP_NAME" | tr '_' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1')

# Confirm deletion
echo ""
echo "Selected app: $DISPLAY_TITLE ($APP_NAME)"
echo "This will delete the directory: $APP_NAME"
echo ""
echo "Are you sure you want to continue? (y/n)"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Deletion cancelled."
    exit 0
fi

# Delete the directory
echo "Deleting directory: $APP_NAME"
rm -rf "$APP_NAME"
echo "✓ Deleted $APP_NAME directory"

# Ask if user wants to remove from menu
echo ""
echo "Would you like to remove it from the menu in index.tsx? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # Create a backup
    cp index.tsx index.tsx.backup
    echo "✓ Backup created at index.tsx.backup"

    # Remove the menu entry using awk
    # This looks for MLink blocks that contain the app_name in the href
    awk -v app="$APP_NAME" '
        # Track if we are inside a MLink block for our app
        /<MLink href="\/laboratory\/'$APP_NAME'">/ {
            in_block=1
            next
        }

        # If we are in the block, skip lines until we find the closing MLink
        in_block {
            if (/<\/MLink>/) {
                in_block=0
                next
            }
            next
        }

        # Print all other lines
        { print }
    ' index.tsx.backup > index.tsx

    echo "✓ Removed $APP_NAME from laboratory menu"

    # Show what was removed
    echo ""
    echo "Removed menu entry for: /laboratory/$APP_NAME"
else
    echo "Skipping menu update. You can manually remove it later."
fi

echo ""
echo "Done! App $APP_NAME has been deleted."
