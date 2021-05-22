import React from 'react';
import { useHistory } from 'react-router-dom';

function LandingPage() {
    const history = useHistory();
    const handleClick = () => {
        history.push('/register');
    }
    return (
        <div className='DefaultPage'>
            <div className='DefaultPageTitle1'>ChatApp</div>
            <div className='DefaultPageDesc'>Chat with your friends anytime from anywhere</div>
            <div className='DefaultPageGetStarted'><button onClick={handleClick}>Get Started</button></div>
        </div>
    );
}

export default LandingPage;
