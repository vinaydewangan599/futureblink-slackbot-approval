// Load environment variables from a .env file
require("dotenv").config();

// Import the Slack Bolt package
const { App } = require("@slack/bolt");

// Verify that the required environment variables are set
if (!process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
  console.error(
    "Error: SLACK_SIGNING_SECRET and SLACK_BOT_TOKEN must be set in the .env file"
  );
  process.exit(1); // Exit the application if the variables are not set
}

// Initialize the Slack Bolt app with the bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN, // Bot token to authenticate with Slack
  signingSecret: process.env.SLACK_SIGNING_SECRET, // Signing secret to verify request authenticity
});

// --- Slash command handler ---
// Define a slash command that triggers the approval workflow
app.command(
  "/approval-test", // The name of the slash command
  async ({ ack, command, body, client, logger }) => {
    // Acknowledge the command request immediately
    await ack();

    try {
      // Open a modal view to collect approval request details
      const result = await client.views.open({
        trigger_id: body.trigger_id, // Trigger ID is required to open a view
        view: {
          type: "modal", // Type of view
          callback_id: "approval_modal_submit", // Unique identifier for the view
          title: {
            type: "plain_text",
            text: "Request Approval", // Title of the modal
          },
          submit: {
            type: "plain_text",
            text: "Submit", // Text for the submit button
          },
          close: {
            type: "plain_text",
            text: "Cancel", // Text for the cancel button
          },
          blocks: [
            // Input block for selecting the approver
            {
              type: "input",
              block_id: "approver_block", // Unique identifier for the block
              element: {
                type: "users_select", // Element for selecting a user from Slack
                placeholder: {
                  type: "plain_text",
                  text: "Select an approver", // Placeholder text
                },
                action_id: "approver_select_action", // Unique identifier for the action
              },
              label: {
                type: "plain_text",
                text: "Choose Approver", // Label for the input
              },
            },
            // Input block for the approval reason/text
            {
              type: "input",
              block_id: "request_text_block", // Unique identifier for the block
              element: {
                type: "plain_text_input",
                multiline: true, // Enable multi-line input for the text area
                action_id: "request_text_action", // Unique identifier for the action
              },
              label: {
                type: "plain_text",
                text: "Reason for Approval", // Label for the input
              },
            },
          ],
        },
      });
      logger.info("Modal opened for user:", command.user_id); // Log the event
    } catch (error) {
      logger.error("Error opening modal:", error); // Log any errors
    }
  }
);

// --- View submission handler ---
// Handle the submission of the approval request modal
app.view(
  "approval_modal_submit", // Callback ID of the view to handle
  async ({ ack, body, view, client, logger }) => {
    // Acknowledge the view submission immediately
    await ack();

    const requesterId = body.user.id; // ID of the user who submitted the modal
    const formData = view.state.values; // Data from the submitted form

    // Extract the selected approver and request text from the form data
    const selectedApproverId =
      formData.approver_block.approver_select_action.selected_user;
    const requestText = formData.request_text_block.request_text_action.value;

    // Validate that the required fields are not empty
    if (!selectedApproverId || !requestText) {
      logger.error("Form validation failed:", {
        selectedApproverId,
        requestText,
      });
      // Send an error message to the user if validation fails
      try {
        await client.chat.postMessage({
          channel: requesterId,
          text: "Sorry, something went wrong with your submission. Please ensure all fields are filled.",
        });
      } catch (e) {
        logger.error("Failed to send validation error message:", e);
      }
      return; // Stop processing if validation fails
    }

    // Construct the message to send to the approver
    const messageText = `Hi <@${selectedApproverId}>! 👋\n\n<@${requesterId}> has requested your approval for:\n\n\`\`\`${requestText}\`\`\`\n\nPlease review and respond below.`;

    // Create unique action IDs for the approve and reject buttons, encoding the requester ID
    const approveActionId = `approve_request_${requesterId}`;
    const rejectActionId = `reject_request_${requesterId}`;

    try {
      // Send a direct message to the selected approver with the approval request
      await client.chat.postMessage({
        channel: selectedApproverId, // Send DM to the approver
        text: messageText, // Fallback text for notifications
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: messageText,
            },
          },
          {
            type: "actions", // Block containing interactive elements (buttons)
            block_id: `approval_actions_${requesterId}`, // Unique block ID potentially useful later
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Approve",
                  emoji: true,
                },
                style: "primary", // Green button
                action_id: approveActionId, // Action ID includes requester info!
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Reject",
                  emoji: true,
                },
                style: "danger", // Red button
                action_id: rejectActionId, // Action ID includes requester info!
              },
            ],
          },
        ],
      });
      logger.info(
        `Approval request sent to ${selectedApproverId} from ${requesterId}`
      );

      // Notify the requester that the request has been sent
      await client.chat.postMessage({
        channel: requesterId,
        text: `Your approval request has been sent to <@${selectedApproverId}>.`,
      });
    } catch (error) {
      logger.error(
        `Error sending approval request message to ${selectedApproverId}:`,
        error
      );
      // Notify the requester if there was an error sending the request
      try {
        await client.chat.postMessage({
          channel: requesterId,
          text: `Sorry, there was an error sending your request to <@${selectedApproverId}>. Please try again later.`,
        });
      } catch (e) {
        logger.error("Failed to send failure notification:", e);
      }
    }
  }
);

