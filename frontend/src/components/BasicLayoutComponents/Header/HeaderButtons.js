import { React, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import UserContext from '../../../context/UserContext';

export default function HeaderButtons() {
    const User = useContext(UserContext);
    const history = useHistory();
    const register = () => {
        history.push('/register');
    };
    const login = () => {
        history.push('/login');
    };
    const logout = () => {
        User.setUser({
            token: '',
            id: '',
            username: '',
            isValid: false,
        });
        localStorage.setItem('auth-token', '');
        history.push('/');
    };
    const updateProfile = () => {
        history.push('/updateprofile');
    };

    // based on whether user has logged in or not show buttons on header.
    return (
        <nav className='auth-buttons'>
            {User.user.isValid ? (
                <>
                    <button onClick={updateProfile}>Update Profile</button>
                    <button onClick={logout}>Log out</button>
                </>
            ) : (
                <>
                    <button onClick={register}>Register</button>
                    <button onClick={login}>Log in</button>
                </>
            )}
        </nav>
    );
}
