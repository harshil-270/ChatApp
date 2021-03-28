const Router = require('express').Router();
const User = require('../models/users');
const Message = require('../models/messages');
const auth = require('../auth/auth');
const CryptoJS = require('crypto-js');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    // check file extension
    if (!file.originalname.match(/\.(jpeg|jpg|png|gif|mp3|mp4|avi|txt|c|cpp|js|py|java|html|css|pdf|doc|docx|ppt|pptx|xlsx|xls|psd)$/)) {
        return cb('File Extension not supported', false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5, // file size limit - 5mb
    },
    fileFilter: fileFilter,
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
        let user = await User.findById(req.user).populate('friends.user');
        if (!user) return res.status(404).json({ err: 'cant find user' });

        // get chat with all friends and also get friends other details.

        let friendsChat = [];
        for (let i = 0; i < user.friends.length; i++) {

            let friend = {
                username: user.friends[i].user.username,
                friendId: user.friends[i].user._id,
                profilePic: {
                    data: Buffer.from(user.friends[i].user.profilePic.data).toString('base64'),
                    mimetype: user.friends[i].user.profilePic.contentType,
                },
                friendshipId: user.friends[i].friendshipId,
                seenMessageCount: user.friends[i].seenMessageCount,
                chat: [],
            };

            // fetch all messages between user and current friend.
            const messages = await Message.find({
                $or: [
                    { $and: [{ from: user._id }, { to: user.friends[i].user._id }] },
                    { $and: [{ to: user._id }, { from: user.friends[i].user._id }] },
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
        let encryptedMessage = encryptMessage(req.body.message);
        let message = new Message({
            from: req.user,
            to: req.body.receiver,
            body: encryptedMessage,
            type: 'message',
        });
        message = await message.save();

        let user1 = await User.findById(req.user);
        if (!user1) return res.status(404).json({ err: 'User not found' });
        ind = -1;
        for (let i = 0; i < user1.friends.length; i++) {
            if (user1.friends[i].user == req.body.receiver) {
                ind = i;
                break;
            }
        }
        if (ind == -1) return res.status(404).json({ err: 'Friend not found' });
        user1.friends[ind].lastMessage = { message: encryptedMessage, time: message.createdAt };
        user1.friends[ind].seenMessageCount += 1;
        user1.friends[ind].totalChatLength += 1;
        await user1.save();

        let user2 = await User.findById(req.body.receiver);
        if (!user2) return res.status(404).json({ err: 'User not found' });
        ind = -1;
        for (let i = 0; i < user2.friends.length; i++) {
            if (user2.friends[i].user == req.user) {
                ind = i;
                break;
            }
        }
        if (ind == -1) return res.status(404).json({ err: 'Friend not found' });
        user2.friends[ind].lastMessage = { message: encryptedMessage, time: message.createdAt };
        user2.friends[ind].totalChatLength += 1;
        await user2.save();

        res.json({
            time: message.createdAt,
            msg: 'Chat added',
        });
    } catch (error) {
        console.log(error);
    }
});

Router.post('/updateSeenMessages', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user);
        for (let i = 0; i < user.friends.length; i++) {
            if (user.friends[i].user == req.body.receiver) {
                user.friends[i].seenMessageCount = req.body.seenMessageCount;
                break;
            }
        }
        await user.save();
        res.json({ msg: 'Last seen Message Count Updated' });
    } catch (error) {
        console.log(error);
    }
});

// Uploading files to AWS S3
Router.post('/uploadFile', upload.single('file'), auth, async (req, res) => {
    try {

        let message = new Message({
            body: encryptMessage(req.file.originalname),
            type: 'file',
            from: req.user,
            to: req.body.receiver,
            fileData: {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
            },
        });
        message = await message.save();

        // config the aws s3 bucket
        let s3bucket = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccesskey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });


        const fileBuffer = fs.readFileSync(req.file.path);
        // extract the file extension from file name.
        const myFile = req.file.originalname.split('.');
        const fileExtension = myFile[myFile.length - 1];
        // storing file in s3 with key as message id
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${message._id.toString()}.${fileExtension}`,
            Body: fileBuffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read',
        };

        // upload file to s3 bucket
        s3bucket.upload(params, async (err, data) => {
            if (err) {
                await Message.findByIdAndDelete(message._id);
                return res.status(500).json({ err: 'Server error' });
            }
            // update both sender and receiver user's last message as file's name.
            let user1 = await User.findById(req.user);
            if (!user1) return res.status(404).json({ err: 'User not found' });
            // in user1's friendlist find the index of receiver friend.
            ind = -1;
            for (let i = 0; i < user1.friends.length; i++) {
                if (user1.friends[i].user == req.body.receiver) {
                    ind = i;
                    break;
                }
            }
            if (ind == -1) return res.status(404).json({ err: 'Friend not found' });
            // update the details.
            user1.friends[ind].lastMessage = { message: encryptMessage(req.file.originalname), time: message.createdAt };
            user1.friends[ind].seenMessageCount += 1;
            user1.friends[ind].totalChatLength += 1;
            await user1.save();

            let user2 = await User.findById(req.body.receiver);
            if (!user2) return res.status(404).json({ err: 'User not found' });
            // In user2's friendlist find the index of friend.
            ind = -1;
            for (let i = 0; i < user2.friends.length; i++) {
                if (user2.friends[i].user == req.user) {
                    ind = i;
                    break;
                }
            }
            if (ind == -1) return res.status(404).json({ err: 'Friend not found' });
            // update the details of user2.
            user2.friends[ind].lastMessage = { message: encryptMessage(req.file.originalname), time: message.createdAt };
            user2.friends[ind].totalChatLength += 1;
            await user2.save();

            res.status(200).json(message);
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: 'Server Error'});    
    }
});

Router.get('/downloadFile', auth, async (req, res) => {
    try {
        let message = await Message.findById(req.query.id);
        if (!message)
            return res.status(404).json({err: 'file not found'});

        // config the aws s3
        let s3bucket = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccesskey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });

        // get the file from aws s3 bucket using key
        // key = message id + file extension
        const myFile = message.fileData.originalname.split('.');
        const fileExtension = myFile[myFile.length - 1];
        s3bucket.getObject(
            {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `${message._id.toString()}.${fileExtension}`,
            },
            (err, data) => {
                if (err) {
                    return res.status(500).json({ err: 'server error' });
                }
                // return the file.
                res.status(200).send(data.Body)
            }
        );
    } catch (error) {
        console.log(error);
        res.status(500).json({ err: 'server error' });
    }
});

// when user tries to download file this route is used to get file data.
Router.get('/getFileData', auth, async (req, res) => {
    try {
        let message = await Message.findById(req.query.id);
        if (!message)
            return res.status(404).json({err: 'file not found'});
        res.status(200).json(message.fileData);
    } catch (error) {
        console.log(error);
        res.status(500).json({ err: 'server error' });
    }
});

module.exports = Router;
