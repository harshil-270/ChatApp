const Router = require('express').Router();
const Friend = require('../models/friends');
const Message = require('../models/messages');

const CryptoJS = require('crypto-js');
const multer = require('multer');
const AWS = require('aws-sdk');

const fs = require('fs');
const {promisify} = require('util');
const unlinkAsync = promisify(fs.unlink)

const auth = require('../auth/auth');
require('dotenv').config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname);
    },
});
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5, // file size limit - 5mb
    },
});

// encrypt message before storing it in database.
const encryptMessage = (message) => {
    let encryptedMessage = CryptoJS.AES.encrypt(message, process.env.MESSAGE_KEY).toString();
    return encryptedMessage;
};
// decrypt message after fetching encrypted message from database.
const decryptMessage = (message) => {
    let decryptedMessage = CryptoJS.AES.decrypt(message, process.env.MESSAGE_KEY).toString(CryptoJS.enc.Utf8);
    return decryptedMessage;
};

Router.get('/getFriendsChat', auth, async (req, res) => {
    try {
        const friends = await Friend.find({
            $or: [
                { $and: [{ user1: req.user }, { status: 'accepted' }] },
                { $and: [{ user2: req.user }, { status: 'accepted' }] },
            ],
        })
            .populate('user1')
            .populate('user2');

        let friendsChat = [];
        for (let i = 0; i < friends.length; i++) {
            let friendData = {};
            if (req.user == friends[i].user1._id) friendData = friends[i].user2;
            else friendData = friends[i].user1;

            const friend = {
                username: friendData.username,
                friendId: friendData._id,
                profilePic: {
                    data: Buffer.from(friendData.profilePic.data).toString('base64'),
                    mimetype: friendData.profilePic.contentType,
                },
                friendshipId: friends[i]._id,
                unseenMessageCount:
                    req.user == friends[i].user1._id ? friends[i].unseenMessageCount1 : friends[i].unseenMessageCount2,
                chat: [],
            };

            // Fetch all messages between user and current friend.
            const messages = await Message.find({
                $or: [
                    { $and: [{ from: req.user }, { to: friendData._id }] },
                    { $and: [{ from: friendData._id }, { to: req.user }] },
                ],
            });

            for (let j = 0; j < messages.length; j++) {
                friend.chat.push({
                    id: messages[j]._id,
                    body: decryptMessage(messages[j].body),
                    type: messages[j].type,
                    from: messages[j].from,
                    to: messages[j].to,
                    time: messages[j].createdAt,
                });
            }
            friendsChat.push(friend);
        }
        res.json({ friendsChat: friendsChat });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: 'server error' });
    }
});

Router.post('/addChat', auth, async (req, res) => {
    try {
        const encryptedMessage = encryptMessage(req.body.message);
        let message = new Message({
            from: req.user,
            to: req.body.receiver,
            body: encryptedMessage,
            type: 'message',
        });
        message = await message.save();

        await Friend.updateOne(
            { $and: [{ user1: req.body.receiver }, { user2: req.user }] },
            { $inc: { unseenMessageCount1: 1 } }
        );
        await Friend.updateOne(
            { $and: [{ user2: req.body.receiver }, { user1: req.user }] },
            { $inc: { unseenMessageCount2: 1 } }
        );

        return res.status(200).json({
            time: message.createdAt,
            msg: 'Chat added',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: 'Servernp error' });
    }
});

Router.post('/updateSeenMessages', auth, async (req, res) => {
    try {
        await Friend.updateOne(
            { $and: [{ user1: req.user }, { user2: req.body.receiver }] },
            { $set: { unseenMessageCount1: req.body.unseenMessageCount } }
        );
        await Friend.updateOne(
            { $and: [{ user2: req.user }, { user1: req.body.receiver }] },
            { $set: { unseenMessageCount2: req.body.unseenMessageCount } }
        );

        return res.status(200).json({ msg: 'Last seen Message Count Updated' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: 'Server error' });
    }
});

Router.post('/decrementUnseenMessageCount', auth, async (req, res) => {
    try {
        await Friend.updateOne(
            { $and: [{ user1: req.user }, { user2: req.body.receiver }] },
            { $inc: { unseenMessageCount1: -1 } }
        );
        await Friend.updateOne(
            { $and: [{ user2: req.user }, { user1: req.body.receiver }] },
            { $inc: { unseenMessageCount2: -1 } }
        );

        return res.status(200).json({ msg: 'Last seen Message Count Updated' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: 'Server error' });
    }
});

// Uploading files to AWS S3.
Router.post('/uploadFile', upload.single('file'), auth, async (req, res) => {
    try {
        let message = new Message({
            body: encryptMessage(req.file.originalname),
            type: 'file',
            from: req.user,
            to: req.body.receiver,
        });
        message = await message.save();

        // Config the aws s3 bucket
        const s3bucket = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccesskey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });

        const fileBuffer = fs.readFileSync(req.file.path);
        // Extract the file extension from file name.
        const myFile = req.file.originalname.split('.');
        const fileExtension = myFile[myFile.length - 1];

        // Storing file in s3 with key as message id
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${message._id.toString()}.${fileExtension}`,
            Body: fileBuffer,
            ContentType: req.file.mimetype,
        };

        // Upload file to s3 bucket.
        s3bucket.upload(params, async (err, data) => {
            // Remove the file stored by multer.
            await unlinkAsync(req.file.path);

            if (err) {
                await Message.findByIdAndDelete(message._id);
                return res.status(500).json({ err: 'Server error' });
            }

            await Friend.updateOne(
                { $and: [{ user1: req.body.receiver }, { user2: req.user }] },
                { $inc: { unseenMessageCount1: 1 } }
            );
            await Friend.updateOne(
                { $and: [{ user2: req.body.receiver }, { user1: req.user }] },
                { $inc: { unseenMessageCount2: 1 } }
            );

            return res.status(200).json(message);
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: 'Server Error' });
    }
});

Router.get('/downloadFile', auth, async (req, res) => {
    try {
        let message = await Message.findById(req.query.id);
        if (!message) return res.status(404).json({ err: 'file not found' });

        // Config the aws s3.
        const s3bucket = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccesskey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });

        // Get the file from aws s3 bucket using key
        // key = message id + file extension

        const myFile = decryptMessage(message.body).split('.');
        const fileExtension = myFile[myFile.length - 1];
        s3bucket.getObject(
            {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `${message._id.toString()}.${fileExtension}`,
            },
            (err, data) => {
                if (err) {
                    return res.status(500).json({ err: 'Server error' });
                }
                // Return the file.
                res.status(200).send(data.Body);
            }
        );
    } catch (error) {
        console.log(error);
        res.status(500).json({ err: 'server error' });
    }
});

// When user tries to download file, this route is used to get file data.
Router.get('/getFileData', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.query.id);
        if (!message) return res.status(404).json({ err: 'File not found' });

        res.status(200).json({ body: decryptMessage(message.body) });
    } catch (error) {
        console.log(error);
        res.status(500).json({ err: 'server error' });
    }
});

module.exports = Router;
