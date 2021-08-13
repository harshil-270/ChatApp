import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { URL } from '../utils/Config';
import LoadingSpinner from '../utils/LoadingSpinner';
import useFullPageLoader from '../utils/useFullPageLoader';
import './RequestPage.css';

function RequestPage() {
    const [requestList, setRequestList] = useState([]);
    const [isDataFetched, setIsDataFetched] = useState(false);

    const [loader, showLoader, hideLoader] = useFullPageLoader();
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
        showLoader();
        try {
            const token = localStorage.getItem('auth-token');
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
        hideLoader();
    };

    if (!isDataFetched) {
        return (
            <div className="LoadingSpinnerDiv">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="RequestPageBackground">
            <div className="RequestWindow">
                <div className="RequestPageTitle">Pending Friend Requests</div>
                {requestList.length ? (
                    <div className="RequestPageContent">
                        {requestList.map((request, index) => {
                            return (
                                <div className="ResultLine" key={index}>
                                    <div className="ResultName">{request.username}</div>
                                    <div className="AcceptItDiv">
                                        <button
                                            className="btnstyle AcceptIt RequestPageAcceptBtn"
                                            onClick={(e) => AcceptRequest(e, index)}
                                        >
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="NoRequestPending">No Friend Request Pending</div>
                )}
            </div>
            {loader}
        </div>
    );
}

export default RequestPage;
