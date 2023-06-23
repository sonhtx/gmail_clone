/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console
var CLIENT_ID = '59480898000-qco0tmd15hik7kc99p63n79325d8mdf4.apps.googleusercontent.com';
var API_KEY = 'AIzaSyCEUMOiIZ6AjQdpzF28-lqRbtNn6e8ybSE';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://mail.google.com/';

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
   gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
   await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
   });
   gapiInited = true;
   maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
   tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // defined later
   });
   gisInited = true;
   maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
   if (gapiInited && gisInited) {
      document.getElementById('authorize_button').style.visibility = 'visible';
   }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
   tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
         throw (resp);
      }
      document.getElementById('signout_button').style.visibility = 'visible';
      document.getElementById('authorize_button').innerText = 'Refresh';
      await listLabels();
   };

   if (gapi.client.getToken() === null) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      tokenClient.requestAccessToken({prompt: 'consent'});
   } else {
      // Skip display of account chooser and consent dialog for an existing session.
      tokenClient.requestAccessToken({prompt: ''});
   }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
   const token = gapi.client.getToken();
   if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token);
      gapi.client.setToken('');
      document.getElementById('content').innerText = '';
      document.getElementById('authorize_button').innerText = 'Authorize';
      document.getElementById('signout_button').style.visibility = 'hidden';
   }
}

/**
 * Print all Labels in the authorized user's inbox. If no labels
 * are found an appropriate message is printed.
 */
async function listLabels() {
   let response;
   try {
      response = await gapi.client.gmail.users.labels.list({
         'userId': 'me',
      });
   } catch (err) {
      document.getElementById('content').innerText = err.message;
      return;
   }
   const labels = response.result.labels;
   if (!labels || labels.length == 0) {
      document.getElementById('content').innerText = 'No labels found.';
      return;
   }
   console.log(response.result)
   // Flatten to string to display
   // const output = labels.reduce(
   //       (str, label) => `${str}${label.name}\n`,
   //       'Labels:\n');
   // document.getElementById('content').innerText = output;
}

// list inbox messages
function listMessages() {
   gapi.client.gmail.users.messages.list({
      'userId': 'me',
      'labelIds': 'INBOX',
      'maxResults': 10
   }).then(function (response) {
      var messages = response.result.messages;
      if (messages && messages.length > 0) {
         console.log("We're here");
         // let i = 0; // the first mail
         // gapi.client.gmail.users.message.get({
         //    'userId': 'me',
         //    'id': messages[0].id
         // }).then(response => {
         //    console.log(response);
         // }).catch(function (error) {
         //    console.log('Error getting message: ', error);
         // });
      } else {
         console.log("You don't have any inboxes")
      }
   }).catch(function (error) {
      console.error('Error listing messages: ', error);
   });
   console.log("All Done.")
}

// Get the content of a specific message
function getMessage(messageId) {
   gapi.client.gmail.users.messages.get({
      'userId': 'me',
      'id': messageId
   }).then(function (response) {
      var message = response.result;
      // var messageContent = parseMessageContent(message); // Parse the message content
      // $('#output').text(JSON.stringify(messageContent, null, 2));
   }).catch(function (error) {
      console.error('Error getting message: ', error);
   });
}

function testPromise() {
   console.log("Here we gooo");
}