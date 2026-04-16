import bcrypt from "bcrypt";

console.log("admin123 =>", await bcrypt.hash("admin123", 10));
console.log("agent123 =>", await bcrypt.hash("agent123", 10));