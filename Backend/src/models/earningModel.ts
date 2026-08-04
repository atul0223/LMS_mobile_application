import mongoose from 'mongoose'
const earningschema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    
})