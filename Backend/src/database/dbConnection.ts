import mongoose from 'mongoose';

const dbConnect = async () => {
    const db_uri = process.env.MONGODB_URI;
    if (!db_uri) {
        throw new Error("MONGODB_URI is not configured");
    }

    // Errors propagate to the caller: a server that listens without a database
    // accepts traffic it cannot serve, so startup must fail loudly instead.
    await mongoose.connect(db_uri);
    console.log("dbConnected Succesfully");

    // Transparently migrate any null or scalar OTP fields to valid subdocument objects
    mongoose.connection.collection('users').updateMany(
        {
            $or: [
                { otp: null },
                { otp: { $type: "null" } },
                { otp: { $type: "number" } },
                { otp: { $type: "string" } }
            ]
        },
        {
            $set: {
                otp: {
                    code: null,
                    createdAt: new Date(),
                    attempts: 0,
                    nextSendAllowedAt: null
                }
            }
        }
    ).catch(() => {});
};
export default dbConnect;
