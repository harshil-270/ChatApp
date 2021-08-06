const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 5,
        },
        username: {
            type: String,
            required: true,
            unique: true,
        },
        profilePic: {
            data: Buffer,
            contentType: String,
        },
        confirmed: {
            type: Boolean,
            default: false,
        },
        resetToken: {
            type: String,
        },
        expiryTime: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
