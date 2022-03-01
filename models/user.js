import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const schema = new mongoose.Schema({
    userName:{
        type: String,
        required: true,
        unique: true,
        minlength: 3
    },
    friends: [{
        ref: 'Person',
        type: mongoose.Schema.Types.ObjectId
    }],
});

export default mongoose.model('User',schema); 