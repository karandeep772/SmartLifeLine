    const express = require('express');
    const path = require('path');
    const fs = require('fs');
    const { exec } = require("child_process");
    const mysql = require('mysql2');
    const session = require('express-session');
    const MySQLStore = require('express-mysql-session')(session);

    const app = express();
    const port = 3600;

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
            if (err) throw err;
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

    app.listen(port, () =>{
        console.log(`Server is running on port http://localhost:${port}`);
    })

