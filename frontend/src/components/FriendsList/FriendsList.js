import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Link } from 'react-router-dom';
import { URL } from '../utils/Config';
import FriendBox from './FriendBox';
import UserContext from '../../context/UserContext';
import LoadingSpinner from '../utils/LoadingSpinner';
import userIcon from '../../assets/userIcon.png';
import searchIcon from '../../assets/searchIcon2.png';
import './FriendsList.css';

// sidebar compoent to show all friends. user can chat with friend by clicking on that friend from friendlist.

const socket = io(URL);

function FriendsList(props) {
    const [friendList, setFriendList] = useState([]);
    const [searchFriend, setSearchFriend] = useState('');
    const [friendRequestCount, setFriendRequestCount] = useState(0);

    const [isDataFetched, setIsDataFetched] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [mobileFriendList, setMobileFriendList] = useState('');

    const User = useContext(UserContext);
    const friendsListRef = useRef(friendList);
    const receiverRef = useRef(props.receiver);

    useEffect(() => {
        friendsListRef.current = friendList;
        receiverRef.current = props.receiver;
    });

    // sort friend list by last message time.
    const sortFriendList = (list) => {
        list.sort((x, y) => y.time.localeCompare(x.time));
        return list;
    };

    useEffect(() => {
        // change the title based on number of friends who has sent the message(but message has not been seen)
        let count = 0;
        for (let i = 0; i < friendList.length; i++) {
            if (friendList[i].unseenMessageCount > 0) {
                count++;
            }
        }
        if (count > 0) document.title = `(${count})ChatApp`;
        else document.title = 'ChatApp';
    }, [friendList]);

    useEffect(() => {
        // filter the friend list
        const regex = new RegExp('^' + searchFriend, 'gi');

        let newFriendList = friendList;
        for (let i = 0; i < newFriendList.length; i++) {
            // if friend's name mathces the regex then show propery will be true else false.
            newFriendList[i].show = newFriendList[i].username.match(regex);
        }
        setFriendList([...newFriendList]);
    }, [searchFriend]);

    useEffect(() => {
        const connectSocket = async () => {
            // get the list of friends and connect to socket so that whenever new message comes we can update last message.
            const token = localStorage.getItem('auth-token');
            const res = await axios.get(`${URL}/users/getFriends`, {
                headers: { 'x-auth-token': token },
            });

            let rooms = [];
            for (let i = 0; i < res.data.friendsList.length; i++) {
                rooms.push(res.data.friendsList[i].friendshipId);
                res.data.friendsList[i].isTyping = false;
                res.data.friendsList[i].show = true;
            }
            // sort the friend list based on last message time.
            res.data.friendsList = sortFriendList(res.data.friendsList);
            setFriendList(res.data.friendsList);
            setFriendRequestCount(res.data.requestCount);
            setIsDataFetched(true);

            socket.emit('join', { rooms: rooms });
            socket.on('message', ({ room, body, from, time }) => {
                let newFriendList = friendsListRef.current;

                let index = -1;
                for (let i = 0; i < newFriendList.length; i++) {
                    if (room === newFriendList[i].friendshipId) {
                        index = i;
                        break;
                    }
                }
                if (index === -1) return;

                newFriendList[index].lastMessage = body;
                newFriendList[index].time = time;
                // If message was sent by me then we had already seen the message.
                // If currently we are not chatting with the user who sent us this message, then increament unseeen message count.
                if (from != User.user.id && from != receiverRef.current) newFriendList[index].unseenMessageCount += 1;

                newFriendList = sortFriendList(newFriendList);
                setFriendList([...newFriendList]);
            });
            socket.on('typingDisplay', ({ room, receiver, typing }) => {
                let newFriendList = friendsListRef.current;

                let index = -1;
                for (let i = 0; i < newFriendList.length; i++) {
                    if (newFriendList[i].friendshipId === room) {
                        index = i;
                        break;
                    }
                }
                // if I am typing then we dont need to change the typing status. we only change typing status when friend types.
                if (newFriendList[index].friendId === receiver) return;

                // if typing status has changed the update the state.
                if (newFriendList[index].isTyping !== typing) {
                    newFriendList[index].isTyping = typing;
                    setFriendList([...newFriendList]);
                }
            });
        };
        connectSocket();

        window.addEventListener('resize', () => setWindowWidth(window.innerWidth));
        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        // If it is mobile view then change the classname for div element.
        if (window.innerWidth <= 750) {
            if (props.receiver === '') setMobileFriendList('MobileShowFriendList');
            else setMobileFriendList('MobileHideFriendList');
        } else {
            if (mobileFriendList !== '') setMobileFriendList('');
        }
    }, [windowWidth, props.receiver]);


    return (
        <div className={`FriendList ${mobileFriendList}`}>
            <div className="FriendListTopBar">
                <div className="SearchIconDiv">
                    <img src={searchIcon}  className="SearchIcon"></img>
                </div>
                <input
                    type="text"
                    className="FilterFriendInput"
                    placeholder="Search Friend"
                    value={searchFriend}
                    onChange={(e) => setSearchFriend(e.target.value)}
                />
                <div className="RequestListIconDiv">
                    <Link to="/request">
                        <img src={userIcon} className="UserIcon" alt="userIcon" />
                        <div className="FriendRequestCount">{friendRequestCount}</div>
                    </Link>{' '}
                </div>
            </div>

            {isDataFetched ? (
                <FriendBox
                    friendList={friendList}
                    setFriendList={setFriendList}
                    receiver={props.receiver}
                    changeReceiver={props.changeReceiver}
                />
            ) : (
                <div className="LoadingSpinnerDiv">
                    <LoadingSpinner />
                </div>
            )}
        </div>
    );
}

export default FriendsList;
