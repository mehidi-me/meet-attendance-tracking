const attendanceChecker = require("./attendanceChecker.js");
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
// const meetlink = "https://meet.google.com/zaz-fdan-yds";
// attendanceChecker(meetlink, "EcoFloor Plan");

const express = require("express");
const { getCalendarEvents } = require("./googleCalendar.js");
const { google } = require("googleapis");
const app = express();
const port = 3001;
require("dotenv").config();
const TOKEN_PATH = path.join(process.cwd(), "token.json");

// Enable JSON body parsing
app.use(express.json());

// Enable URL-encoded body parsing with extended options
app.use(express.urlencoded({ extended: true }));

app.get("/events", (req, res) => {
  getCalendarEvents()
    .then((events) => {
      if (events.length) {
        return res.json(events);
      } else {
        return res.send("No upcoming events found. or Please Authorize the app.");
      }
    })
    .catch((error) => {
      console.error("Error fetching events:", error);
      return res.send("Please Authorize the app.");
      //return res.status(500).send("Error fetching events.");
    });
});
app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.post("/attendance", (req, res) => {
  const { meetLink, participantName } = req.body;
  attendanceChecker(meetLink, participantName)
    .then((result) => {
      if (result == true) {
        return res
          .status(200)
          .send(`Participant ${participantName} is present in the meeting.`);
      } else if (result == false) {
        return res
          .status(404)
          .send(
            `Participant ${participantName} is not present in the meeting.`
          );
      } else {
        return res.status(500).send(`Something went wrong. ${result}`);
      }
    })
    .catch((error) => res.status(500).send(`Error: ${error.message}`));
});

// Replace these with your credentials from Google Cloud Console
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes for Google Calendar API
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

// Start the server
app.get("/google", (req, res) => {
  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Required to get refresh token every time
  });

  res.send(`<a href="${authUrl}">Authorize with Google</a>`);
});

// OAuth callback handler
app.get("/redirect", async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);

    // Display the tokens (in production, store them securely)
    res.send(`
      <h1>Authentication Successful!</h1>
    `);

    console.log("Tokens:", tokens);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.send("Authentication failed");
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
