var bcrypt = require('bcrypt'); //for storing passwords
var db = require("../db/database");
const fs = require('fs');

const upload = require("../helpers/upload");
const path = require('path');



module.exports = function (app){

app.get("/api/user/:id", (req, res, next) => {
  var sql = "select * from Users where user_id = ?"
  var params = [req.params.id] //to prevent SQL injection 
  db.get(sql, params, (err, row) => {
      if (err) {
        res.status(400).json({"error":err.message});
        return;
      }
      res.json({
          "message":"success",
          "data":row
      })
    });
});

app.get("/",(req,res)=>{
  res.render('index.html');
})

app.get("/register",(req,res)=>{
  res.render('register.html');
})

app.post("/api/user/", (req, res, next) => {
  var errors=[]
  if (!req.body.password){
      errors.push("No password specified");
  }
  if (!req.body.email){
      errors.push("No email specified");
  }
  if(req.body.password != req.body.confirm){
    errors.push("Passwords do not match")
  }
  if (errors.length){
      res.status(400).json({"error":errors.join(",")});
      return;
  }
  // Hash the password before storing it in the database
  const saltRounds = 10;
  var salt = bcrypt.genSaltSync(saltRounds);
  var hash = bcrypt.hashSync(req.body.password, salt);
  var data = {
      username: req.body.username,
      email: req.body.email,
      password_hash : hash
  }
  var sql ='INSERT INTO Users (username, email, password_hash) VALUES (?,?,?)'
  var params =[data.username, data.email, data.password_hash]
  db.run(sql, params, function (err, result) {
      if (err){
          res.status(400).json({"error": err.message})
          return;
      }
      res.json({
          "message": "success new user registered",
          "data": data,
          "id" : this.lastID
      })
  });
})

app.patch("/api/user/:id", (req, res, next) => {
    const saltRounds = 10;
    var salt = bcrypt.genSaltSync(saltRounds);
    var hash = bcrypt.hashSync(req.body.password, salt);

  var data = {
      name: req.body.name,
      email: req.body.email,
      password : req.body.password ? hash : null
  }
  db.run(
      `UPDATE Users set 
         username = COALESCE(?,name), 
         email = COALESCE(?,email), 
         password_hash = COALESCE(?,password) 
         WHERE user_id = ?`,
      [data.name, data.email, data.password, req.params.id],
      function (err, result) {
          if (err){
              res.status(400).json({"error during cretion": res.message})
              return;
          }
          res.json({
              message: "success user changes has been made",
              data: data,
              changes: this.changes
          })
  });
})


app.get("/login",(req,res)=>{
  res.render("login.html");
})

app.post("/login-user",(req,res)=>{
  var errors=[]
  if (!req.body.password){
      errors.push("No password specified");
  }
  if (!req.body.email){
      errors.push("No email specified");
  }
  if (errors.length){
      res.status(400).json({"error":errors.join(",")});
      return;
  }

  var email = req.body.email;

  var sql ='SELECT password_hash FROM Users WHERE email =?';
  var params =[email]
  db.get(sql, params, async (err, row) => {
      if (err){
          res.status(400).json({"error": err.message})
          return;
      }
      if(!row){
        res.status(404).json({"error": "User not found"});
        return; //if an error is null it won't return anything
    }
    try {
        const match = await bcrypt.compare(req.body.password, row.password_hash);
        if(match){
            //res.status(200).json({"pass":req.body.password,"hash":row.password_hash});
            res.render("logged-in.html", {username: email});
        }else{
            res.json({"error":"Incorrect password"})
        }
    } catch (compareError) {
        res.status(500).json({"error": compareError.message});
    }
  });
})

app.get("/dashboard", async (req, res) => {
  try {
      const users = await dbAll("SELECT * FROM Users");
      const posts = await dbAll("SELECT * FROM Posts");
      res.render("dashboard.html", { users, posts });
  } catch (err) {
      console.error(err);
      res.status(500).send("Error loading the dashboard");
  }
});

app.get("/post",(req,res)=>{
  res.render("post.html");
})

app.post("/api/post/", upload.single('uploaded_image'), (req, res, next) => {
  // Early checks for request integrity
  if (!req.body.caption) {
      return res.status(400).json({ "error": "No post caption specified" });
  }
  if (!req.body.user_id) {
      return res.status(400).json({ "error": "Unauthorized access: No user logged in" });
  }
  if (!req.file) {
      return res.status(400).json({ "error": "No file uploaded. Please upload an image." });
  }

  // Check if the user_id exists in the Users table
  const userCheckSql = 'SELECT user_id FROM Users WHERE user_id = ?';
  db.get(userCheckSql, [req.body.user_id], (err, row) => {
      if (err) {
          return res.status(500).json({ "error": err.message });
      }
      if (!row) {
          // If user does not exist, delete the uploaded file and return an error
          fs.unlink(req.file.path, unlinkErr => {
              if (unlinkErr) {
                  console.log("Failed to delete the uploaded file:", unlinkErr);
              }
              return res.status(404).json({ "error": "User not found" });
          });
      } else {
          // Proceed to handle the post and image creation
          const userId = req.body.user_id;
          const newPath = `uploads/images/${userId}-${req.file.filename}`;
          fs.rename(req.file.path, newPath, (err) => {
              if (err) {
                  return res.status(500).send({ message: "Could not rename file", error: err });
              }
              const caption = req.body.caption;
              const location = req.body.location || null;
              const imagePath = newPath;
    
              const insertPostSql = 'INSERT INTO Posts (user_id, caption, location) VALUES (?, ?, ?)';
              db.run(insertPostSql, [userId, caption, location], function(err) {
                  if (err) {
                      return res.status(400).json({ "error": err.message });
                  }
                  const postId = this.lastID;
                  const insertImageSql = 'INSERT INTO Images (post_id, image_url) VALUES (?, ?)';
                  db.run(insertImageSql, [postId, imagePath], function(err) {
                      if (err) {
                          return res.status(400).json({ "error": err.message });
                      }
                      res.json({
                          "message": "Post and Image successfully created",
                          "postId": postId,
                          "imagePath": imagePath
                      });
                  });
              });
          });
      }
  });
});


app.get("/all-posts",(req,res)=>{
  const page =req.query.page ||1;
  const limit = req.query.limit ||10;
  const offset = (page -1)* limit;

  const sql =`
  SELECT Posts.post_id, Posts.user_id, Users.username, Posts.caption, Posts.location, Posts.created_at, Images.image_url FROM Posts LEFT JOIN Users ON Posts.user_id = Users.user_id LEFT JOIN Images ON Posts.post_id = Images.post_id ORDER BY Posts.created_at DESC LIMIT ? OFFSET ?`

  db.all(sql,[limit,offset],(err,rows)=>{
    if(err){
      res.status(500).json({error:err.message});
      return;
    }
    // Process images: copy to public directory
    try {
      Promise.all(rows.map(post => {
          if (post.image_url) {
              const sourcePath = path.join(__dirname,"..", post.image_url);
              const destinationPath = path.join(__dirname, "..",'public', post.image_url);

              // Ensure the destination directory exists
              const dir = path.dirname(destinationPath);
              if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
              }

              return copyFile(sourcePath, destinationPath);
          }
      }));

      res.render("all-posts.html", {
          posts: rows,
          pagination: {
              page: page,
              limit: limit,
              totalPages: Math.ceil(rows.length / limit)
          }
      });
  } catch (copyError) {
      console.log('Error copying files:', copyError);
      res.status(500).json({ error: 'Failed to copy some images.' });
  }

  });
});

