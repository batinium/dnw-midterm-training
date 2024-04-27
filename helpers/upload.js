const multer  = require('multer')
const path = require('path');
const fs = require('fs');


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Create a directory based on the user ID or any other parameter
        const uploadDir = 'uploads/images'; // Adjust the path as necessary
        fs.mkdirSync(uploadDir, { recursive: true }); // Ensure the directory exists
        cb(null, uploadDir);
    },
    
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
const upload = multer({ storage: storage});

module.exports = upload;