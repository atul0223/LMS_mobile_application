import { config } from "dotenv"
import dbConnect from "./database/dbConnection.ts"
import app from "./app.ts"
config()

const port = process.env.PORT || 5002

/**
 * Fail fast on anything the app cannot run correctly without.
 *
 * MAIL_SENDER_EMAIL is required because Brevo rejects a request with an
 * undefined sender, and OTP delivery failures are swallowed by design (so a
 * mail outage cannot fail an otherwise-successful signup). Without this check
 * the symptom is silent: signup returns 200, no code is ever sent, and the
 * user is stranded on the verification screen.
 */
const requiredEnv = ["MONGODB_URI", "JWT_SECRET", "BREVO_API_KEY", "MAIL_SENDER_EMAIL"];
const missing = requiredEnv.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}

/**
 * Warn on settings that are not fatal but change behaviour in production.
 * These are logged rather than enforced so local development still runs with
 * an empty .env.
 */
const productionWarnings: [string, string][] = [
    ["CLOUDINARY_AUTH_TOKEN_KEY", "video playback URLs will be signed but will never expire"],
    ["CORS_ORIGINS", "the API will reflect any browser origin"],
];
for (const [key, consequence] of productionWarnings) {
    if (!process.env[key]?.trim()) {
        console.warn(`${key} is not set — ${consequence}.`);
    }
}

dbConnect()
    .then(() => {
        app.listen(port, () => console.log(`server listning on port ${port}`))
    })
    .catch((error) => {
        console.error("Failed to connect to the database:", error);
        process.exit(1);
    })