app.get("/delete-user/:id", async (req, res) => {
  try {
      const { id } = req.params;
      await dbRun("DELETE FROM Users WHERE user_id = ?", [id]);
      res.redirect("/dashboard");
  } catch (err) {
      console.error(err);
      res.status(500).send("Failed to delete user");
  }
});

app.get("/delete-post/:id", async (req, res) => {
  const postId = req.params.id;
  try {
      // Retrieve the post to get the image URL
      const post = await dbGet("SELECT Images.image_url FROM Images WHERE Images.post_id = ?", [postId]);
      if (post) {
          // Delete the image file if it exists
          if (post.image_url) {
              const imagePath = path.join(__dirname,"..", post.image_url)
              fs.stat(imagePath, function (err, stats) {
                if (err) {
                    return console.error(err);
                }
                fs.unlink(imagePath,function(err){
                     if(err) return console.log(err);
                });  
             });
          }
          // Delete the post from the database
          await dbRun("DELETE FROM Posts WHERE post_id = ?", [postId]);

          res.redirect("/dashboard");
      } else {
          res.status(404).send("Post not found");
      }
  } catch (err) {
      console.error(err);
      res.status(500).send("Failed to delete post");
  }
});

};

function copyFile(source, destination) {
  return new Promise((resolve, reject) => {
      fs.copyFile(source, destination, (err) => {
          if (err) {
              reject(err);
              return;
          }
          resolve();
      });
  });
}

function dbGet(sql, params) {
  return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
      });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
      });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
      });
  });
}