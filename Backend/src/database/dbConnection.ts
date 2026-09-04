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
};
export default dbConnect;
