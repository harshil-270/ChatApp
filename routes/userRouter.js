const Router = require('express').Router();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const auth = require('../auth/auth');
const wrapedSendMail = require('../utils/sendMail');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');

const User = require('../models/users');
const Friend = require('../models/friends');
const Message = require('../models/messages');

const {promisify} = require('util');
const unlinkAsync = promisify(fs.unlink)


require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const { SERVER_URL, CLIENT_URL } = require('../config/config');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5, // Profile picture size limit 5mb
    },
    fileFilter: fileFilter,
});

const encryptMessage = (message) => {
    let encryptedMessage = CryptoJS.AES.encrypt(message, process.env.MESSAGE_KEY).toString();
    return encryptedMessage;
};

const decryptMessage = (message) => {
    let decryptedMessage = CryptoJS.AES.decrypt(message, process.env.MESSAGE_KEY).toString(CryptoJS.enc.Utf8);
    return decryptedMessage;
};

Router.post('/register', upload.single('profilePic'), async (req, res) => {
    try {
        // Validate the user data.
        if (!req.body.username || !req.body.email || !req.body.password || !req.body.confirmPassword) {
            // Delete profile picture which is stored in "uploads" folder.
            await unlinkAsync(req.file.path);
            return res.status(400).json({ err: 'Please fill all the fields' });
        }
        if (req.body.password.length < 5) {
            await unlinkAsync(req.file.path);
            return res.status(400).json({ err: 'Password length must be greater than 5' });
        }
        if (req.body.password !== req.body.confirmPassword) {
            await unlinkAsync(req.file.path);
            return res.status(400).json({ err: 'Password and confirm password must be same' });
        }

        // First check if user with same username or email already exits or not.
        let user = await User.findOne({
            $or: [{ email: req.body.email }, { username: req.body.username }],
        });
        if (user) {
            if (user.confirmed) {
                await unlinkAsync(req.file.path);
                if (user.username === req.body.username) {
                    return res.status(400).json({ err: 'Username is already taken. Please choose another username' });
                } else {
                    return res.status(400).json({ err: 'EmailID is already registered' });
                }
            } else {
                // If difference between current time and account creation time is greater than 60 min. then delete it.
                let diffInMin = (Date.now() - user.createdAt.getTime()) / (1000 * 60);
                if (diffInMin <= 60) {
                    // If username is already taken but email id is not confirmed and
                    // If account was created less than 60 min ago then some other user cant take this username.
                    if (user.username === req.body.username) {
                        await unlinkAsync(req.file.path);
                        return res.status(400).json({
                            err: 'Username is already taken. Please choose another username',
                        });
                    }
                }
                await User.findByIdAndDelete(user._id);
            }
        }

        // Store hashed password in database.
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        user = new User({
            email: req.body.email,
            username: req.body.username,
            password: hashedPassword,
            profilePic: {
                data: fs.readFileSync(req.file.path),
                contentType: req.file.mimetype,
            },
        });
        user = await user.save();
        await unlinkAsync(req.file.path);

        // Send the email verification mail.
        const emailToken = jwt.sign({ user: user._id }, JWT_SECRET, { expiresIn: '1h' });
        const url = `${SERVER_URL}/users/confirmation/${emailToken}`;
        const mailOptions = {
            to: user.email,
            subject: 'Account confirmation (ChatApp)',
            html: `Please click on this <a href="${url}">link</a> to confirm your email`,
        }
        const result = await wrapedSendMail(mailOptions);
        if (result.success) {
            return res.status(200).json({ msg: 'User registered' });
        } else {
            return res.status(500).json({ err: 'Server error. Not able to send confirmation mail. Please try again after some time'});
        }
    } catch (error) {
        await unlinkAsync(req.file.path);
        res.status(500).json({ err: 'Server error' });
    }
});

