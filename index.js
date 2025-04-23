const attendanceChecker = require("./attendanceChecker.js");

// const meetlink = "https://meet.google.com/zaz-fdan-yds";
// attendanceChecker(meetlink, "EcoFloor Plan");

const express = require("express");
const app = express();
const port = 3000;

// Enable JSON body parsing
app.use(express.json());

// Enable URL-encoded body parsing with extended options
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.post("/attendance", (req, res) => {
  const { meetLink, participantName } = req.body;
  attendanceChecker(meetLink, participantName)
    .then((result) => {
      if (result == true) {
      return  res
          .status(200)
          .send(`Participant ${participantName} is present in the meeting.`);
      } else if (result == false) {
        return res
          .status(404)
          .send(
            `Participant ${participantName} is not present in the meeting.`
          );
      } else {
        return res
          .status(500)
          .send(
            `Something went wrong. Please check the meeting link and participant name.`
          );
      }
    })
    .catch((error) => res.status(500).send(`Error: ${error.message}`));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
