import { Pool } from "pg";

export const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: process.env.POSTGRES_PASSWORD, 
  database: process.env.DATABASE_NAME,
});

export const connectDB = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");
  } catch (err) {
    console.error("There was error connecting to the POSTGRES", err);
    process.exit(1);
  }
};

export default pool;
