# ✅ Slack Approval Bot (FutureBlink Task)

Hey there! 👋

This is a simple Slack bot I put together for the FutureBlink developer task. The main idea was to create a straightforward way for people inside a Slack workspace to request approval for something from someone else, right within Slack itself.

Basically, someone (the "Requester") can trigger a command, fill out a quick form saying who needs to approve it (the "Approver") and what it's about, and hit submit. The bot then sends a message directly to the Approver with "Approve" and "Reject" buttons. When the Approver clicks one, the bot lets the original Requester know the outcome, including what they originally asked for. Pretty neat, right?

## ✨ What it Does (Features)

- **Slash Command:** Kicks things off using `/approval-test`.
- **Pop-up Form (Modal):** When you run the command, a modal appears asking for:
  - Who should approve the request (using Slack's user dropdown).
  - The details/reason for the approval (a text area).
- **Sends to Approver:** Once submitted, the bot DMs the chosen Approver with the request details and those important Approve/Reject buttons.
- **Handles Buttons:** Listens for clicks on the Approve/Reject buttons.
- **Notifies Requester:** Sends a DM back to the original Requester telling them if it was Approved or Rejected, _and_ includes the text of their original request so they know what it refers to!
- **Updates Approver's Message:** After a button is clicked, the original message sent to the approver gets updated to show the decision was made (so no accidental double-clicks!).

## 🛠️ Tech Stack

Built this little guy using:

- **Node.js:** The JavaScript runtime environment.
- **@slack/bolt:** Slack's official framework for building apps in JavaScript. It handles a lot of the tricky Slack API stuff and web server setup (using Express.js under the hood) which is super helpful.
- **dotenv:** To manage secret stuff like API tokens without putting them directly in the code.

## ⚙️ Prerequisites (What You'll Need)

Before you can get this running, make sure you have:

1.  **Node.js and npm:** Installed on your machine (LTS version is usually best).
2.  **A Slack Workspace:** You need a place where you have permission to install apps. A free workspace is totally fine for this.
3.  **ngrok:** This tool lets Slack talk to your local machine during development.
    - **Important:** Sign up for a free ngrok account! This lets you get a _fixed_ subdomain (URL) so you don't have to update Slack every single time you restart ngrok. It saves a ton of hassle. Follow their steps to add your authtoken.
4.  **Git:** To clone this repository, of course.

## 🚀 Getting Set Up & Running

Alright, here’s how to get it working:

1.  **Clone the Repo:**

    ```bash
    git clone <your-repo-url>
    cd <your-repo-folder>
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Set Up Your Slack App:** This is the most involved part:

    - Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click "Create New App" (from scratch).
    - Give it a name and choose your development workspace.
    - **Grab Credentials:**
      - Go to "Basic Information" -> "App Credentials" -> Copy the **Signing Secret**.
      - Go to "OAuth & Permissions" -> "Install to Workspace" (you'll need to add scopes first). Authorize it. Copy the **Bot User OAuth Token** (starts with `xoxb-`).
    - **Add Bot Token Scopes** (under "OAuth & Permissions"): You absolutely need these:
      - `commands`: For the slash command.
      - `chat:write`: To send messages.
      - `users:read`: To get the list of users for the dropdown.
      - `im:write`: To make sure it can start DMs if needed.
    - **Configure Slash Command:**
      - Go to "Features" -> "Slash Commands" -> "Create New Command".
      - **Command:** `/approval-test`
      - **Request URL:** Leave blank _for now_.
      - Add a Short Description. Save.
    - **Enable Interactivity:**
      - Go to "Features" -> "Interactivity & Shortcuts".
      - Toggle Interactivity **ON**.
      - **Request URL:** Leave blank _for now_. Save.

4.  **Set up ngrok (with your fixed domain):**

    - Make sure you've added your authtoken (see Prerequisites).
    - Run ngrok, pointing it to the port your app will use (default is 3000), and specify your _unique_ domain:
      ```bash
      # Replace 'your-cool-approval-bot' with your chosen unique name!
      ngrok https --url=your-cool-approval-bot.ngrok-free.app 3000
      ```
    - Copy the `https` URL ngrok gives you (e.g., `https://your-cool-approval-bot.ngrok-free.app`). This is your stable URL!

5.  **Update Slack App Request URLs:**

    - Go back to your Slack App settings (`api.slack.com`).
    - Paste your stable ngrok URL + `/slack/events` into _both_ the **Request URL** field for your Slash Command _and_ the **Request URL** field under Interactivity & Shortcuts.
      - Example: `https://your-cool-approval-bot.ngrok-free.app/slack/events`
    - Save the changes in Slack! You might need to reinstall the app ("Settings" -> "Install App") for the URL changes to fully take effect.

6.  **Create Your `.env` File:**

    - In the project root, create a file named `.env`.
    - Copy the contents of `.env.example` (if you made one) or add the following, pasting in the credentials you copied from Slack earlier:
      ```dotenv
      # Make sure this file is in your .gitignore and NEVER commit it!
      SLACK_SIGNING_SECRET=PASTE_YOUR_SIGNING_SECRET_HERE
      SLACK_BOT_TOKEN=xoxb-PASTE_YOUR_BOT_TOKEN_HERE
      PORT=3000 # Or another port if 3000 is busy
      ```

7.  **Run the App:**
    - Make sure ngrok is still running in its own terminal!
    - In your project terminal, start the bot:
      ```bash
      node app.js
      ```
    - You should see `⚡️ Bolt app is running on port 3000` (or your chosen port).

## ▶️ How to Use It

It's pretty simple:

1.  **Requester:** Go to any channel or DM in your Slack workspace and type `/approval-test`.
2.  **Requester:** The modal (popup) will appear. Select the person who needs to approve it from the dropdown, type your reason/request in the text box, and hit "Submit".
3.  **Approver:** The chosen approver will instantly get a Direct Message from the bot containing the request details and the "Approve" / "Reject" buttons.
4.  **Approver:** Clicks either "Approve" or "Reject".
5.  **Requester:** Gets a Direct Message back from the bot saying if the request (including the original text) was approved or rejected, and by whom. Done!
