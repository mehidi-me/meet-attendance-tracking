const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { google } = require("googleapis");

const TOKEN_PATH = path.join(process.cwd(), "token.json");

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  } else {
    console.log("No saved credentials found. Please authorize the app.");
    return null;
  }
}

async function getCalendarEvents() {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = res.data.items;
    if (!events || events.length === 0) {
      console.log("No upcoming events found.");
      return;
    }
    console.log("Upcoming 10 events:", events);
    return events;
  } catch (error) {
    return error;
  }
}

module.exports = { getCalendarEvents };
