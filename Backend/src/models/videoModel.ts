import mongoose from 'mongoose'
const videoSchema = new mongoose.Schema({
    course:{
        type:mongoose.Types.ObjectId
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String
    },
    url:{
        type:String,
        required:true,
        trim:true
    },
    metadata:{
        videolength:String,
        size:String,
        orderInCourse:Number
    }
})