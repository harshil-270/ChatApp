import { React, useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import HeaderButtons from './HeaderButtons';
import UserContext from '../../../context/UserContext';
import HamburgerIcon from '../../../assets/HamburgerIcon.jpg';
import './Header.css'

export default function Header() {
    const [windowSize, setWindowSize] = useState(window.innerWidth);
    // button visible in mobile view to open header menu
    const [isMenuButtonPressed, setIsMenuButtonPressed] = useState(false);
    const User = useContext(UserContext);

    const onWindowSizeChange = () => {
        setWindowSize(window.innerWidth);
    };
    useEffect(() => {
        window.addEventListener('resize', onWindowSizeChange);
        return () => {
            window.removeEventListener('resize', onWindowSizeChange);
        };
    }, []);

    // in desktop view show button on header
    // and in mobile view show menu button which will show other buttons on click.
    if (windowSize > 600) {
        return (
            <header id='header'>
                <Link to='/'>
                    <h1 id='title'>ChatApp</h1>
                </Link>
                {User.user.isValid && <SearchBar />}
                <HeaderButtons />
            </header>
        );
    }

    return (
        <header id='header'>
            <Link to='/'>
                <h1 id='title'>ChatApp</h1>
            </Link>
            {User.user.isValid ? (
                <>
                    {!isMenuButtonPressed && <SearchBar />}
                    <div className='MenuIconDiv'>
                        {isMenuButtonPressed && <HeaderButtons />}
                        <img
                            src={HamburgerIcon}
                            onClick={() => setIsMenuButtonPressed(!isMenuButtonPressed)}
                            width='30px'
                            height='30px'
                            alt='Menu Icon'
                        />
                    </div>
                </>
            ) : (
                <HeaderButtons />
            )}
        </header>
    );
}
