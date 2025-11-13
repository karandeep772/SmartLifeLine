const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require("child_process");
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const axios = require("axios");
require("dotenv").config();

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const app = express();
const port = 3000;

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Apple@1824',
  database: 'SmartLifeLine'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err);
    throw err;
  }
  console.log('✅ Connected to MySQL Database.');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.post('/signup', (req, res) => {
  const { username, phone_number, password } = req.body;

  const sql = 'INSERT INTO users (Username, PhoneNo, Password) VALUES (?, ?, ?)';
  db.query(sql, [username, phone_number, password], (err, result) => {
    if (err) {
      console.error('Error inserting user:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.redirect('/signup?error=Username%20already%20taken');
      }
      return res.status(500).send('Database error');
    }
    console.log('✅ User registered:', result.insertId);
    res.redirect('/');
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE Username = ?';

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.redirect('/login?error=Database%20error');
    }

    if (results.length > 0) {
      const user = results[0];
      if (password === user.Password) {
        req.session.playerID = username;
        console.log(`✅ ${username} logged in.`);
        return res.redirect('/');
      } else {
        console.warn(`❌ Wrong password for ${username}`);
        return res.redirect('/login?error=Invalid%20credentials');
      }
    } else {
      console.warn(`❌ No user found: ${username}`);
      return res.redirect('/login?error=No%20user%20found');
    }
  });
});

app.post('/submit', (req, res) => {
  const {
    name,
    age,
    blood_group,
    emergency_contact,
    location,
    address,
    emergency_level,
    symptoms,
    latitude,
    longitude
  } = req.body;

  console.log("📥 Data Received:", req.body);

  const sql = `
    INSERT INTO patients 
    (name, age, blood_group, emergency_contact, location, address, emergency_level, symptoms, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    name, age, blood_group, emergency_contact,
    location, address, emergency_level, symptoms,
    latitude, longitude
  ], (err, result) => {
    if (err) {
      console.error("❌ DB Error:", err);
      return res.send(`<h3 style="color:red;">Error saving data: ${err.message}</h3>`);
    }

    console.log("✅ Patient data inserted:", result.insertId);
    res.send(`
      <h2>✅ Patient Data Saved Successfully!</h2>
      <a href="/">Go Back</a>
    `);
  });
});

app.post('/submit-symptoms', async (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ message: "Symptoms are required" });
  }
  const username = req.session.playerID || 'Guest';

  const filledSymptoms = Array(10).fill(null);
  for (let i = 0; i < symptoms.length && i < 10; i++) {
    filledSymptoms[i] = symptoms[i];
  }

  const sql = `
    INSERT INTO symptoms_reports
    (username, symptom1, symptom2, symptom3, symptom4, symptom5, symptom6, symptom7, symptom8, symptom9, symptom10)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [username, ...filledSymptoms], async (err, result) => {
    if (err) {
      console.error('Error inserting symptoms:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    console.log('✅ Symptoms saved with ID:', result.insertId);

    const prompt = `The user reported these symptoms: ${symptoms.join(', ')}.
    Provide 5-7 short home care steps and precautions (no diagnosis or medicine names). Keep concise and friendly.`;

    try {
      const aiResult = await model.generateContent(prompt);
      const advice = aiResult.response.text();
      res.json({ advice });
    } catch (error) {
      console.error('AI Error:', error);
      res.status(500).json({ message: "Error processing request" });
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});