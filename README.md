## Google Sheets to Slackbot

This project started from the desire to have a Slackbot posting questions of the day (QotD) to help boost employee engagement. It needed to read from a Google Sheet to allow easy submitting of potential questions through Google Forms. Out of that stemmed a similar Slackbot that posts "Happy Birthday" messages. 

Most of the no-code solutions, like Zapier, did not give enough customization or required paying for enough actions to accomplish this task. 

These scripts use Node.js to read the info from a Google Sheet and post to Slack via webhook. For scripts such as the QotD, it then updates the Google Sheet that the question has been posted.

## Setup
- First create a `credentials.json` in the root of this repository by following the [Google Workspace API instructions.](https://developers.google.com/workspace/guides/create-credentials). More info on the API used for reading and writing Google Sheets can be found [here](https://api.slack.com/messaging/webhooks).

- Create a Slack app and enable webhooks by following the [Slack API instructions.](https://api.slack.com/messaging/webhooks)

- Run `npm install` to get the necessary Node modules. 

## Scripts
To execute use `npm run` and the name of the script.

- qotd: Reads from a Google Sheet, finds the first question that has not been used, posts the question via Slack webhook, and then updates the Google Sheet that the question has been used. Currently set to only execute on Tuesday and Thursdays. This script is setup expecting the Sheet to be taking in answers from a Google Form, providing an easy submission of question ideas.
- birthdays: Reads from a Google Sheet with a list of folks' birthdays and posts a "Happy Birthday" message if it is someones birthday.

## Pipeline
These scripts work best when run automatically in a pipeline. A sample Azure pipeline file is provided. 