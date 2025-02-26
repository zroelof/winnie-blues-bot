#!/bin/bash

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root or via sudo"
    exit 1
fi

BASE_DIRECTORY_PATH="/opt/winnies"

download_files() {
    local path="$1"
    local target_directory="$2"

    echo "Downloading path: $path to $target_directory"

    # Create a timestamp to avoid API caching issues
    local timestamp=$(date +%s)
    local api_url="https://api.github.com/repos/zroelof/winnie-blues-bot/contents/$path?$timestamp"

    API_RESPONSE=$(curl -s "$api_url")

    # Check for API errors
    if echo "$API_RESPONSE" | grep -q "\"message\""; then
        echo "Error fetching the files from GitHub for path '$path':"
        echo "$API_RESPONSE" | jq -r .message
        return 1
    fi

    # Create target directory if it doesn't exist
    mkdir -p "$target_directory"

    # Process each item from API response
    echo "$API_RESPONSE" | jq -c '.[]' | while IFS= read -r item; do
        type=$(echo "$item" | jq -r .type)
        name=$(echo "$item" | jq -r .name)

        if [[ "$type" == "file" ]]; then
            DOWNLOAD_URL=$(echo "$item" | jq -r .download_url)
            echo "Downloading file: $name from $DOWNLOAD_URL"
            curl -s -L "$DOWNLOAD_URL" -o "$target_directory/$name"
            echo "Updated $target_directory/$name"
        elif [[ "$type" == "dir" ]]; then
            # For directories, use the full path from the API
            new_path=$(echo "$item" | jq -r .path)
            new_target="$BASE_DIRECTORY_PATH/$new_path"
            echo "Processing directory: $new_path to $new_target"
            download_files "$new_path" "$new_target"
        fi
    done
}

# Backup config file if it exists
CONFIG_FILE="$BASE_DIRECTORY_PATH/src/config/index.js"
if [ -f "$CONFIG_FILE" ]; then
    echo "Backing up config file: $CONFIG_FILE"
    mkdir -p /tmp/winnie-backup
    cp "$CONFIG_FILE" /tmp/winnie-backup/index.js
fi

# Clear existing directory while preserving config directory and node_modules
if [ -d "$BASE_DIRECTORY_PATH" ]; then
    echo "Removing existing directory: $BASE_DIRECTORY_PATH (preserving config and node_modules)"
    find "$BASE_DIRECTORY_PATH" -mindepth 1 \
        -not -path "$BASE_DIRECTORY_PATH/src/config*" \
        -not -path "$BASE_DIRECTORY_PATH/node_modules*" \
        -delete
fi

# Create base directory
mkdir -p "$BASE_DIRECTORY_PATH"

# Start the download process from the root
download_files "" "$BASE_DIRECTORY_PATH"

# Restore config file if it was backed up
if [ -f "/tmp/winnie-backup/index.js" ]; then
    echo "Restoring config file to $CONFIG_FILE"
    mkdir -p "$BASE_DIRECTORY_PATH/src/config"
    cp "/tmp/winnie-backup/index.js" "$CONFIG_FILE"
    rm -rf /tmp/winnie-backup
fi

echo "Repository successfully downloaded to $BASE_DIRECTORY_PATH"