const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const axios = require("axios");

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