Router.get('/confirmation/:token', async (req, res) => {
    try {
        // verify email verification token.
        const data = jwt.verify(req.params.token, JWT_SECRET);
        const id = data.user;
        const user = await User.findByIdAndUpdate(id, {
            $set: {
                confirmed: true
            }
        });
        return res.redirect(`${CLIENT_URL}/login?emailConfirm=true`);
    } catch (error) {
        return res.status(500).json({ err: 'server error' });
    }
});

Router.post('/login', async (req, res) => {
    try {
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({ err: 'Please fill all the fields.' });
        }
        let user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).json({ err: 'Account does not exist. Please register first.' });
        }
        
        // Check if user has verified email address or not.
        if (!user.confirmed) {
            return res.status(400).json({ err: 'Please Confirm Your email to login.' });
        }

        // Compare hashed password.
        const isSame = await bcrypt.compare(req.body.password, user.password);
        if (!isSame) {
            return res.status(400).json({ err: 'Wrong Email ID or Password.' });
        }

        // Generate auth token which expires in 1day.
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return res.status(200).json({
            token,
            id: user._id,
            username: user.username,
        });
    } catch (error) {
        return res.status(500).json({ err: 'server error' });
    }
});

Router.post('/resetPassword', async (req, res) => {
    try {
        // Check if user exits or not.
        let user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ err: 'Email Id is not registered' });
        if (!user.confirmed) return res.status(400).json({ err: 'Please confirm your email id first.' });

        // Generate random token for reseting password.
        // const token = crypto.randomBytes(32).toString('hex');
        let token = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 64; i++) {
            token += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        user.resetToken = token;
        user.expiryTime = Date.now() + 600000; // expires in 10 min
        user = await user.save();

        // Send email to user with reset token.
        const url = `${CLIENT_URL}/reset/${token}`;
        const mailOptions = {
            to: user.email,
            subject: 'Password reset (ChatApp)',
            html: `
            <p>You have requested for password reset</p>
            <p><b>Please click on this <a href="${url}">link</a> to reset your password<b></p>`,
        }
        const result = await wrapedSendMail(mailOptions);
        if (result.success) {
            return res.status(200).json({ msg: 'Mail for reseting your password is sent successfully. Check your mails.' });
        } else {
            return res.status(500).json({ err: 'Server error. Not able to send mail. Please try again after some time.'});
        }
    } catch (error) {
        return res.status(500).json({ err: 'server error' });
    }
});

Router.post('/newPassword', async (req, res) => {
    // Validate password and confirmPassword.
    if (req.body.password.length < 5) {
        return res.status(400).json({ err: 'Password length must be greater than 5' });
    }
    if (req.body.password !== req.body.confirmPassword) {
        return res.status(400).json({ err: 'Password and confirm password must be same' });
    }
    try {
        // Find user and make sure reset token is not expired.
        let user = await User.findOne({
            resetToken: req.body.resetToken,
            expiryTime: { $gt: Date.now() },
        });
        if (!user) return res.status(400).json({ err: 'Your session has expired. Please try again.' });

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.expiryTime = undefined;
        await user.save();

        res.json({ msg: 'Password updated successfully' });
    } catch (error) {
        return res.status(500).json({ err: 'server error' });
    }
});

Router.get('/getUserProfile', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user);
        if (!user) {
            res.status(400).json({ err: 'No User found' });
        }
        let profilePic = { data: '', mimetype: 'image/jpeg' };
        if (user.profilePic && user.profilePic.data) {
            profilePic.data = Buffer.from(user.profilePic.data).toString('base64');
            profilePic.mimetype = user.profilePic.contentType;
        }
        res.status(200).json({
            profilePic,
            username: user.username,
        });
    } catch (error) {
        return res.status(500).json({ err: 'server error' });
    }
});

Router.post('/updateProfilePic', auth, upload.single('profilePic'), async (req, res) => {
    try {
        let user = await User.findById(req.user);
        if (user) {
            user.profilePic = {
                data: fs.readFileSync(req.file.path),
                contentType: req.file.mimetype,
            };
            await user.save();
            res.json({ msg: 'success' });
        } else {
            res.status(400).json({ err: 'No User found' });
        }
    } catch (err) {
        return res.status(500).json({ err: 'server error' });
    }
});