// --- Action handler for approval/rejection buttons ---
// Handle the actions when the approver clicks the approve or reject button
app.action(
  /^(approve|reject)_request_/, // Regex to match action IDs starting with 'approve_request_' or 'reject_request_'
  async ({ ack, body, client, action, logger }) => {
    // Acknowledge the button click immediately
    await ack();

    const approverId = body.user.id; // ID of the user who clicked the button
    const actionId = action.action_id; // ID of the action
    const originalMessage = body.message; // The original message the button was attached to

    // Extract the action type (approve or reject) and the requester ID from the action ID
    const parts = actionId.split("_");
    const actionType = parts[0]; // 'approve' or 'reject'
    const requesterId = parts.pop(); // The last part is the requester's ID

    const decision = actionType === "approve" ? "Approved" : "Rejected"; // Determine the decision

    // Extract the original request text from the message
    let originalRequestText = "Your request"; // Default text
    try {
      // Find the section block in the approver's message that contains the text
      const mainMessageBlock = originalMessage.blocks.find(
        (block) => block.type === "section" && block.text?.type === "mrkdwn"
      );
      if (mainMessageBlock && mainMessageBlock.text?.text) {
        // Extract the text between the triple backticks (```)
        const match = mainMessageBlock.text.text.match(/```([\s\S]*?)```/);
        if (match && match[1]) {
          originalRequestText = `Your request:\n\`\`\`${match[1].trim()}\`\`\``; // Use the extracted text
        } else {
          // Fallback if backticks aren't found (less likely with our structure)
          originalRequestText = `Your request (details couldn't be fully extracted)`;
        }
      }
    } catch (e) {
      logger.error("Error extracting original request text:", e);
      // Use the default text if extraction fails
    }

    // Construct the notification text to send to the requester
    const notificationText = `${originalRequestText}\n\nhas been *${decision}* by <@${approverId}>.`;

    try {
      // Notify the original requester of the decision
      await client.chat.postMessage({
        channel: requesterId,
        text: notificationText, // Send the detailed notification text
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: notificationText },
          },
        ],
      });
      logger.info(
        `Notified requester ${requesterId} of ${decision} by ${approverId} with context.`
      );

      // Update the original message sent to the approver to reflect the decision
      const updatedBlocks = originalMessage.blocks.filter(
        (block) => block.type !== "actions"
      ); // Remove the action block
      updatedBlocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*${decision}* by you on ${new Date().toLocaleString()}. Requester <@${requesterId}> notified.`,
          },
        ],
      });

      await client.chat.update({
        channel: body.channel.id,
        ts: originalMessage.ts,
        text: `Request ${decision}.`,
        blocks: updatedBlocks,
      });
      logger.info(`Updated original message for approver ${approverId}`);
    } catch (error) {
      logger.error("Error processing approval/rejection:", error);
    }
  }
);

// --- Start the app ---
// Start the Slack app and listen for events
(async () => {
  const port = process.env.PORT || 3000; // Use the port defined in the environment or default to 3000
  await app.start(port); // Start the app on the specified port
  console.log(`⚡️ Bolt app is running on port ${port}`); // Log that the app is running
})();
