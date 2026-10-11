import "dotenv/config";
import db from "./db.js";

async function testDatabase() {
  try {
    const [rows] = await db.query("SELECT * FROM users");

    console.log("MySQL 연결 성공");
    console.log(rows);

    process.exit(0);
  } catch (error) {
    console.error("MySQL 연결 실패");
    console.error(error);

    process.exit(1);
  }
}

testDatabase();