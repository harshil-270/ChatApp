const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema(
    {
        user1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        user2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            required: true,
        },
        unseenMessageCount1: {
            type: Number,
            default: 0,
        },
        unseenMessageCount2: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Friend = mongoose.model('Friend', friendSchema);
module.exports = Friend;
