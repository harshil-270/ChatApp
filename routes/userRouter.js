const Router = require('express').Router();
const User = require('../models/users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../auth/auth');
const mongoose = require('mongoose');
const multer = require('multer');
const transporter = require('../auth/emailAuth');
const fs = require('fs');
const CryptoJS = require('crypto-js');

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
        fileSize: 1024 * 1024 * 5, // profile picture size limit 5mb
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
    // validate the user data
    if (!req.body.username || !req.body.email || !req.body.password || !req.body.confirmPassword) {
        return res.status(400).json({ err: 'Please fill all the fields' });
    }
    if (req.body.password.length < 5) {
        return res.status(400).json({ err: 'Password length must be greater than 5' });
    }
    if (req.body.password !== req.body.confirmPassword) {
        return res.status(400).json({ err: 'Password and confirm password must be same' });
    }

    try {
        // first check if user with same username or email already exits or not.
        let user = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
        if (user) {
            if (user.confirmed) {
                if (user.username === req.body.username) {
                    return res.status(400).json({ err: 'Username is already taken.' });
                } else {
                    return res.status(400).json({ err: 'EmailID is already registered' });
                }
            } else {
                // if difference between current time and account creation time is greater than 1 day(24*60 minutes). then delete it.
                let diffInMin = (Date.now() - user.createdAt.getTime()) / (1000 * 60);
                if (diffInMin <= 24 * 60) {
                    // if username is already taken but email id is not confirmed then
                    // if account was created less than 1 day ago then some other user cant take this username.
                    if (user.username === req.body.username) {
                        return res.status(400).json({ error: 'Username is already taken. Please choose another username' });
                    }
                }

                await User.findByIdAndDelete(user._id);
            }
        }
        // store hashed password in database
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

        // sedn the email verification mail.
        jwt.sign({ user: user._id }, JWT_SECRET, { expiresIn: '1d' }, (err, emailToken) => {
            const url = `${SERVER_URL}/users/confirmation/${emailToken}`;
            transporter
                .sendMail({
                    to: user.email,
                    subject: 'Account confirmation (ChatApp)',
                    html: `Please click on this <a href="${url}">link</a> to confirm your email`,
                })
                .catch((error) => {
                    console.log(error);
                });
            res.json({ msg: 'User registered' });
        });
    } catch (error) {
        res.status(500).json({err: 'Server error'});
    }
});

Router.get('/confirmation/:token', async (req, res) => {
    try {
        // verify email verification token.
        const data = jwt.verify(req.params.token, JWT_SECRET);
        const id = data.user;
        let user = await User.findById(id);
        if (!user) {
            return res.status(400).json({ err: 'Wrong token' });
        }
        user.confirmed = true;
        await user.save();
        return res.redirect(`${CLIENT_URL}/login`);
    } catch (error) {
        res.status(500).json({err: 'server error'});
    }
});

