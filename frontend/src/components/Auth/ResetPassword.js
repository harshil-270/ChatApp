import React, { useState } from 'react';
import axios from 'axios';
import { URL } from '../utils/Config';
import LoadingSpinner from '../utils/LoadingSpinner';

function ResetPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isReseting, setIsReseting] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsReseting(true);
        try {
            await axios.post(`${URL}/users/resetPassword`, { email: email });
            setMessage(
                'We have sent you a mail for reseting password. Make sure to check your spam folder.'
            );
            setError('');
            setIsReseting(false);
        } catch (error) {
            if (error.response && error.response.data) setError(error.response.data.err);
            else setError('Something went wrong. Please try again');
            setMessage('');
            setIsReseting(false);
        }
    };

    return (
        <div className='RegisterContainer'>
            <div className='RegisterPage'>
                {message !== '' && <div className='OkMessage'>{message}</div>}
                {error !== '' && <div className='error'>{error}</div>}
                <h2 className='pageTitle'>Reset Password</h2>
                <form className='form' onSubmit={onSubmit}>
                    <label htmlFor='email'>Email</label>
                    <input
                        type='text'
                        id='email'
                        className='inputField'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className='RegisterSubmitDiv'>
                        <input type='submit' className='submitbutton' value='Reset' />
                        {isReseting && (
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

export default ResetPassword;
