var fs = require("fs");

try {
  fs.readFileSync("/etc/passwd");
  process.exit(0);
} 
catch (e) {
  console.log(e);
  process.exit(-1)
}