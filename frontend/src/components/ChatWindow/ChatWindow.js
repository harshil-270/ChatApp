import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

import ChatWindowHeader from './ChatWindowHeader';
import ChatWindowMessages from './ChatWindowMessages';
import ChatWindowFooter from './ChatWindowFooter';
import SendFileModal from './SendFileModal';

import { URL } from '../utils/Config';
import UserContext from '../../context/UserContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


/*
first get the list of all friends and chats
connect to socket using unique friendshipid's.
whenever user sends message or file insert it into the mongodb database and also emit socket event to friend.
*/


function ChatWindow(props) {
    const [chats, setChats] = useState([]);
    const [selectedFriend, setSelectFriend] = useState(-1);
    const [message, setMessage] = useState('');
    const [seenMessageCount, setSeenMessageCount] = useState([]);

    const [file, setFile] = useState(null);
    const [isFilePreviewOpened, setIsFilePreviewOpened] = useState(false);
    
    const [mobileChatWindowClass, setMobileChatWindowClass] = useState('');
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    let socket = io(URL);
    let timeout = undefined;

    const User = useContext(UserContext);
    const chatsRef = useRef(chats);
    const selectedFriendRef = useRef(selectedFriend);
    const seenMessageCountRef = useRef(seenMessageCount);
    const inputFile = useRef(null);

    // breakpoint between desktop view and mobile view.
    const breakpoint = 750;

    useEffect(() => {
        chatsRef.current = chats;
        selectedFriendRef.current = selectedFriend;
        seenMessageCountRef.current = seenMessageCount;
    });
    useEffect(() => {
        const connectSocket = async () => {
            // get all friends chat and details.
            const token = localStorage.getItem('auth-token');
            const res = await axios.get(`${URL}/messages/getFriendsChat`, { headers: { 'x-auth-token': token } });

            let newSeenMessageCount = [];
            for (let i = 0; i < res.data.friendsChat.length; i++) {
                newSeenMessageCount.push({
                    friendId: res.data.friendsChat[i].friendId,
                    count: res.data.friendsChat[i].seenMessageCount,
                });
            }
            setSeenMessageCount([...newSeenMessageCount]);
            setChats(res.data.friendsChat);

            // connect to socket room using friendshipIds
            let rooms = [];
            for (let i = 0; i < res.data.friendsChat.length; i++)
                rooms.push(res.data.friendsChat[i].friendshipId);
            socket.emit('join', { rooms: rooms });
            
            socket.on('message', ({ room, id, body, type, from, to, time }) => {
                let newChats = chatsRef.current;
                let newSeenMessageCount = seenMessageCountRef.current;

                // find the index of the friend who send the message.
                let index = -1;
                for (let i = 0; i < newChats.length; i++) {
                    if (room === newChats[i].friendshipId) {
                        index = i;
                        break;
                    }
                }
                if (index === -1) return;

                // if message is sent by me then we have already added message to state.
                if (from === User.user.id) return;

                // add new message to chats.
                newChats[index].chat.push({ id, from, to, body, type, time });

                // if currently user is chating with friend then user has already seen the message so update the seen message count.
                if (selectedFriendRef.current !== -1 && from === newChats[selectedFriendRef.current].friendId) {
                    newSeenMessageCount[index].count = newChats[index].chat.length;
                    const token = localStorage.getItem('auth-token');
                    axios.post(
                        `${URL}/messages/updateSeenMessages`,
                        { seenMessageCount: newSeenMessageCount[index].count, receiver: from },
                        { headers: { 'x-auth-token': token } }
                    );
                }

                setChats([...newChats]);
            });
        };
        connectSocket();

        window.addEventListener('resize', () => setWindowWidth(window.innerWidth));
        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        // if chats is updated then scroll to the latest message.
        let element = document.getElementById('AllChats');
        if (element) element.scrollTop = element.scrollHeight;
    }, [chats]);

    useEffect(() => {
        if (props.receiver === '') return;
        // find the index of currently selected friend.
        let index = -1;
        for (let i = 0; i < chats.length; i++) {
            if (chats[i].friendId === props.receiver) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            console.log('Cant fetch chat index = -1');
            return;
        }
        // update selected friend and we currently selected a new friend so we might have seen some unseen message so update seen message count.
        let newSeenMessageCount = seenMessageCount;
        newSeenMessageCount[index].count = chats[index].chat.length;
        setSelectFriend(index);
        setSeenMessageCount([...newSeenMessageCount]);
        
        const token = localStorage.getItem('auth-token');
        axios.post(`${URL}/messages/updateSeenMessages`,
            { seenMessageCount: seenMessageCount[index].count, receiver: props.receiver },
            { headers: { 'x-auth-token': token } }
        );

        // scroll to the top of unseen message.
        const element = document.getElementById('focusMessageId');
        if (element) document.getElementById('AllChats').scrollTop = element.offsetTop;
    }, [props.receiver]);

    useEffect(() => {
        // change classNames according to window width.
        if (windowWidth <= breakpoint) {
            if (selectedFriend === -1) setMobileChatWindowClass('MobileHideChatWindow');
            else setMobileChatWindowClass('MobileShowChatWindow');
        } else {
            if (mobileChatWindowClass !== '') setMobileChatWindowClass('');
        }
    }, [windowWidth, selectedFriend]);

    const typingTimeout = () => {
        // let friend know that you stopped typing.
        socket.emit('typing', {
            room: chats[selectedFriend].friendshipId,
            receiver: chats[selectedFriend].friendId,
            typing: false,
        });
    };
    const onInputChange = (e) => {
        // fire 'Typing' event so that friend can know that you are typing
        socket.emit('typing', {
            room: chats[selectedFriend].friendshipId,
            receiver: chats[selectedFriend].friendId,
            typing: true,
        });
        // clear the prev timeout and set new timeout.
        clearTimeout(timeout);
        timeout = setTimeout(typingTimeout, 3000);

        setMessage(e.target.value);
    };
    const sendMessage = async (e) => {
        e.preventDefault();

        if (message === '') return;
        // insert message into database and emit socket event
        const token = localStorage.getItem('auth-token');
        const room = chats[selectedFriend].friendshipId;
        const curTime = new Date();

        axios.post(`${URL}/messages/addChat`, {
            receiver: props.receiver,
            message: message,
        }, {
            headers: { 'x-auth-token': token },
        })
        .catch((err) => console.log('Cant add chat. request failed'));

        socket.emit('sendMessage', {
            room: room,
            body: message,
            type: 'message',
            from: User.user.id,
            to: props.receiver,
            time: curTime,
        });

        // insert message to chat array and update seen message count.
        let newChats = chats;
        let newSeenMessageCount = seenMessageCount;
        newChats[selectedFriend].chat.push({
            body: message,
            type: 'message',
            from: User.user.id,
            to: props.receiver,
            time: curTime,
        });
        newSeenMessageCount[selectedFriend].count = newChats[selectedFriend].chat.length;

        setChats([...newChats]);
        setSeenMessageCount([...newSeenMessageCount]);
        setMessage('');

        typingTimeout();
    };

    const handleSelectedFile = () => {
        // when user selectes the file, open file preview modal.
        if (inputFile.current.files[0]) {
            setFile(inputFile.current.files[0]);
            setIsFilePreviewOpened(true);
        }
    };
    const closeFilePreview = () => {
        // close the file preview modal.
        inputFile.current.value = '';
        setIsFilePreviewOpened(false);
    };
    const sendFile = async () => {
        try {

            const formData = new FormData();
            formData.append('file', file);
            formData.append('receiver', chats[selectedFriend].friendId);

            const token = localStorage.getItem('auth-token');
            const res = await axios.post(`${URL}/messages/uploadFile`, formData, {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data',
                },
            });

            // send the file to the friend.
            const room = chats[selectedFriend].friendshipId;
            const curTime = new Date();
            socket.emit('sendMessage', {
                room: room,
                id: res.data._id,
                body: file.name,
                type: 'file',
                from: User.user.id,
                to: props.receiver,
                time: curTime,
            });

            // insert filename to the chat array and update seen message count.
            let newChats = chats;
            let newSeenMessageCount = seenMessageCount;
            newChats[selectedFriend].chat.push({
                id: res.data._id,
                body: file.name,
                type: 'file',
                from: User.user.id,
                to: props.receiver,
                time: curTime,
            });
            newSeenMessageCount[selectedFriend].count = newChats[selectedFriend].chat.length;

            setChats([...newChats]);
            setSeenMessageCount([...newSeenMessageCount]);

            // after file is sent, close the file preview modal.
            closeFilePreview();
        } catch (error) {
            closeFilePreview();
            toast('Unable to send file. Either file extension not supported or server error');
        }
    };

    return (
        <div className={`ChatWindow ${mobileChatWindowClass}`}>
            {selectedFriend !== -1 ? (
                <>
                    <ChatWindowHeader friend={chats[selectedFriend]} windowWidth={windowWidth} setSelectFriend={setSelectFriend} changeReceiver={props.changeReceiver} />
                    <ChatWindowMessages chats={chats} selectedFriend={selectedFriend} seenMessageCount={seenMessageCount} />
                    <ChatWindowFooter
                        inputFile={inputFile}
                        handleSelectedFile={handleSelectedFile}
                        onInputChange={onInputChange}
                        message={message}
                        sendMessage={sendMessage}
                    />
                </>
            ) : (
                <div id='EmptyChatWindow'></div>
            )}

            <SendFileModal
                isFilePreviewOpened={isFilePreviewOpened}
                closeFilePreview={closeFilePreview}
                file={file}
                sendFile={sendFile}
            />
            <ToastContainer />
        </div>
    );
}

export default ChatWindow;
