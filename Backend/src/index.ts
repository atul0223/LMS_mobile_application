import { config } from "dotenv"
import dbConnect from "./database/dbConnection.ts"
import app from "./app.ts"
config()

const port = process.env.PORT || 5002

/** Fail fast on anything the app cannot run correctly without. */
const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}

dbConnect()
    .then(() => {
        app.listen(port, () => console.log(`server listning on port ${port}`))
    })
    .catch((error) => {
        console.error("Failed to connect to the database:", error);
        process.exit(1);
    })
