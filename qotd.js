const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
let spreadsheetId = '';
let slackWebhookUrl = '';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), qotd);
});

function qotd(auth) {
  const currentDate = new Date();
  if (currentDate.getDay() === 2 || currentDate.getDay() === 4) {
    listQuestions(auth, sendSlackMessage, updateQuestionUsed);
  } else {
    console.log("QOTD only runs on Tuesday and Thursday.")
  }

}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the questions and whether they have been used from the spreadsheet:
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listQuestions(auth, callback, callback2) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Form Responses 1!A2:D',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      // Print columns C and D
      let qotd;
      rows.some((row, i) => {
        if (row[3] == 0) {
          qotd = { question: row[2], index: i };
          return true;
        }
      });
      console.log('Question to ask: ' + qotd.question);
      callback(auth, qotd, callback2);
    } else {
      console.log('No data found.');
    }
  });
}

function sendSlackMessage(auth, question, callback) {
  const msg = `:question: ${question.question} :question:`;
  axios
    .post(slackWebhookUrl, {
      text: msg
    })
    .then(res => {
      console.log(`statusCode: ${res.statusCode}`);
      callback(auth, question);
    })
    .catch(error => {
      console.error(error)
    })
}

function updateQuestionUsed(auth, question) {
  const sheets = google.sheets({ version: 'v4', auth });
  let values = [
    [null, null, null, "1"]
  ];
  const resource = {
    values,
  };
  const index = question.index + 2;
  const range = `Form Responses 1!A${index}:D${index}`;

  sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: range,
    valueInputOption: "USER_ENTERED",
    resource,
  }, (err, result) => {
    if (err) {
      // Handle error
      console.log(err);
    } else {
      console.log('cells updated.', result.updatedCells);
    }
  });
}