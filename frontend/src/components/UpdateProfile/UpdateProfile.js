import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { URL as URL1 } from '../utils/Config';
import LoadingSpinner from '../utils/LoadingSpinner';

function UpdateProfile() {
    const [username, setUsername] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [profilePicData, setProfilePicData] = useState(null);

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    const [isDataFetched, setIsDataFetched] = useState(false);
    const [isImageUpdated, setIsImageUpdated] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const history = useHistory();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('auth-token');
                const res = await axios.get(`${URL1}/users/getUserProfile`, {
                    headers: { 'x-auth-token': token },
                });
                setUsername(res.data.username);
                setProfilePic(res.data.profilePic);
                setIsDataFetched(true);
            } catch (error) {
                if (error.response.status === 401) {
                    history.push('/login');
                }
                if (error.response && error.response.data) setError(error.response.data.err);
                else setError('Something went wrong. Please try again');
                setIsDataFetched(true);
            }
        };
        fetchUserData();
    }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        setMessage('');
        setError('');
        const token = localStorage.getItem('auth-token');
        try {
            // check if user has updated profile pircture 
            if (isImageUpdated) {
                const formData = new FormData();
                formData.set('profilePic', profilePicData);
                await axios.post(`${URL1}/users/updateProfilePic`, formData, {
                    headers: { 'x-auth-token': token },
                });
            }
            await axios.post(`${URL1}/users/updateUsername`, { username: username }, { headers: { 'x-auth-token': token } });
            setError('');
            setMessage('Profile updated successfully');
            setIsUpdating(false);
        } catch (error) {
            if (error.response && error.response.data) setError(error.response.data.err);
            else setError('Something went wrong. Please try again');
            setMessage('');
            setIsUpdating(false);
        }
    };

    const uploadImage = (e) => {
        setProfilePicData(e.target.files[0]);
        setProfilePic(URL.createObjectURL(e.target.files[0]));
        setIsImageUpdated(true);
    };

    return (
        <div className='RegisterContainer'>
            {isDataFetched ? (
                <div className='RegisterPage'>
                    {message !== '' && <div className='OkMessage'>{message}</div>}
                    {error !== '' && <div className='error'>{error}</div>}
                    <h2 className='pageTitle'>Update Profile</h2>
                    <form className='form' onSubmit={onSubmit}>
                        <div className='UploadPicContainer'>
                            {/* if user has updated profile pic then display ne wprofile pic */}
                            {isImageUpdated ? (
                                <img src={profilePic} className='ProfilePicUpload' alt='Profile Pic'></img>
                            ) : (
                                <img
                                    className='ProfilePicUpload'
                                    alt='Profile Pic'
                                    src={`data:${profilePic.mimetype};base64,${profilePic.data}`}
                                />
                            )}
                            <input type='file' className='UploadPicBtn' onChange={(e) => uploadImage(e)} />
                        </div>
                        <label htmlFor='username'>Username</label>
                        <input
                            type='text'
                            id='username'
                            className='inputField'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <div className='RegisterSubmitDiv'>
                            <input type='submit' className='submitbutton' value='Update' />
                            {isUpdating && (
                                <div>
                                    <LoadingSpinner size='small' />
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            ) : (
                <div className='LoadingSpinnerDiv'>
                    <LoadingSpinner />
                </div>
            )}
        </div>
    );
}

export default UpdateProfile;
