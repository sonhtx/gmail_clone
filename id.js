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
      client_id: CLIENT_ID,
      scope: SCOPES,
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
   $("#all-inbox tbody").empty();
   const token = gapi.client.getToken();
   if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token);
      gapi.client.setToken('');
      document.getElementById('content').innerText = '';
      document.getElementById('authorize_button').innerText = 'Sign-in';
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
   // Flatten to string to display
   // const output = labels.reduce(
   //       (str, label) => `${str}${label.name}\n`,
   //       'Labels:\n');
   // document.getElementById('content').innerText = output;
}

var mail_list = [];
var content = [];
function addRow() {
   for (var i = 0; i < mail_list.length; i++) {
      $("#all-inbox tbody").append(mail_list[i]);
   }
}

// list inbox messages
async function listMessages() {
   $("#all-inbox tbody").empty();
   try {
      const response = await gapi.client.gmail.users.messages.list({
         'userId': 'me',
         'labelIds': 'INBOX',
         'maxResults': 10
      });
      const messages = response.result.messages;
      if (messages && messages.length > 0) {
         const showPromises = messages.map((message, index) => {
            return show(message.id, index);
         });
         await Promise.all(showPromises);
      } else {
         console.log("You don't have any inboxes");
      }
      addRow();
      addRowHandlers();
   } catch (error) {
      console.error('Error listing messages: ', error);
   }
   console.log("All Done.");
}

function decodeHtmlEntities(html) {
   const parser = new DOMParser();
   const decodedString = parser.parseFromString(html, 'text/html').body.textContent;
   return decodedString;
}

async function show(messageId, id) {
   try {
      const response = await gapi.client.gmail.users.messages.get({
         'userId': 'me',
         'id': messageId
      });
      const all_header = response.result.payload.headers;
      let from, to = "me (sonesto22@gmail.com)", subject;
      for (var i = 0; i < all_header.length; i++) {
         const header = all_header[i];
         if (header.name === 'From') {
            from = header.value.split(" ").pop();
            if (from[0] === '<') 
               from = from.substr(1, from.length - 2);
         }      
         if (header.name === 'Subject') {
            subject = header.value;
         }
      }
      var newRow = $("<tr>");
      newRow.append(`<td>${id + 1}</td>`);
      newRow.append(`<td>${from}</td>`);
      newRow.append(`<td>${to}</td>`);
      newRow.append(`<td>${subject}</td>`);
      mail_list[id] = newRow;
      getEmailContent(userId="me", messId=messageId, index=id);
   } catch (error) {
      console.error('Error getting message: ', error);
   }
}

function getEmailContent(userId="me", messId="188cee41ea76a577", index) {
   var request = gapi.client.gmail.users.messages.get({
      'userId': userId,
      'id': messId,
      'format': 'full'
   });

   // console.log(typeof request);

   request.execute(function(response) {
      var email = response.payload;
      var message = processParts(email.parts);
      content[index] = message;
   });
}

// Process parts recursively to retrieve email content (excluding HTML parts)
function processParts(parts) {
   var message = '';
   parts.forEach(function(part) {
      if (part.parts) {
         // Recursive call for nested parts
         message += processParts(part.parts);
      } else if (part.mimeType === 'text/plain' && part.body && part.body.data) {
         // Decode and append the plain text part's body
         var encodedBody = part.body.data;
         var decodedBody = decodeBase64Url(encodedBody);
         message += decodedBody + '\n'; // Append newline
      }
   });
   return message;
}

// Decode base64 URL-safe encoded data
function decodeBase64Url(base64Url) {
   var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
   var rawData = window.atob(base64);
   var output = '';
   var i = 0;
   var len = rawData.length;
   while (i < len) {
      var charCode = rawData.charCodeAt(i);
      if (charCode < 128) {
         output += rawData.charAt(i);
         i++;
      } else if (charCode > 191 && charCode < 224) {
         output += String.fromCharCode(((charCode & 31) << 6) | (rawData.charCodeAt(i + 1) & 63));
         i += 2;
      } else {
         output += String.fromCharCode(((charCode & 15) << 12) | ((rawData.charCodeAt(i + 1) & 63) << 6) | (rawData.charCodeAt(i + 2) & 63));
         i += 3;
      }
   }
   return output;
}

function testPromise() {
   console.log(content[0]);
}

function addRowHandlers() {
   var table = document.getElementById("all-inbox");
   var rows = table.getElementsByTagName("tr");
   for (i = 0; i < rows.length; i++) {
      var currentRow = table.rows[i];
      var createClickHandler = 
         function(row) 
         {
            return function() { 
               var cell = row.getElementsByTagName("td")[0];
               var id = cell.innerHTML;
               var popup = window.open('', 'Email Content', 'width=600,height=400');

               // Write the email content to the popup document
               popup.document.write('<html><head><title>Email Content</title></head><body>');
               popup.document.write('<h1>Email Content</h1>');
               popup.document.write(`<p>${content[id - 1]}</p>`);
               // Add more email content here if needed
               popup.document.write('</body></html>');
            };
         };
      currentRow.onclick = createClickHandler(currentRow);
   }
}

