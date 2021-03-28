const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        body: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        fileData: {
            originalname: String,
            mimetype: String,
            size: Number,
        }
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
