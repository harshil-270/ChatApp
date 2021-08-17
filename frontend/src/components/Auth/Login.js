import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useHistory, Link } from 'react-router-dom';
import UserContext from '../../context/UserContext';
import LoadingSpinner from '../utils/LoadingSpinner';
import { URL } from '../utils/Config';

export default function Login(props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLogining, setIsLogining] = useState(false);

    const Context = useContext(UserContext);
    const history = useHistory();

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLogining(true);
        setError('');
        setMessage('');
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


    useEffect(() => {
        if (props.location.search.includes('emailConfirm=true')) {
            setMessage('Your email id is confirmed successfully. You can login to your account now.')
        }
    }, [])

    return (
        <div className='LoginContainer'>
            <div className='LoginPage'>
                {error !== '' && <div className='error'>{error}</div>}
                {message !== '' && <div className='OkMessage'>{message}</div>}

                <h2 className='pageTitle'>Login</h2>
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
