![image](https://github.com/R0310F/winnie-blues-bot/assets/40754039/c06328a9-b3c3-4ad3-93dc-88596f87eedd)![image](https://github.com/R0310F/winnie-blues-bot/assets/40754039/2acef9ff-9d63-467c-a20b-74796006eeeb)# Winnie Blues Discord Bot

# Table of Contents
- [Winnie Blues Discord Bot](#winnie-blues-discord-bot)
  - [Pre-setup](#pre-setup)
  - [Installation Instructions](#installation-instructions)
    - [Setting Up the Environment](#setting-up-the-environment)
    - [Configuring The Bot](#configuring-the-bot)
    - [Running the Bot](#running-the-bot)
    - [Bot Permissions](#bot-permissions)
  - [Features](#features)
    - [Auto-Tracking](#auto-tracking)
    - [Reactions](#reactions)
    - [Role Management](#role-management)
    - [Commands](#commands)
    - [Status Updates](#status-updates)

## Pre-setup

- **Install Node.js**:
    - Download and install the latest "LTS" version of Node.js [here](https://nodejs.org/en/download).
    - Open `Command Prompt` or `PowerShell`.
    - Run `node -v` and `npm -v` to ensure Node.js and npm are properly installed.

- **Install Git**:
    - Download and install Git from [Git SCM](https://git-scm.com/download/win).
    - Open `Command Prompt` or `PowerShell`.
    - Run `git --version` to verify that Git is correctly installed.

## Installation Instructions

### Setting Up the Environment

- **Clone the Repository**:
    - Open `Command Prompt` or `PowerShell`.
    - Run `git clone https://github.com/R0310F/winnie-blues-bot` to clone the bots repository to your local machine.
- **Navigate to the Project Directory**:
    - Change directory by running `cd [project-directory-name]`.

### Configuring The Bot

- **Install Dependencies**:
    - In the project directory, run `npm install` to install all required dependencies.
- **Set Up Environment Variables**:
    - Create a `.env` file in the root directory of the project.
    - Add the following lines, replacing placeholders with actual values:
      ```
      BOT_TOKEN=your_discord_bot_token
      WOM_API_KEY=your_wom_api_key
      WOM_GROUP_NUMBER=your_wom_group_number
      WOM_SECURITY_CODE=your_wom_security_code
      ```

### Running the Bot

- **Start the Bot**:
    - Run `npm run start` from the project directory to start the bot.

### Bot Permissions

When invited to a server, the bot creates a `@<bot-name>` role.

- Position this role above others that it will manage and below any sensitive roles.
- Give the `@<bot-name>` role these permissions:
    - Manage Roles
    - Manage Nicknames

## Features

### Auto-Tracking

- **Automatically refreshes** WOM group data nightly at midnight (AEST).

### Reactions

- **Reacts** with 🫡 to all messages sent in the ``#🥳-⊱newcomers`` channel
  
### Role Management

- **Synchronizes roles** from the WOM group every ``5th minute`` (e.g. xx:00, xx:05, xx:10, xx:15, etc...).
    - **Assigns roles** using the WOM Groups rank names (e.g., `@Recruit`, `@Monarch`, `@Senator`).
    - **Creates roles** if they don't exist.
    - Has explicit restrictions preventing `@Saviour`, `@Deputy Owner`, or `@Owner` from automatically being assigned.
        - Keep the ``@<bot-name`` role below these roles to be extra cautious. The bot cannot assign any roles above its own.
- **Looks up** each members Discord nickname in the WOM group. Members can have multiple RSNs in their nickname, as long as they have ``|``, ``&`` or ``/`` to delimit each RSN.
    - e.g. If a member has the nickname ``"Roelof | Foleor / Loroef"``, we split and collect each RSN.
    - For members with multiple names, all names are looked up in the WOM Group and the highest applicable role is given to the user.
- **Assigns `@Guest`** for any member whos nickname is not found in the WOM Group.

### Commands

- **`/rsn <your-rsn>`** sets the supplied rsn as the users nickname in the server.

### Status Updates

- **Updates** the bot's status **every minute** with random stats from the clan.
- **Fetches** new data from the WiseOldMan API every ``6th hour`` (e.g. 00:00, 06:00, 12:00, 18:00).
