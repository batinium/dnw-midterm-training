const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const port = process.argv[3] || 3000;

app.use(bodyParser.urlencoded({extended:true}))
    .set("views",__dirname+'/views')
    .set("view engine","ejs");
    
    app.engine("html",require("ejs").renderFile);
    
require('./routes/main')(app);
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());

app.listen(port,()=> console.log(`example app listening on http://localhost:${port}`));

