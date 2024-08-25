#!/bin/bash

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root or via sudo"
    exit 1
fi

BASE_DIRECTORY_PATH="/opt/winnies"

download_files() {
    local path="$1"
    local target_directory="$2"
    API_RESPONSE=$(curl -s "https://api.github.com/repos/zroelof/winnie-blues-bot/contents/$path?$(date +%s)")
    if echo "$API_RESPONSE" | grep -q "message"; then
        echo "Error fetching the files from GitHub for path $path:"
        echo "$API_RESPONSE" | jq -r .message
        exit 1
    fi
    mkdir -p "$target_directory"
    echo "$API_RESPONSE" | jq -c '.[]' | while IFS= read -r item; do
        type=$(echo "$item" | jq -r .type)
        if [[ "$type" == "file" ]]; then
            FILE_NAME=$(echo "$item" | jq -r .name)
            DOWNLOAD_URL=$(echo "$item" | jq -r .download_url)
            curl -s "$DOWNLOAD_URL" -o "$target_directory/$FILE_NAME"
            echo "Updated $target_directory/$FILE_NAME"
        elif [[ "$type" == "dir" ]]; then
            new_path=$(echo "$item" | jq -r .path)
            download_files "$new_path" "$target_directory/$(basename $new_path)"
        fi
    done
}

download_files "" "$BASE_DIRECTORY_PATH"