require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const axios = require("axios");
const { google } = require("googleapis");
const cron = require("node-cron");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = 3000;

//in-memory db init
const db = new sqlite3.Database(":memory:");

//table in memory db creation
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS emails (id INTEGER PRIMARY KEY AUTOINCREMENT, toEmail TEXT)"
  );
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//endpoint to get current rate
app.get("/rate", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    const rate = response.data.rates.UAH;
    res.json({ USD: 1, UAH: rate });
  } catch (error) {
    console.error(`Error fetching currency rate: ${error}`);
    res.status(500).send("Error fetching currency rate");
  }
});

//OAuth 2.0 creds and config to send emails
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

//send email method
const sendEmail = async (toEmail, subject, message) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.USER_EMAIL,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: "yaroslav.matsapura@gmail.com",
      to: toEmail,
      subject: subject,
      text: message,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Message sent: ${info.response}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending email: ${error}`);
    return { success: false, error: error.message };
  }
};

//Endpoint to subscribe email
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  db.run("INSERT INTO emails (toEmail) VALUES (?)", [email], (err) => {
    if (err) {
      console.error("Error inserting email into database:", err);
      res.status(500).send("Error inserting email into database");
    } else {
      res.status(200).send("Email request added to queue");
    }
  });
});

//Scheduled event once per day
cron.schedule("0 0 * * *", async () => {
  let response = null;
  let message = null;
  try {
    response = await axios.get(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    let rate = response.data.rates.UAH;
    message = rate.toString();
  } catch (error) {
    console.error(`Error fetching currency rate: ${error}`);
    res.status(500).send("Error fetching currency rate");
  }

  // Loop through all emails and send them message
  db.all("SELECT toEmail FROM emails", async (err, rows) => {
    if (err) {
      console.error(`Error fetching email addresses from database: ${err}`);
      return;
    }

    for (const row of rows) {
      const toEmail = row.toEmail;
      await sendEmail(toEmail, "Schedule Sub from", message);
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
