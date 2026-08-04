import mongoose from 'mongoose';

const dbConnect = async () => {
    const db_uri = process.env.MONGODB_URI || "";
    try {
      
        await mongoose.connect(db_uri);
        console.log("dbConnected Succesfully")
    } catch (error) {
        console.log(error)
    }

}
export default dbConnect;