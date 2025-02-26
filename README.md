# Table of Contents

-   [Winnie Blues Discord Bot](#winnie-blues-discord-bot)
    -   [Pre-setup](#pre-setup)
    -   [Installation Instructions](#installation-instructions)
        -   [Setting Up the Environment](#setting-up-the-environment)
        -   [Configuring The Bot](#configuring-the-bot)
        -   [Running the Bot](#running-the-bot)
        -   [Bot Permissions](#bot-permissions)
    -   [Features](#features)
        -   [Auto-Tracking](#auto-tracking)
        -   [Reactions](#reactions)
        -   [Role Management](#role-management)
        -   [Commands](#commands)
        -   [Status Updates](#status-updates)

## Pre-setup

-   **Install Node.js**:

    -   Download and install the latest "LTS" version of Node.js [here](https://nodejs.org/en/download).
    -   Open `Command Prompt` or `PowerShell`.
    -   Run `node -v` and `npm -v` to ensure Node.js and npm are properly installed.

-   **Install Git**:
    -   Download and install Git from [Git SCM](https://git-scm.com/download/win).
    -   Open `Command Prompt` or `PowerShell`.
    -   Run `git --version` to verify that Git is correctly installed.

## Installation Instructions

### Setting Up the Environment

-   **Clone the Repository**:
    -   Open `Command Prompt` or `PowerShell`.
    -   Run `git clone https://github.com/R0310F/winnie-blues-bot` to clone the bots repository to your local machine.
-   **Navigate to the Project Directory**:
    -   Change directory by running `cd [project-directory-name]`.

### Configuring The Bot

-   **Install Dependencies**:
    -   In the project directory, run `npm install` to install all required dependencies.
-   **Set Up Environment Variables**:

    -   Create a `./src/config/index.js` or `./src/config.js` file in the root directory of the project.
    -   Add the following lines, replacing placeholders with actual values:

        ```
        // Set to true if your application has extra commands that need to be cleared
        module.exports.CLEAR_BOT_COMMANDS = false;
        // Set to true if you need to register the rsn or highscore command
        module.exports.REGISTER_BOT_COMMANDS = false;

        module.exports.DISCORD_BOT_TOKEN = 'yourBotToken';

        module.exports.WOM_USER_AGENT = '@yourDiscordHandle';
        module.exports.WOM_API_KEY = 'yourApiKeyOrBlank';
        module.exports.WOM_GROUP_NUMBER = 'yourGroupNumber';
        module.exports.WOM_SECURITY_CODE = 'groupSecurityCode';

        module.exports.EXCLUDED_ROLES = new Set([
        'owner','deputy owner','coordinator',
        'admin','saviour','server bots',
        ]);
        ```

### Running the Bot

-   **Start the Bot**:
    -   Run `npm run start` from the project directory to start the bot.

### Bot Permissions

When invited to a server, the bot creates a `@<bot-name>` role.

-   Position this role above others that it will manage and below any sensitive roles.
-   Give the `@<bot-name>` role these permissions:
    -   Manage Roles
    -   Manage Nicknames

## Features

### Automated Rank-Roles

-   Every minute the bot utilizes the WiseOldMan API to fetch a map of all
    in-game member rsns and their rank.
-   The bot then looks up all members in all of its Discord servers, and checks if their nickname matches an in-game rsn.
-   Multiple RSNs are supported in member nicknames, use: `|`, `&` or `/` to delimit each RSN.
    -   e.g. If a member has the nickname `"Roelof | Foleor / Loroef"`, we split, trim and collect each RSN.<br>Which
        results in: `"Roelof", "Foleor", "Loroef"`.
-   Members whose nickname matches one of the in-game rsns are assigned their rank-roles automatically.
    -   The bot will automatically create rank-roles as required, if they do not exist in the server.
    -   For members with multiple names, all names are looked up and the highest applicable rank-role is given to the
        user.
    -   There are explicit restrictions preventing `@Saviour`, `@Deputy Owner`, or `@Owner` from automatically being
        assigned.
    -   Members whose nickname doesn't match an in-game rsn are given the `@Guest` rank-role.

### Commands

-   **`/rsn <your-rsn>`** sets the supplied rsn as the users nickname in the server.
-   **`/highscore <type>`** sends embeds for the selected highscores.

### Reactions

-   **Reacts** with 🫡 to all messages sent in the `#🥳-⊱newcomers` channel.

### Status Updates

-   **Updates** the bot's status **every minute** with random stats from the clan.
-   **Caches** data for 1 hour.

### Group Updates

-   **Updates** the WiseOldMan group every `6th hour` (e.g. 00:00, 06:00, 12:00, 18:00).
