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
  authorize(JSON.parse(content), birthday);
});

const currentDate = new Date();
function birthday(auth) {
  getBirthdays(auth, sendSlackMessage);
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
function getBirthdays(auth, callback) {
  let birthdaysToday = []

  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Birthdays!A2:F',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      rows.forEach((row, i) => {
        let employeeBirthStr = row[5];
        let employeeBirthDate = new Date(employeeBirthStr);
        if (employeeBirthDate.getMonth() === currentDate.getMonth()) {
          if (employeeBirthDate.getDate() === currentDate.getDate()) {
            birthdaysToday.push(row)
          }
        }
      });
      callback(auth, birthdaysToday);
    } else {
      console.log('No data found.');
    }
  });
}

function sendSlackMessage(auth, birthdaysToday) {
  birthdaysToday.forEach(row => {
    let msg = `:birthday: Happy Birthday to ${row[0]} ${row[1]}! :birthday:`
    console.log(msg);

    axios
      .post(slackWebhookUrl, {
        text: msg
      })
      .then(res => {
        console.log(`statusCode: ${res.statusCode}`);
      })
      .catch(error => {
        console.error(error)
      })
  });
}