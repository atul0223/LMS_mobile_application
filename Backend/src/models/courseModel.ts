import mongoose from 'mongoose'
const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    courseDescription: {
        type: String
    },
    price:{
        type:Number,
        max:50000
    },
    enrolledStudentCount:{
        type:Number,
        default:0
    }

},{
    timestamps:true
})
const Course = mongoose.model('Course', courseSchema)
export default Course;