import React, { useEffect, useState } from 'react';
import FriendsList from '../FriendsList/FriendsList';
import ChatWindow from '../ChatWindow/ChatWindow';

function MainScreen() {
    const [receiver, setReceiver] = useState('');
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    const changeReceiver = (receiver) => {
        setReceiver(receiver);
    };
    
    const handleWindowSizeChange = () => {
        setWindowWidth(window.innerWidth);
    };
    useEffect(() => {
        window.addEventListener('resize', handleWindowSizeChange);
        return () => {
            window.removeEventListener('resize', handleWindowSizeChange);
        };
    }, []);

    return (
        <div className='MainWindow'>
            <FriendsList receiver={receiver} changeReceiver={changeReceiver} />
            <ChatWindow receiver={receiver} changeReceiver={changeReceiver} />
        </div>
    );
}

export default MainScreen;
