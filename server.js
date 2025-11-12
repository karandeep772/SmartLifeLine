    const express = require('express');
    const path = require('path');
    const fs = require('fs');
    const { exec } = require("child_process");

    const Folderpath = path.join(__dirname, 'Files');

    const app = express();
    const port = 3600;


    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/Files', express.static(path.join(__dirname, 'Files')));

    app.get('/', (req, res) =>{
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.listen(port, () =>{
        console.log(`Server is running on port http://localhost:${port}`);
    })

