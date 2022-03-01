import mongoose from "mongoose";

const MONGODB_URI=process.env.MONGODB_URI || "mongodb://localhost:27017/graphql";

mongoose.connect(MONGODB_URI,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    //useFindAndModify: false,
    //useCreateIndex: true
}).then(()=>{
    console.log('Connected to mongodb');
}).catch((error)=>{
    console.log(`error connection to MongoDB`, error.message);
});