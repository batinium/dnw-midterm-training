var md5 = require('md5'); //for storing passwords
var db = require("../db/database");
const fs = require('fs');

const upload = require("../helpers/upload");
const path = require('path');

module.exports = function (app){
  app.get("/api/users", (req, res, next) => {
    var sql = "select * from Users"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.render("users.html",{users: rows})
      });
});

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
  var data = {
      name: req.body.name,
      email: req.body.email,
      password : md5(req.body.password)
  }
  var sql ='INSERT INTO user (name, email, password) VALUES (?,?,?)'
  var params =[data.name, data.email, data.password]
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
  var data = {
      name: req.body.name,
      email: req.body.email,
      password : req.body.password ? md5(req.body.password) : null
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

app.delete("/api/user/:id", (req, res, next) => {
  db.run(
      'DELETE FROM Users WHERE user_id = ?',
      req.params.id,
      function (err, result) {
          if (err){
              res.status(400).json({"error during update": res.message})
              return;
          }
          res.json({"message":"deleted", changes: this.changes})
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
  var password = md5(req.body.password);

  var sql ='SELECT password_hash FROM Users WHERE email =?';
  var params =[email]
  db.get(sql, params, function (err, row) {
      if (err){
          res.status(400).json({"error": err.message})
          return;
      }
      if(!row){
        res.status(404).json({"error": "User not found"});
        return; //if an error is null it won't return anything
    }
      if(password === row.password){
        res.render("logged-in.html", {username: email})
    } else {
      res.status(401).json({"error": "incorrect password"});
    }
  });
})

app.get("/dashboard",(req,res)=>{
  res.render("dashboard.html");
})

app.get("/post",(req,res)=>{
  res.render("post.html");
})

app.post("/api/post/", upload.single('uploaded_image') || upload.none(), (req, res, next) => {
  var errors = [];

  if (!req.body.caption) {
      errors.push("No post caption specified");
  }

  if (!req.body.user_id) {
      errors.push("Unauthorized access: No user logged in");
  }
  if (!req.file) {
    res.status(400).json({ "error": "No file uploaded. Please upload an image." });
    return;
}
  if (errors.length) {
      res.status(400).json({ "error": errors.join(",") });
      return;
  }
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }
  const userId = req.body.user_id;
  const oldPath=req.file.path;
// Suggested code may be subject to a license. Learn more: ~LicenseLog:3169051040.
  const newPath = `uploads/images/${userId}-${req.file.filename}`;
  fs.rename(oldPath,newPath,(err)=>{
    if(err){
      return res.status(500).send({message:"Could not rename file",error:err});
    }
  })

  // Check if the user_id exists in the Users table
  const userCheckSql = 'SELECT user_id FROM Users WHERE user_id = ?';
  db.get(userCheckSql, [req.body.user_id], (err, row) => {
      if (err) {
          res.status(500).json({ "error": err.message });
          return;
      }

      if (!row) {
          res.status(404).json({ "error": "User not found" });
          return;
      }

      const user_id = req.body.user_id;
      const caption = req.body.caption;
      const location = req.body.location || null;
      const imagePath = newPath;  // Correct property to access the file path
  
      const insertPostSql = 'INSERT INTO Posts (user_id, caption, location) VALUES (?, ?, ?)';
      const insertImageSql = 'INSERT INTO Images (post_id, image_url) VALUES (?, ?)';

      db.run(insertPostSql, [user_id, caption, location], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        const postId = this.lastID;
        db.run(insertImageSql, [postId, imagePath], function(err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.json({
                "message": "Post and Image successfully created",
                "postId": postId,
                "imagePath": imagePath
            });
        });
    });
  });
});

app.get("/all-posts",(req,res)=>{
  const page =req.query.page ||1;
  const limit = req.query.limit ||10;
  const offset = (page -1)* limit;

  const sql =`
  SELECT Posts.post_id, Posts.user_id, Users.username, Posts.caption, Posts.location, Posts.created_at, Images.image_url
  FROM Posts
  LEFT JOIN Users ON Posts.post_id = Users.user_id
  LEFT JOIN Images ON Posts.post_id = Images.post_id
  ORDER BY Posts.created_at DESC
  LIMIT ? OFFSET ?`
  db.all(sql,[limit,offset],(err,rows)=>{
    if(err){
      res.status(500).json({error:err.message});
      return;
    }
    // Update image URLs to be served through the custom route
    /* res.json({
      message:"Success",
      data:rows,
      pagination:{
        page:page,
        limit:limit
      }
    }); */
    //res.render("all-posts.html",{posts:rows,pagination:{page:page,limit:limit, totalPages: Math.ceil(rows.length/limit)}});
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