Router.post('/updateUsername', auth, async (req, res) => {
    try {
        if (!req.body.username) {
            return res.status(400).json({ err: `Username can't be empty.` });
        }
        let user = await User.findById(req.user);
        if (user.username === req.body.username) {
            return res.status(200).json({ msg: 'success' });
        }
        if (user) {
            // check if new username is availabel or not
            let alreadyExist = await User.findOne({
                username: req.body.username,
            });
            if (alreadyExist) {
                return res.status(400).json({ err: 'Username is already taken.' });
            }
            user.username = req.body.username;
            await user.save();
            res.json({ msg: 'success' });
        } else {
            res.status(400).json({ err: 'No User found.' });
        }
    } catch (err) {
        res.status(400).json({ err: 'Error Updating Profile.' });
    }
});

Router.post('/isTokenValid', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user);
        if (!user) {
            return res.json({ isValid: false });
        }
        res.json({
            id: user._id,
            username: user.username,
            isValid: true,
        });
    } catch (error) {
        res.status(500).json({ err: 'server error' });
    }
});

Router.post('/sendFriendRequest', auth, async (req, res) => {
    try {
        // Find the 1st user who is trying to send friend request to 2nd user.
        const user1 = await User.findById(req.user);
        if (!user1) return res.status(404).json({ err: 'Cant find the user.' });
        const user2 = await User.findById(req.body.id);
        if (!user2) {
            return res.status(404).json({ err: 'Cant find the friend, to whom user is trying to send request.'});
        }

        let friend = await Friend.findOne({
            $or: [
                { $and: [{ user1: user1._id }, { user2: user2._id }] },
                { $and: [{ user1: user2._id }, { user2: user1._id }] },
            ],
        });
        if (friend) {
            return res.status(400).json({ err: 'Request is already sent.' });
        }

        friend = new Friend({
            user1: user1._id,
            user2: user2._id,
            status: 'pending',
        });
        await friend.save();
        
        // Send the mail to 2nd user about friend request.
        const url = `${CLIENT_URL}/`;
        const mailOptions = {
            to: user2.email,
            subject: `${user1.username} has sent you a friend request`,
            html: `<a href="${url}"><h2>ChatApp</h2></a> <br/> ${user1.username} has sent you a friend request. Confirm the friend request to start chatting.`,
        }
        const result = await wrapedSendMail(mailOptions);

        return res.status(200).json({ msg: 'Friend Request sended.' });
    } catch (error) {
        return res.status(500).json({ err: 'Server error' });
    }
});

Router.post('/acceptFriendRequest', auth, async (req, res) => {
    try {
        // User who is accepting request keep it in "user2" varaible. just to avoid confusion.
        const user1 = await User.findById(req.body.id);
        if (!user1) return res.status(404).json({ err: 'Friend not found.' });
        const user2 = await User.findById(req.user);

        let friend = await Friend.findOne({
            $and: [{ user1: user1._id }, { user2: user2._id }],
        });
        if (!friend) {
            return res.status(400).json({ err: 'Friend request not found.' });
        }

        friend.status = 'accepted';
        await friend.save();

        // Send the mail to user "who sent the friend request".
        const url = `${CLIENT_URL}/`;
        const mailOptions = {
            to: user1.email,
            subject: `${user2.username} has confirmed your friend request`,
            html: `<h2>ChatApp</h2><br/> ${user2.username} has confirmed your friend request. Click on this <a href="${url}">link</a> to start chatting with your friends.`,
        }
        const result = await wrapedSendMail(mailOptions);

        return res.status(200).json({ msg: 'Friend Request Accepted' });
    } catch (error) {
        return res.status(500).json({ err: 'server error' });
    }
});

