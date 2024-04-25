const sqlite3 = require('sqlite3').verbose(); //verbose is for long stack traces.


const express = require('express');
const bodyParser = require('body-parser');

const app = express();
var db = require("./db/database.js")
const port = process.argv[3] || 3000;

app.use(bodyParser.urlencoded({extended:true}))
    .set("views",__dirname+'/views')
    .set("view engine","ejs");
    
    app.engine("html",require("ejs").renderFile);
    
require('./routes/main')(app);
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

app.listen(port,()=> console.log(`example app listening on http://localhost:${port}`));

