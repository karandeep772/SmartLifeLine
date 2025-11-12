    const express = require('express');
    const path = require('path');
    const fs = require('fs');
    const { exec } = require("child_process");
    const mysql = require('mysql2');
    const session = require('express-session');
    const MySQLStore = require('express-mysql-session')(session);
    const bodyParser = require('body-parser');
    require("dotenv").config();
    const axios = require("axios");
    console.log("My loaded API key is:", process.env.GEMINI_API_KEY);

    const app = express();
    const port = 3000;

    const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    } = require("@google/generative-ai");
    //console.log(process.env.GEMINI_API_KEY);

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // Use the appropriate model here
    });

    const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
    };

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));


    app.use(session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) =>{
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/precautions', (req,res) =>{
        res.sendFile(path.join(__dirname,'public', 'precautions.html'));
    });

    const db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Apple@1824',
        database: 'SmartLifeLine'
    });

    db.connect((err) => {
        if (err) {
            console.error('Error connecting to MySQL:', err);
            throw err;
        }
        console.log('Connected to MySQL Database.');
    });

    app.get('/signup', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'signup.html'));
    });
    
    app.post('/signup', (req, res) => {
        const { username, phone_number,password } = req.body;
    
        const sql = 'INSERT INTO users (Username, PhoneNo, Password) VALUES (?, ?, ?)';
        db.query(sql, [username, phone_number,password], (err, result) => {
            if (err) {
                console.error('Error inserting user:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.redirect('/signup?error=Username%20already%20taken');
                }
                return res.status(500).send('Database error');
            }
            console.log('User data inserted:', result);
            res.redirect('/');
        });
    });
    
    app.get('/get_id', (req, res) => {
        if (req.session.playerID) {
            res.status(200).json({
                Id: req.session.playerID
            });
        } else {
            res.status(404).json({ error: 'ID not found' });
        }
    });
    
    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE Username = ?';

    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.redirect('/login?error=Database%20error');
        }

        if (results.length > 0) {
            const user = results[0];

            if (password === user.Password) {

                req.session.playerID = username;
                console.log(`User '${username}' logged in successfully.`);
                return res.redirect('/');
            } else {
                console.warn(`Invalid password for user: ${username}`);
                return res.redirect('/login?error=Invalid%20credentials');
            }
        } else {
            console.warn(`Login attempt for non-existent user: ${username}`);
            return res.redirect('/login?error=No%20user%20found');
        }
    });
});

// --- REVISED /submit-symptoms ---
app.post('/submit-symptoms', async (req, res) => {
    const { symptoms } = req.body;
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ message: "Symptoms are required" });
    }
    const username = req.session.playerID || 'Guest';

    // ... (your filledSymptoms logic is fine) ...
    const filledSymptoms = Array(10).fill(null);
    for (let i = 0; i < symptoms.length && i < 10; i++) {
        filledSymptoms[i] = symptoms[i];
    }

    const sql = `
        INSERT INTO symptoms_reports
        (username, symptom1, symptom2, symptom3, symptom4, symptom5, symptom6, symptom7, symptom8, symptom9, symptom10)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // --- START OF DB QUERY ---
    db.query(sql, [username, ...filledSymptoms], async (err, result) => {
        if (err) {
            console.error('Error inserting symptoms:', err);
            // ONLY send a response here on error
            return res.status(500).json({ message: 'Database error' });
        }
        
        console.log('Symptoms inserted:', result.insertId);

        const prompt = `You are a medically cautious assistant. The user reported these symptoms: ${symptoms.map((s,i)=>`${i+1}. ${s}`).join('\n')}. Output: Precautions in 5-7 points of home step to take for help. Do NOT give a diagnosis, do NOT suggest medications beyond generic over-the-counter names, and ALWAYS remind them to seek professional help if symptoms worsen.Keep output concise (<300 words). `;

        try {
            const aiResult = await model.generateContent(prompt); 
            const rephrasedContentskill = aiResult.response.text();
            
            // --- THE ONE AND ONLY SUCCESS RESPONSE ---
            console.log("Sending rephrased content to frontend:", rephrasedContentskill);
            res.json({ rephrasedContentskill });

        } catch (error) {
            console.error('Error from AI:', error);
            res.status(500).json({ message: "Error processing your request" });
        }
        // --- END OF AI LOGIC ---
    });
    // --- END OF DB QUERY ---

    // --- DO NOT put any code here. It would run too early! ---
});

app.listen(port, () =>{
        console.log(`Server is running on port http://localhost:${port}`);
})