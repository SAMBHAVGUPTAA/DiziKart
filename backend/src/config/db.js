const mongoose = require('mongoose');
require('dotenv').config(); // Make sure this is included

const connectDB = async () => {
    const uri = process.env.MONGODB_URI; // Access the MongoDB URI from the environment variable
    if (!uri) {
        throw new Error("MongoDB URI is not defined. Please check your .env file.");
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("🚀 Connected to MongoDB ");
};

module.exports = connectDB;