Router.get('/getRequestList', auth, async (req, res) => {
    try {
        // Get user's pending request list.
        const friends = await Friend.find({
            $and: [{ user2: req.user }, { status: 'pending' }],
        }).populate('user1', 'username');
        let requestList = [];
        for (let i = 0; i < friends.length; i++) {
            requestList.push({
                id: friends[i].user1._id,
                username: friends[i].user1.username,
            });
        }
        return res.status(200).json({ requestList: requestList });
    } catch (error) {
        return res.status(500).json({ err: 'Server error' });
    }
});

Router.get('/getFriends', auth, async (req, res) => {
    try {
        // Get all friends details for friend list sidebar in frontend.
        const friends = await Friend.find({
            $or: [{ user1: req.user }, { user2: req.user }],
        })
            .populate('user1')
            .populate('user2');

        let friendsList = [];
        let requestCount = 0;

        for (let i = 0; i < friends.length; i++) {
            // Count the number of pending request.
            if (friends[i].status === 'pending') {
                if (friends[i].user2._id == req.user) {
                    requestCount++;
                }
                continue;
            }

            let friendData = {};
            if (req.user == friends[i].user1._id) {
                friendData = friends[i].user2;
            } else {
                friendData = friends[i].user1;
            }

            const profilePic = { data: '', mimetype: 'image/jpeg' };
            if (friendData.profilePic && friendData.profilePic.data) {
                profilePic.data = Buffer.from(friendData.profilePic.data).toString('base64');
                profilePic.mimetype = friendData.profilePic.contentType;
            }
            // get the last message and the time it was send.
            let lastMessage = await Message.findOne({
                $or: [
                    { $and: [{ from: friends[i].user1._id }, { to: friends[i].user2._id }] },
                    { $and: [{ from: friends[i].user2._id }, { to: friends[i].user1._id }] },
                ],
            })
                .limit(1)
                .sort({ $natural: -1 });

            if (!lastMessage) {
                lastMessage = { body: '', createdAt: '' };
            }

            friendsList.push({
                friendId: friendData._id,
                username: friendData.username,
                profilePic: profilePic,
                friendshipId: friends[i]._id,
                status: friends[i].status,
                unseenMessageCount:
                    req.user == friends[i].user1._id ? friends[i].unseenMessageCount1 : friends[i].unseenMessageCount2,
                lastMessage: decryptMessage(lastMessage.body),
                time: lastMessage.createdAt,
            });
        }
        return res.status(200).json({
            requestCount,
            friendsList,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: 'server error' });
    }
});

Router.get('/getSimilarUsername', auth, async (req, res) => {
    try {
        // get the list of users whose username is matching with search query.
        const pattern = new RegExp('^' + req.query.searchQuery.trim());
        const mainUser = await User.findById(req.user);
        const users = await User.find({
            username: { $regex: pattern, $options: 'i' },
        })
            .limit(25)
            .exec();
        let searchResult = [];
        for (let i = 0; i < users.length; i++) {
            // if user has not confirmed email address then exclude it.
            if (!users[i].confirmed) continue;
            // if user who searched for this query is in this list then exclude that user.
            if (users[i]._id.equals(req.user)) continue;

            let status = '';
            let result = await Friend.findOne({
                $or: [
                    { $and: [{ user1: users[i]._id }, { user2: req.user }] },
                    { $and: [{ user1: req.user }, { user2: users[i]._id }] },
                ],
            });

            // Currently to align with frontend code, 'status' will be set using old method.
            if (result) {
                if (result.status == 'accepted') status = 'Accepted';
                else {
                    if (result.user1 == req.user) status = 'Requested';
                    else status = 'AcceptIt';
                }
            }

            searchResult.push({
                id: users[i]._id,
                username: users[i].username,
                status: status,
            });
        }
        res.json({ searchResult: searchResult });
    } catch (error) {
        console.log(error);
        res.status(500).json({ err: 'server error' });
    }
});

module.exports = Router;