// Compose and send a new email
function composeEmail() {
   var email = {
      'raw': base64UrlEncode(createMimeMessage('recipient@example.com', 'Subject', 'Hello, World!'))
   };

   var request = gapi.client.gmail.users.messages.send({
      'userId': 'me',
      'resource': email
   });

   request.execute(function(response) {
      console.log('Email sent:', response);
   });
}

// Create the MIME message for the email
function createMimeMessage(to, subject, body) {
   var messageParts = [];

   // Create the email headers
   var headers = {
      'To': to,
      'Subject': subject
   };

   // Format the headers
   var formattedHeaders = Object.keys(headers).map(function(key) {
      return key + ': ' + headers[key];
   }).join('\r\n');

   // Add the headers to the message parts
   messageParts.push(formattedHeaders);

   // Create the email body
   var emailBody = [
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      body
   ].join('\r\n');

   // Add the body to the message parts
   messageParts.push(emailBody);

   // Create the MIME message
   var mimeMessage = messageParts.join('\r\n\r\n');

   return mimeMessage;
}

// Encode the message as base64 URL
function base64UrlEncode(str) {
   var base64 = btoa(str);
   return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function handleCompose() {
   var to_input = document.getElementById("username");
   var subject_input = document.getElementById("subject");
   var message_input = document.getElementById("message");
   var send_btn = document.getElementById("send");
   var file_choosen = document.getElementById("file");
   to_input.style.display = '';
   subject_input.style.display = '';
   message_input.style.display = '';
   send_btn.style.display = '';
   file_choosen.style.display = '';
}

async function sendEmail() {
   console.log("Sending...");
   var recipient = document.getElementById("username").value;
   var subject = document.getElementById("subject").value;
   var message = document.getElementById("message").value;
   var fileInput = document.getElementById("file");
   var file = fileInput.files[0];

   response = await gapi.client.gmail.users.getProfile({
      'userId': 'me'
   });
   my_mail = response.result.emailAddress;

   // Rest of the sendEmail function code (as shown in the previous example)

   console.log(file === undefined);

   if (file === undefined) {
      var emailContent = {
         to: recipient,
         subject: subject,
         message: message
      };

      // var headers = {
      //    'Content-Type': 'application/json',
      //    'Authorization': 'Bearer ' + gapi.auth.getToken().access_token
      // };

      response = await gapi.client.gmail.users.getProfile({
         'userId': 'me'
      });
      my_mail = response.result.emailAddress;

      var email = '';

      email += 'From: ' + my_mail + '\r\n';
      email += 'To: ' + emailContent.to + '\r\n';
      email += 'Subject: ' + emailContent.subject + '\r\n';
      email += 'Content-Type: text/plain; charset="UTF-8"\r\n';
      email += '\r\n';
      email += emailContent.message;

      var encodedEmail = btoa(email).replace(/\+/g, '-').replace(/\//g, '_');

      console.log(encodedEmail);

      gapi.client.gmail.users.messages.send({
         'userId': 'me',
         'raw': encodedEmail
      }).then(function (response) {
         console.log('Email sent:', response);
      }, function (error) {
         console.log('Error sending email:', error);
      });
   }
   else {
      var reader = new FileReader();
      reader.onload = function(e) {
         var fileContent = reader.result.split(',')[1];

         var boundary = 'boundary-example';

         var emailContent =
            'From: Your Name <your-email@example.com>\r\n' +
            'To: ' + recipient + '\r\n' +
            'Subject: ' + subject + '\r\n' +
            'Content-Type: multipart/mixed; boundary="' + boundary + '"\r\n' +
            '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Type: text/plain; charset="UTF-8"\r\n' +
            '\r\n' +
            message + '\r\n' +
            '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Type: ' + file.type + '; name="' + file.name + '"\r\n' +
            'Content-Disposition: attachment; filename="' + file.name + '"\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            fileContent + '\r\n' +
            '\r\n' +
            '--' + boundary + '--';

         var encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_');

         gapi.client.gmail.users.messages.send({
            'userId': 'me',
            'raw': encodedEmail
         }).then(function (response) {
            console.log('Email sent:', response);
         }, function (error) {
            console.log('Error sending email:', error);
         });
      };

      reader.readAsDataURL(file);
   }

   


   return;

   var emailContent = {
      to: recipient,
      subject: subject,
      message: message
   };

   // var headers = {
   //    'Content-Type': 'application/json',
   //    'Authorization': 'Bearer ' + gapi.auth.getToken().access_token
   // };

   response = await gapi.client.gmail.users.getProfile({
      'userId': 'me'
   });
   my_mail = response.result.emailAddress;

   var email = '';

   email += 'From: ' + my_mail + '\r\n';
   email += 'To: ' + emailContent.to + '\r\n';
   email += 'Subject: ' + emailContent.subject + '\r\n';
   email += 'Content-Type: text/plain; charset="UTF-8"\r\n';
   email += '\r\n';
   email += emailContent.message;

   var encodedEmail = btoa(email).replace(/\+/g, '-').replace(/\//g, '_');

   console.log(encodedEmail);

   gapi.client.gmail.users.messages.send({
      'userId': 'me',
      'raw': encodedEmail
   }).then(function (response) {
      console.log('Email sent:', response);
   }, function (error) {
      console.log('Error sending email:', error);
   });
}



