# Winnie Blues Discord Bot

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

- **Updates**: Automatically refreshes WOM group data nightly at midnight (AEST).

### Reactions

- Reacts with 🫡 to all messages sent in the ``#🥳-⊱newcomers`` channel
  
### Role Management

- **Sync Interval**: Synchronizes roles from the WOM group every ``5 minutes``.
- **Nickname Lookup**: Matches Discord nicknames to WOM group data. If the user has multiple RSNs (separated using any of `/&|`),
  the highest rank is assigned.
- **Role Assignment**: Assigns roles based on WOM rank names (e.g., `@Recruit`).
    - Automatically creates roles if they don't exist.
- **Exclusions**: Does not assign ranks of `Saviour`, `Deputy Owner`, or `Owner`.
- **Fallback Role**: Assigns `@guest` for users not found in the WOM group.

### Commands

- **Set RSN**: `/rsn <your-rsn>` sets the supplied rsn as the users nickname in the server, facilitating role
  synchronization.

### Status Updates

- **Frequency**: Changes the bot's status every minute with random stat from the clan.
- **Data Refresh**: Fetches new data from the WiseOldMan API every 6 hours.
