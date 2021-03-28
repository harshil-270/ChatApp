import React, { useState } from 'react';
import axios from 'axios';
import { URL } from '../utils/Config';
import LoadingSpinner from '../utils/LoadingSpinner';

function NewPassword(props) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isReseting, setIsReseting] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsReseting(true);
        try {
            await axios.post(`${URL}/users/newPassword`, {
                password: password,
                confirmPassword: confirmPassword,
                resetToken: props.match.params.resetToken,
            });
            setError('');
            setMessage('Password updated successfully');
            setIsReseting(false);
        } catch (error) {
            if (error.response && error.response.data) setError(error.response.data.err);
            else setError('Something went wrong. PLease try again');
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
                    <label htmlFor='password'>Password*</label>
                    <input type='password' id='password' className='inputField' onChange={(e) => setPassword(e.target.value)} />
                    <label htmlFor='confirmPassword'>Confirm Password*</label>
                    <input
                        type='password'
                        id='confirmPassword'
                        className='inputField'
                        onChange={(e) => setConfirmPassword(e.target.value)}
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

export default NewPassword;
