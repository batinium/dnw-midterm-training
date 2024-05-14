var bcrypt = require("bcrypt"); //for storing passwords
var db = require("../db/database");
const fs = require("fs");

const upload = require("../helpers/upload");
const { copyImage } = require("../helpers/imageUtils");

const path = require("path");

module.exports = function (app) {
  app.get("/api/user/:id", (req, res, next) => {
    var sql = "select * from Users where user_id = ?";
    var params = [req.params.id]; //to prevent SQL injection
    db.get(sql, params, (err, row) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: "success",
        data: row,
      });
    });
  });

  //homepage
  app.get("/", (req, res) => {
    res.render("index.html", {
      username: req.session.username,
      isLoggedIn: req.session.userId ? true : false,
      userId: req.session.userId,
    });
  });

  //register page
  app.get("/register", (req, res) => {
    res.render("register.html");
  });

  app.post("/api/users/register", (req, res, next) => {
    var errors = [];
    if (!req.body.password) {
      errors.push("No password specified");
    }
    if (!req.body.email) {
      errors.push("No email specified");
    }
    if (req.body.password != req.body.confirm) {
      errors.push("Passwords do not match");
    }
    if (errors.length) {
      res.status(400).json({ error: errors.join(",") });
      return;
    }
    // Hash the password before storing it in the database
    const saltRounds = 10;
    var salt = bcrypt.genSaltSync(saltRounds);
    var hash = bcrypt.hashSync(req.body.password, salt);
    var data = {
      username: req.body.username,
      email: req.body.email,
      password_hash: hash,
    };
    var sql =
      "INSERT INTO Users (username, email, password_hash) VALUES (?,?,?)";
    var params = [data.username, data.email, data.password_hash];
    db.run(sql, params, function (err, result) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: "success new user registered",
        data: data,
        id: this.lastID,
      });
    });
  });

  app.post("/api/users/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.redirect("/");
    });
  });

  app.patch("/api/users/:id/update", (req, res, next) => {
    const saltRounds = 10;
    var salt = bcrypt.genSaltSync(saltRounds);
    var hash = bcrypt.hashSync(req.body.password, salt);

    var data = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password ? hash : null,
    };
    db.run(
      `UPDATE Users set 
         username = COALESCE(?,name), 
         email = COALESCE(?,email), 
         password_hash = COALESCE(?,password) 
         WHERE user_id = ?`,
      [data.name, data.email, data.password, req.params.id],
      function (err, result) {
        if (err) {
          res.status(400).json({ "error during creation": res.message });
          return;
        }
        res.json({
          message: "success user changes has been made",
          data: data,
          changes: this.changes,
        });
      }
    );
  });

  app.get("/login", (req, res) => {
    res.render("login.html");
  });

  app.post("/api/users/login", (req, res) => {
    var errors = [];
    if (!req.body.password) {
      errors.push("No password specified");
    }
    if (!req.body.email) {
      errors.push("No email specified");
    }
    if (errors.length) {
      res.status(400).json({ error: errors.join(",") });
      return;
    }

    var email = req.body.email;

    var sql =
      "SELECT password_hash, user_id, auth_level , username FROM Users WHERE email =?";
    var params = [email];
    db.get(sql, params, async (err, row) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: "User not found" });
        return; //if an error is null it won't return anything
      }
      try {
        const match = await bcrypt.compare(
          req.body.password,
          row.password_hash
        );
        if (match) {
          req.session.username = row.username;
          req.session.userId = row.user_id;
          req.session.email = email;
          req.session.auth_level = row.auth_level;
          res.redirect("/");
          /* res.status(200).json({
            //pass: req.body.password,
            //hash: row.password_hash,
            auth_level: row.auth_level,
            sessionid: req.session.userId,
            email: req.session.email,
          }); */
        } else {
          res.json({ error: "Incorrect password" });
        }
      } catch (compareError) {
        res.status(500).json({ error: compareError.message });
      }
    });
  });

  app.get("/dashboard", isAuthenticated, async (req, res) => {
    try {
      const users = await dbAll("SELECT * FROM Users");
      const posts = await dbAll("SELECT * FROM Posts");
      res.render("dashboard.html", {
        users,
        posts,
        username: req.session.username,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error loading the dashboard");
    }
  });

  app.get("/posts/new", isAuthenticated, (req, res) => {
    res.render("posts-new.html", {
      username: req.session.username,
      isLoggedIn: req.session.userId ? true : false,
      userId: req.session.userId,
    });
  });

  app.get("/posts/:id/edit", isAuthenticated, async (req, res) => {
    try {
      const post = await dbGet(
        `SELECT Posts.post_id, Posts.user_id, Users.username, Posts.caption, Posts.location, Posts.created_at, Images.image_url FROM Posts 
      LEFT JOIN Users ON Posts.user_id = Users.user_id 
      LEFT JOIN Images on Posts.post_id = Images.post_id
        WHERE Posts.post_id = ?`,
        [req.params.id]
      );
      if (!post) {
        return res.status(404).send("Post not found");
      }
      if (post.user_id != req.session.userId) {
        //console.log("Auth Level", req.session.auth_level);
        //if the user is not the owner of the post
        return res.status(403).send("Forbidden: Insufficient privileges");
      }

      res.render("posts-edit.html", {
        username: req.session.username,
        isLoggedIn: req.session.userId ? true : false,
        userId: req.session.userId,
        post: post,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to retrieve post");
    }
  });

  app.post(
    "/api/posts/new",
    upload.single("uploaded_image"),
    (req, res, next) => {
      // Early checks for request integrity
      if (!req.body.caption) {
        return res.status(400).json({ error: "No post caption specified" });
      }
      if (!req.session.userId) {
        return res
          .status(400)
          .json({ error: "Unauthorized access: No user logged in" });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "No file uploaded. Please upload an image." });
      }

      // Check if the user_id exists in the Users table
      const userCheckSql = "SELECT user_id FROM Users WHERE user_id = ?";
      db.get(userCheckSql, [req.session.userId], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          // If user does not exist, delete the uploaded file and return an error
          fs.unlink(req.file.path, (unlinkErr) => {
            if (unlinkErr) {
              console.log("Failed to delete the uploaded file:", unlinkErr);
            }
            return res.status(404).json({ error: "User not found" });
          });
        } else {
          // Proceed to handle the post and image creation
          const userId = req.session.userId;
          const newPath = `uploads/images/${userId}-${req.file.filename}`;
          fs.rename(req.file.path, newPath, (err) => {
            if (err) {
              return res
                .status(500)
                .send({ message: "Could not rename file", error: err });
            }
            const caption = req.body.caption;
            const location = req.body.location || null;
            const imagePath = newPath;

            const insertPostSql =
              "INSERT INTO Posts (user_id, caption, location) VALUES (?, ?, ?)";
            db.run(insertPostSql, [userId, caption, location], function (err) {
              if (err) {
                return res.status(400).json({ error: err.message });
              }
              const postId = this.lastID;
              const insertImageSql =
                "INSERT INTO Images (post_id, image_url) VALUES (?, ?)";
              db.run(insertImageSql, [postId, imagePath], function (err) {
                if (err) {
                  return res.status(400).json({ error: err.message });
                }
                res.redirect(`/posts/${postId}`); //redirect to the post page
              });
            });
          });
        }
      });
    }
  );

  // Display all posts
  app.get("/posts/all", (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT Posts.post_id, Posts.user_id, Users.username, Posts.caption, Posts.location, Posts.created_at, Images.image_url FROM Posts 
      LEFT JOIN Users ON Posts.user_id = Users.user_id 
      LEFT JOIN Images ON Posts.post_id = Images.post_id 
      ORDER BY Posts.created_at DESC LIMIT ? OFFSET ?`;

    db.all(sql, [limit, offset], async (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      // Process images: copy to public directory
      try {
        await Promise.all(
          rows
            .filter((post) => post.image_url)
            .map((post) => {
              const sourcePath = path.join(__dirname, "..", post.image_url);
              const destinationPath = path.join(
                __dirname,
                "..",
                "public",
                post.image_url
              );
              return copyImage(sourcePath, destinationPath);
            })
        );

        res.render("all-posts.html", {
          username: req.session.username,
          isLoggedIn: req.session.userId ? true : false,
          userId: req.session.userId,
          posts: rows,
          pagination: {
            page: page,
            limit: limit,
            totalPages: Math.ceil(rows.length / limit + 1),
          },
        });
      } catch (copyError) {
        console.log("Error copying files:", copyError);
        res.status(500).json({ error: "Failed to copy some images." });
      }
    });
  });

  app.get("/posts/:id", (req, res) => {
    // First query to get the post details
    const postAndImageSql = `SELECT Posts.post_id, Posts.user_id, Users.username, Posts.caption, Posts.location, Posts.created_at, Images.image_url FROM Posts 
    LEFT JOIN Users ON Posts.user_id = Users.user_id 
    LEFT JOIN Images on Posts.post_id = Images.post_id
      WHERE Posts.post_id = ?`;
    var postId = req.params.id;

    db.all(postAndImageSql, [postId], async (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Process images: copy to public directory
      try {
        await Promise.all(
          rows
            .filter((post) => post.image_url)
            .map((post) => {
              const sourcePath = path.join(__dirname, "..", post.image_url);
              const destinationPath = path.join(
                __dirname,
                "..",
                "public",
                post.image_url
              );
              return copyImage(sourcePath, destinationPath);
            })
        );

        res.status(200).render("post.html", {
          username: req.session.username,
          isLoggedIn: req.session.userId ? true : false,
          userId: req.session.userId,
          post: rows[0],
        });
      } catch (error) {
        console.error("Failed to retrieve post details:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });

  app.delete("/api/users/:id/delete", async (req, res) => {
    try {
      const { id } = req.params;
      await dbRun("DELETE FROM Users WHERE user_id = ?", [id]);
      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to delete user");
    }
  });

  app.patch(
    "/api/posts/:id/update",
    upload.single("uploaded_image"),
    async (req, res, next) => {
      if (!req.body.caption) {
        return res.status(400).json({ error: "No post caption specified" });
      }
      if (!req.session.userId) {
        return res
          .status(400)
          .json({ error: "Unauthorized access: No user logged in" });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "No file uploaded. Please upload an image." });
      }

      const userId = req.session.userId;
      const postId = req.params.id;
      const caption = req.body.caption;
      const location = req.body.location || null;
      const oldPath = await dbGet(
        "SELECT image_url FROM Images WHERE post_id = ?",
        [req.params.id]
      );
      const newPath = `uploads/images/${userId}-${req.file.filename}`;

      try {
        await db.run(`BEGIN TRANSACTION`);
        if (oldPath.image_url) {
          const imagePath = path.join(__dirname, "..", oldPath.image_url);
          await fs.promises.stat(imagePath); // Ensure file exists
          await fs.promises.unlink(imagePath); // Remove the old file
        }
        // Rename and move the file first
        await fs.promises.rename(req.file.path, newPath);

        // Update the post and image records

        await db.run(
          `UPDATE Posts SET caption = ?, location = ? WHERE post_id = ?`,
          [caption, location, postId]
        );
        await db.run(`UPDATE Images SET image_url = ? WHERE post_id = ?`, [
          newPath,
          postId,
        ]);
        await db.run(`COMMIT`);
        res.status(200).json({ message: "Post updated successfully!" });
      } catch (err) {
        if (await db.inTransaction) {
          await db.run(`ROLLBACK`); // Rollback only if a transaction is active
        }
        console.error(err);
        res.status(500).send("Failed to update post");
      }
    }
  );
  app.get("/api/posts/:id/delete", async (req, res) => {
    const postId = req.params.id;
    try {
      // Retrieve the post to get the image URL
      const post = await dbGet(
        "SELECT Images.image_url FROM Images WHERE Images.post_id = ?",
        [postId]
      );
      if (post) {
        // Delete the image file if it exists
        if (post.image_url) {
          const imagePath = path.join(__dirname, "..", post.image_url);
          fs.stat(imagePath, function (err, stats) {
            if (err) {
              return console.error(err);
            }
            fs.unlink(imagePath, function (err) {
              if (err) return console.log(err);
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

  app.get("/profile/:id", isAuthenticated, async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT Posts.post_id, Posts.user_id, Users.username, Posts.caption, Posts.location, Posts.created_at, Images.image_url FROM Posts 
      LEFT JOIN Users ON Posts.user_id = Users.user_id 
      LEFT JOIN Images ON Posts.post_id = Images.post_id 
      WHERE Posts.user_id = ?
      ORDER BY Posts.created_at DESC LIMIT ? OFFSET ?`;

    db.all(sql, [req.params.id, limit, offset], async (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      // Process images: copy to public directory
      try {
        await Promise.all(
          rows
            .filter((post) => post.image_url)
            .map((post) => {
              const sourcePath = path.join(__dirname, "..", post.image_url);
              const destinationPath = path.join(
                __dirname,
                "..",
                "public",
                post.image_url
              );
              return copyImage(sourcePath, destinationPath);
            })
        );
        res.render("profile.html", {
          username: req.session.username,
          isLoggedIn: req.session.userId ? true : false,
          userId: req.params.id,
          posts: rows,
          pagination: {
            page: page,
            limit: limit,
            totalPages: Math.ceil(rows.length / limit + 1),
          },
        });
      } catch (copyError) {
        console.log("Error copying files:", copyError);
        res.status(500).json({ error: "Failed to copy some images." });
      }
    });
  });
};

/* function copyFile(source, destination) {
  return new Promise((resolve, reject) => {
    fs.copyFile(source, destination, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
} */

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
    db.run(sql, params, function (err) {
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

function isAuthenticated(req, res, next) {
  // Check if the user is logged in at all
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized: Please login" });
  }
  // Specific logic for dashboard access
  if (req.path.startsWith("/dashboard")) {
    // Here we check if the user has a higher authorization level (e.g., admin)
    if (req.session.auth_level < 1) {
      // assuming auth_level 1 is required for dashboard
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient privileges" });
    }
  }

  // The route is for creating a new post
  if (req.path.startsWith("/posts/new") || req.path.startsWith("/api/posts")) {
    // This could also have specific logic, but here we simply check if the user is logged in,
    // which we already did at the start of this function.
  }
  next();
}
