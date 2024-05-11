const fs = require("fs");
const path = require("path");

function copyImage(sourcePath, destinationPath) {
  return new Promise((resolve, reject) => {
    //the destination directory must exist
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }, (err) => {
        if (err) throw err;
        console.log("Directory created successfully");
      });
    }
    fs.copyFile(sourcePath, destinationPath, (err) => {
      if (err) {
        console.error("Error copying file", err);
        reject(err);
      } else {
        console.log("File copied successfully", destinationPath);
        resolve();
      }
    });
  });
}

module.exports = { copyImage };
