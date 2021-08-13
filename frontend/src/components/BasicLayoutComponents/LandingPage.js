import React from 'react';
import { useHistory } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
    const history = useHistory();
    const handleClick = () => {
        history.push('/register');
    }
    return (
        <div className='LandingPage'>
            <div className='LandingPageTitle'>ChatApp</div>
            <div className='LandingPageDescription'>Chat with your friends anytime from anywhere</div>
            <div className='LandingPageGetStarted'><button onClick={handleClick}>Get Started</button></div>
        </div>
    );
}

export default LandingPage;
