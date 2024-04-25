var md5 = require('md5'); //for storing passwords
var db = require("../db/database");

module.exports = function (app){
  app.get("/api/users", (req, res, next) => {
    var sql = "select * from user"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        /* res.json({
            "message":"success",
            "data":rows
        }) */
        res.render("users.html",{users: rows})
      });
});
app.get("/api/user/:id", (req, res, next) => {
  var sql = "select * from user where id = ?"
  var params = [req.params.id] //to prevent SQL injection CHECK THIS
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
      `UPDATE user set 
         name = COALESCE(?,name), 
         email = COALESCE(?,email), 
         password = COALESCE(?,password) 
         WHERE id = ?`,
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
      'DELETE FROM user WHERE id = ?',
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

  var sql ='SELECT password FROM user WHERE email =?';
  var params =[email]
  db.get(sql, params, function (err, row) {
      if (err){
          res.status(400).json({"error": err.message})
          return;
      }
      if(!row){
        res.status(404).json({"user not found":err.message})
        return;
      }
      if(password === row.password){
        res.render("logged-in.html", {username: email})
    } else {
      res.status(401).json({"error": "incorrect password"});
    }
  });
})
};
