import { React, useContext } from 'react';
import UserContext from '../../context/UserContext';
import LandingPage from './LandingPage';
import MainScreen from './MainScreen';

export default function Home() {
    // based on user is logged in or not render the component.
    const User = useContext(UserContext);
    return <div className='HomePage'>{User.user.isValid ? <MainScreen /> : <LandingPage />}</div>;
}
