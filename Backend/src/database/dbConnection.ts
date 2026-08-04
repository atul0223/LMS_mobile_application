import mongoose from 'mongoose';

const dbConnect = async () => {
    const db_uri = process.env.MONGODB_URI?.toString() || "";
    try {
        await mongoose.connect(db_uri).then(() => {
            console.log("db connected succesfully")
        })
    } catch (error) {
        console.log(error)
    }

}
export default dbConnect;