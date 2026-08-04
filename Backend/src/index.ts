import { config } from "dotenv"
import dbConnect from "./database/dbConnection.ts"
import app from "./app.ts"
config()
const port = process.env.PORT || 5002
dbConnect().then(() => {
    app.listen(port)
    console.log(`server listning on port ${port}`)
})

