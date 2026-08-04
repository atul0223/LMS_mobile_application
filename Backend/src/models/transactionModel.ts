import mongoose from 'mongoose'
const transactionSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Types.ObjectId,
        required: true,
        trim: true
    },
    courseId: {
        type: mongoose.Types.ObjectId,
        required: true,
        trim: true
    },
    recieverId: {
        type: mongoose.Types.ObjectId,
        required: true,
        trim: true
    },
    status:{
            type:String,
            enum:["pending","completed","failed"],
            required:true,
            default:"pending"
        }
},{
    timestamps:true
})