Router.post('/login', async (req, res) => {

    if (!req.body.email || !req.body.password) {
        return res.status(400).json({ err: 'Please fill all the fields' });
    }
    try {
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            // check if user has verified email address or not.
            if (!user.confirmed) {
                return res.status(400).json({ err: 'Please Confirm Your email to login' });
            }
            // compare hashed password.
            const isSame = await bcrypt.compare(req.body.password, user.password);
            if (isSame) {
                // generate auth token which expires in 1day.
                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
                return res.json({
                    token,
                    id: user._id,
                    username: user.username,
                });
            } else {
                return res.status(400).json({ err: 'Wrong Email ID or Password' });
            }
        } else {
            return res.status(400).json({ err: 'Account does not exist. Please register first' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({err: 'server error'});
    }
});

Router.post('/resetPassword', async (req, res) => {
    try {
        // check if user exits or not.
        let user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ err: 'Email Id is not registered' });
        
        // generate random token for reseting password.
        // const token = crypto.randomBytes(32).toString('hex');
        let token = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for ( var i = 0; i < 64; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        user.resetToken = token;
        user.expiryTime = Date.now() + 600000; // expires in 10 min
        user = await user.save();

        // send email to user with reset token
        const url = `${CLIENT_URL}/reset/${token}`;
        transporter.sendMail({
            to: user.email,
            subject: 'Password reset (ChatApp)',
            html: `
            <p>You have requested for password reset</p>
            <p><b>Please click on this <a href="${url}">link</a> to reset your password<b></p>`,
        });
        res.json({ msg: 'Check your Email' });
    } catch (error) {
        return res.status(500).json({err: 'server error'});
    }
});

Router.post('/newPassword', async (req, res) => {
    // validate password and confirmPassword.
    if (req.body.password.length < 5) {
        return res.status(400).json({ err: 'Password length must be greater than 5' });
    }
    if (req.body.password !== req.body.confirmPassword) {
        return res.status(400).json({ err: 'Password and confirm password must be same' });
    }
    try {
        // find user and make sure reset token is not expired.
        let user = await User.findOne({ resetToken: req.body.resetToken, expiryTime: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ err: 'Your session has expired. Please try again' });

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.expiryTime = undefined;
        await user.save();
        
        res.json({ msg: 'Password updated successfully' });
    } catch (error) {
        return res.status(500).json({err: 'server error'});
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
        return res.status(500).json({err: 'server error'});
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
        return res.status(500).json({err: 'server error'});
    }
});

Router.post('/updateUsername', auth, async (req, res) => {
    try {
        if (!req.body.username) {
            return res.status(400).json({ err: `Username can't be empty` });
        }
        let user = await User.findById(req.user);
        if (user.username === req.body.username) {
            return res.status(200).json({msg: 'success'});
        }
        if (user) {
            // check if new username is availabel or not
            let alreadyExist = await User.findOne({ username: req.body.username });
            if (alreadyExist) {
                return res.status(400).json({ err: 'Username is already taken' });
            }
            user.username = req.body.username;
            await user.save();
            res.json({ msg: 'success' });
        } else {
            res.status(400).json({ err: 'No User found' });
        }
    } catch (err) {
        res.status(400).json({ err: 'Error Updating Profile' });
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
        // unique id between any 2 friends. used for socket connections.
        const friendshipId = new mongoose.Types.ObjectId();

        // find the 1st user
        let user1 = await User.findById(req.user);
        if (!user1) return res.status(404).json({ err: 'cant find user' });
        // check if request has already been sent or not.
        for (let i = 0; i < user1.friends.length; i++) {
            if (user1.friends[i].user.equals(req.body.id)) {
                return res.status(400).json({ err: 'Request is already sent' });
            }
        }
        user1.friends.push({
            user: req.body.id,
            status: 'Requested',
            friendshipId: friendshipId,
        });
        await user1.save();

        // find the 2nd user.
        let user2 = await User.findById(req.body.id);
        if (!user2) return res.status(404).json({ err: 'cant find user' });
        user2.friends.push({
            user: req.user,
            status: 'AcceptIt',
            friendshipId: friendshipId,
        });
        await user2.save();

        res.json({ msg: 'Friend Request sended' });
    } catch (error) {
        return res.status(500).json({ err: 'Server error' });
    }
});

Router.post('/acceptFriendRequest', auth, async (req, res) => {
    try {
        let user1 = await User.findById(req.user);
        let ind = -1;
        // find the index of friend in friendlist.
        for (let i = 0; i < user1.friends.length; i++) {
            if (user1.friends[i].user.equals(req.body.id)) {
                ind = i;
                break;
            }
        }
        if (ind == -1) return res.status(400).json({ msg: 'cant find friend' });
        // update the status to accepted.
        user1.friends[ind].status = 'Accepted';
        user1 = await user1.save();

        let user2 = await User.findById(req.body.id);
        ind = -1;
        for (let i = 0; i < user2.friends.length; i++) {
            if (user2.friends[i].user.equals(req.user)) {
                ind = i;
                break;
            }
        }
        if (ind == -1) return res.status(400).json({ msg: 'cant find friend' });
        user2.friends[ind].status = 'Accepted';
        user2 = await user2.save();

        // Send the mail to user who send the friend request that friend request has been accepted.
        const url = `${CLIENT_URL}/`;
        transporter
            .sendMail({
                to: user2.email,
                subject: `${user1.username} has confirmed your friend request`,
                html: `<h2>ChatApp</h2><br/> ${user1.username} has confirmed your friend request. Click on this  <a href="${url}">link</a> to start chatting with friends`,
            })
            .catch((error) => {
                console.log(error);
            });
        res.status(200).json({ msg: 'Friend Request Accepted' });
    } catch (error) {
        res.status(500).json({ err: 'server error' });
    }
});

Router.get('/getRequestList', auth, async (req, res) => {
    try {
        // get user's pending request list.
        let user = await User.findById(req.user).populate('friends.user');
        if (!user) return res.status(404).json({ err: 'cant find user' });
        let requestList = [];
        for (let i = 0; i < user.friends.length; i++) {
            if (user.friends[i].status === 'AcceptIt') {
                requestList.push({
                    id: user.friends[i].user._id,
                    username: user.friends[i].user.username,
                });
            }
        }
        res.json({
            requestList: requestList,
        });
    } catch (error) {
        res.status(500).json({ err: 'server error' });
    }
});


Router.get('/getFriends', auth, async (req, res) => {
    try {
        // get all friends details for friend list sidebar in frontend.
        let user = await User.findById(req.user).populate('friends.user');
        if (!user) return res.status(404).json({ err: 'cant find user'});

        let friendsList = [];
        let requestCount = 0;

        for (let i = 0; i < user.friends.length; i++) {
            // count the number of pending request.
            if (user.friends[i].status === 'AcceptIt') requestCount++;
            // only get friend if requet has been accepted and they are friend.
            if (user.friends[i].status !== 'Accepted') continue;


            let profilePic = { data: '', mimetype: 'image/jpeg' };
            if (user.friends[i].user.profilePic && user.friends[i].user.profilePic.data) {
                profilePic.data = Buffer.from(user.friends[i].user.profilePic.data).toString('base64');
                profilePic.mimetype = user.friends[i].user.profilePic.contentType;
            }
            // get thr last message and the time it was send.
            let lastMessage = '';
            let time = '';
            if (user.friends[i].totalChatLength > 0) {
                lastMessage = decryptMessage(user.friends[i].lastMessage.message);
                time = user.friends[i].lastMessage.time;
            }

            friendsList.push({
                friendId: user.friends[i].user._id,
                username: user.friends[i].user.username,
                profilePic: profilePic,
                friendshipId: user.friends[i].friendshipId,
                status: user.friends[i].status,
                seenMessageCount: user.friends[i].seenMessageCount,
                totalChatLength: user.friends[i].totalChatLength,
                lastMessage: lastMessage,
                time: time,
            });   
        }
        res.json({
            requestCount,
            friendsList,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ err: 'server error' });
    }
});

Router.get('/getSimilarUsername', auth, async (req, res) => {
    try {
        // get the list of users whose username is matching with search query.
        const pattern = new RegExp('^' + req.query.searchQuery.trim());
        const mainUser = await User.findById(req.user);
        const users = await User.find({ username: { $regex: pattern, $options: 'i' } })
            .limit(25)
            .exec();
        let searchResult = [];
        for (let i = 0; i < users.length; i++) {
            // if user has not confirmed email address then exclude it.
            if (!users[i].confirmed) continue;
            // if user who searched for this query is in this list then exclude that user.
            if (users[i]._id.equals(req.user)) continue;

            // find if mainuser is friend(or previosly sended requert or pending request) with some user from friend list.
            let status = '';
            for (let j = 0; j < mainUser.friends.length; j++) {
                if (mainUser.friends[j].user.equals(users[i]._id)) {
                    status = mainUser.friends[j].status;
                    break;
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
