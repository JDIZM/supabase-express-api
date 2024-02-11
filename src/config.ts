import dotenv from "dotenv";

const ENV = process.env.NODE_ENV ?? "development";

console.log("mode:", ENV);

if (ENV !== "production") {
  dotenv.config();
}

export const config = {
  env: ENV,
  port: process.env.PORT || 3000,
  db_host: process.env.POSTGRES_HOST || "localhost",
  db_user: process.env.POSTGRES_USER || "postgres",
  db_password: process.env.POSTGRES_PASSWORD || "postgres",
  db_name: process.env.POSTGRES_DB || "test",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_PK || ""
};
