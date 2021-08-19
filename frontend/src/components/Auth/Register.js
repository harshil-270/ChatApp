import { React, useState } from 'react';
import axios from 'axios';
import defaultUserPic from '../../assets/defaultUserPic.png';
import { URL as URL1 } from '../utils/Config';
import LoadingSpinner from '../utils/LoadingSpinner';
import { Link } from 'react-router-dom';

export default function Register() {
    const [user, setUser] = useState({
        Username: '',
        Email: '',
        Password: '',
        ConfirmPassword: '',
        profilePic: defaultUserPic,
        profilePicDetails: {},
    });
    const [isRegistering, setIsRegistering] =  useState(false);
    const [isImageUploaded, setIsImageUploaded] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    
    const onChange = (e) => {
        const oldUser = user;
        setUser({
            ...oldUser,
            [e.target.id]: e.target.value,
        });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsRegistering(true);
        setError('');
        if (isImageUploaded === false) {
            setIsRegistering(false);
            setError('Please upload profile picture');
            return;
        }

        const formData = new FormData();
        formData.append('username', user.Username);
        formData.append('email', user.Email);
        formData.append('password', user.Password);
        formData.append('confirmPassword', user.ConfirmPassword);
        formData.append('profilePic', user.profilePicDetails);
        try {
            await axios.post(`${URL1}/users/register`, formData);
            setSuccessMessage('We have sent you confirmation mail. Please confirm your Email Id. Make sure to check spam folder.');
            setError('');
        } catch (error) {
            if (error.response && error.response.data && error.response.data.err) setError(error.response.data.err);
            else setError('Something went wrong. Please try again');
            setSuccessMessage('');
        }
        setIsRegistering(false);
    };

    const uploadImage = (e) => {
        const oldUser = user;
        setUser({
            ...oldUser,
            profilePicDetails: e.target.files[0],
            profilePic: URL.createObjectURL(e.target.files[0]),
        });
        setIsImageUploaded(true);
    };
    return (
        <div className='RegisterContainer'>
            <div className='RegisterPage'>
                
                {successMessage !== '' && <div className='OkMessage'>{successMessage}</div> }
                {error !== '' && <div className='error'>{error}</div>}
                
                <h2 className='pageTitle'>Register</h2>
                <form className='form' onSubmit={onSubmit}>
                    
                    <div className='UploadPicContainer'>
                        <img src={user.profilePic} className='ProfilePicUpload' alt='Upload Profile Pic'></img>
                        <input type='file' accept=".jpg,.jpeg,.png" className='UploadPicBtn' onChange={(e) => uploadImage(e)} />
                    </div>

                    <label htmlFor='Username'>Username<span style={{color: 'red'}}>*</span></label>
                    <input type='text' id='Username' className='inputField' onChange={onChange} />
                    
                    <label htmlFor='Email'>Email<span style={{color: 'red'}}>*</span></label>
                    <input type='email' id='Email' className='inputField' onChange={onChange} />
                    
                    <label htmlFor='Password'>Password<span style={{color: 'red'}}>*</span></label>
                    <input type='password' id='Password' className='inputField' onChange={onChange} />
                    
                    <label htmlFor='ConfirmPassword'>Confirm Password<span style={{color: 'red'}}>*</span></label>
                    <input type='password' id='ConfirmPassword' className='inputField' onChange={onChange} />
                    <div>
                        Already have an account?{' '}
                        <Link to='/login'>Login</Link>
                    </div>
                    <div className='RegisterSubmitDiv'>
                        <input type='submit' className='submitbutton' value='Register' />
                        {isRegistering && <div><LoadingSpinner size='small' /></div>}
                    </div>
                </form>
            </div>
        </div>
    );
}
