const express = require('express');
const MongoClient = require('mongodb').MongoClient
const app = express();
const PORT = 3000;
require('dotenv').config();

let dbConnectionStr = process.env.DB_STRING;

MongoClient.connect(dbConnectionStr, { useUnifiedTopology: true })
    .then(client => {
        console.log(`Connected to Database`)
        //db = client.db(dbName)
    })

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'); 
  });

app.get('/planAhead', (req, res) => {
    res.sendFile(__dirname + '/planAhead.html');
})

app.listen(process.env.PORT || PORT, ()=>{
    console.log(`Server running on port ${PORT}`)



});
