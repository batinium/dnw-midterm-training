const express = require("express");
const bodyParser = require("body-parser");

const session = require("express-session");
const SQliteStore = require("connect-sqlite3")(session);

const app = express();

const port = process.argv[3] || 3000;

app
  .use(bodyParser.urlencoded({ extended: true }))
  .use(
    session({
      store: new SQliteStore({
        db: "sessions.db",
        dir: "./db",
      }),
      secret: "cPfa1l0FvYGAUbLWvgZ9QaFpEuhewWOL", //secret key for session
      resave: false, // don't save session if unmodified
      saveUninitialized: false,
      cookie: {
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }, //one week
    })
  )
  .set("views", __dirname + "/views")
  .set("view engine", "ejs");

app.engine("html", require("ejs").renderFile);

require("./routes/main")(app);
app.use(express.static(__dirname + "/public"));

app.use(bodyParser.json());

app.listen(port, () =>
  console.log(`example app listening on http://localhost:${port}`)
);
