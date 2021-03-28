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
        friends: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                status: String,
                friendshipId: mongoose.Schema.Types.ObjectId,
                lastMessage: { message: String, time: String },
                seenMessageCount: { type: Number, default: 0 },
                totalChatLength: { type: Number, default: 0 },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
