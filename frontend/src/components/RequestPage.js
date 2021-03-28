import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { URL } from './utils/Config';
import LoadingSpinner from './utils/LoadingSpinner';

function RequestPage() {
    const [requestList, setRequestList] = useState([]);
    const [isDataFetched, setIsDataFetched] = useState(false);

    const history = useHistory();

    useEffect(() => {
        const getPendingRequestList = async () => {
            try {
                const token = localStorage.getItem('auth-token');
                const res = await axios.get(`${URL}/users/getRequestList`, { headers: { 'x-auth-token': token } });
                setRequestList(res.data.requestList);
                setIsDataFetched(true);
            } catch (error) {
                setIsDataFetched(true);
                if (error.response.status === 401) history.push('/login');
            }
        };
        getPendingRequestList();
    }, []);

    const AcceptRequest = async (e, index) => {
        const token = localStorage.getItem('auth-token');
        try {
            await axios.post(
                `${URL}/users/acceptFriendRequest`,
                { id: requestList[index].id },
                { headers: { 'x-auth-token': token } }
            );
            // remove the user from request list.
            let newList = requestList;
            newList.splice(index, 1);
            setRequestList([...newList]);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className='RequestPageBackground'>
            <div className='RequestWindow'>
                {isDataFetched ? (
                    requestList.length ? (
                        requestList.map((request, index) => {
                            return (
                                <div className='ResultLine' key={index}>
                                    <div className='ResultName'>{request.username}</div>
                                    <button
                                        className='btnstyle1 AcceptIt RequestPageAcceptBtn'
                                        onClick={(e) => AcceptRequest(e, index)}>
                                        Accept
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className='NoRequestPending'>No Friend Request Pending</div>
                    )
                ) : (
                    <div className='LoadingSpinnerDiv'>
                        <LoadingSpinner />
                    </div>
                )}
            </div>
        </div>
    );
}

export default RequestPage;
