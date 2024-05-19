require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const axios = require("axios");
const { google } = require("googleapis");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint to get currency rate
app.get("/currency-rate", async (req, res) => {
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

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

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

app.post("/send-email", async (req, res) => {
  const { toEmail, subject, message } = req.body;
  const result = await sendEmail(toEmail, subject, message);

  if (result.success) {
    res.status(200).send(`Email sent! Message ID: ${result.messageId}`);
  } else {
    res.status(500).send(`Error sending email: ${result.error}`);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
