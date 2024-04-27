var sqlite3 = require('sqlite3').verbose()
var md5 = require('md5')

const DBSOURCE = "./db/test.db"

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
      // Cannot open database
      console.error(err.message)
      throw err
    }else{
        /* console.log('Connected to the SQLite database.')
        db.run(`CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name text, 
            email text UNIQUE, 
            password text, 
            CONSTRAINT email_unique UNIQUE (email)
            )`,
        (err) => {
            if (err) {
                // Table already created
            }else{
                // Table just created, creating some rows
                var insert = 'INSERT INTO user (name, email, password) VALUES (?,?,?)'
                db.run(insert, ["admin","admin@example.com",md5("admin123456")])
                db.run(insert, ["user","user@example.com",md5("user123456")])
            }
        }); */

        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.log(err.message);
            } else {
                var insert ='INSERT INTO Users (username,email,password_hash) VALUES(?,?,?)'
                db.run(insert,["admin","admin@admin.com",md5("admin")]);
                db.run(insert,["user","user@user.com",md5("user")])
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS Posts (
            post_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            caption TEXT,
            location TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )`, (err) => {
            if (err) {
                console.log(err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS Images (
            image_id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            image_url TEXT NOT NULL,
            thumbnail_url TEXT,
            FOREIGN KEY (post_id) REFERENCES Posts(post_id)
        )`, (err) => {
            if (err) {
                console.log(err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS Comments (
            comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            user_id INTEGER,
            text TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES Posts(post_id),
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )`, (err) => {
            if (err) {
                console.log(err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS Likes (
            like_id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            user_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES Posts(post_id),
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )`, (err) => {
            if (err) {
                console.log(err.message);
            }
        });
    }
});


module.exports = db;