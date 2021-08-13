import { useEffect, useState, useContext } from 'react';
import UserContext from '../../context/UserContext';
import LandingPage from './LandingPage';
import FriendsList from '../FriendsList/FriendsList';
import ChatWindow from '../ChatWindow/ChatWindow';
import './Home.css';

export default function Home() {
    // based on user is logged in or not render the component.
    const User = useContext(UserContext);

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


    if (!User.user.isValid) {
        return ( <div className='HomePage'><LandingPage /></div> )
    }

    return (
        <div className='HomePage'>
            <div className="MainWindow">
                <FriendsList receiver={receiver} changeReceiver={changeReceiver} />
                <ChatWindow receiver={receiver} changeReceiver={changeReceiver} />
            </div>
        </div>
    );
}
