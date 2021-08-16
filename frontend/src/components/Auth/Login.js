import { React, useState, useContext } from 'react';
import axios from 'axios';
import { useHistory, Link } from 'react-router-dom';
import UserContext from '../../context/UserContext';
import LoadingSpinner from '../utils/LoadingSpinner';
import { URL } from '../utils/Config';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLogining, setIsLogining] = useState(false);

    const Context = useContext(UserContext);
    const history = useHistory();

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLogining(true);
        setError('');
        try {
            const res = await axios.post(`${URL}/users/login`, { email: email, password: password });
            Context.setUser({
                id: res.data.id,
                token: res.data.token,
                username: res.data.username,
                isValid: true,
            });
            localStorage.setItem('auth-token', res.data.token);
            history.push('/');
        } catch (error) {
            if (error.response && error.response.data) setError(error.response.data.err);
            setIsLogining(false);
        }
    };

    return (
        <div className='LoginContainer'>
            <div className='LoginPage'>
                <h2 className='pageTitle'>Login</h2>
                {error !== '' && <div className='error'>{error}</div>}
                <form className='form' onSubmit={onSubmit}>
                    <label htmlFor='Email'>Email</label>
                    <input type='email' id='Email' className='inputField' onChange={(e) => setEmail(e.target.value)} />
                    <label htmlFor='Password'>Password</label>
                    <input type='password' id='Password' className='inputField' onChange={(e) => setPassword(e.target.value)} />

                    <Link to='/reset'>
                        <div className='ForgetPassword'>Forgot password?</div>
                    </Link>
                    <div className='LoginSubmitDiv'>
                        <input type='submit' className='submitbutton' value='Login' />
                        {isLogining && (
                            <div>
                                <LoadingSpinner size='small' />
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
