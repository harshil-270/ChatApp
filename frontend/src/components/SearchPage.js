import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import queryString from 'query-string';
import { URL } from './utils/Config';
import LoadingSpinner from './utils/LoadingSpinner';

function SearchPage(props) {
    const [searchResult, setSearchResult] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDataFetched, setIsDataFetched] = useState(false);

    const history = useHistory();

    useEffect(() => {
        const fetchResult = async () => {
            try {
                // fetch the user list for given search query.
                const token = localStorage.getItem('auth-token');
                const data = queryString.parse(props.location.search);
                setSearchQuery(data.searchQuery);

                const res = await axios.get(`${URL}/users/getSimilarUsername`, {
                    params: { searchQuery: data.searchQuery },
                    headers: { 'x-auth-token': token },
                });
                setSearchResult(res.data.searchResult);
                setIsDataFetched(true);
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    history.push('/login');
                }
                setIsDataFetched(true);
            }
        };
        fetchResult();
    }, [props]);

    const sendFriendRequest = async (e, index) => {
        try {
            const token = localStorage.getItem('auth-token');
            await axios.post(
                `${URL}/users/sendFriendRequest`,
                { id: searchResult[index].id },
                { headers: { 'x-auth-token': token } }
            );
            // after sendig friend request change the status.
            let newList = searchResult;
            newList[index].status = 'Requested';
            setSearchResult([...newList]);
        } catch (error) {
            console.error(error);
        }
    };
    const AcceptRequest = async (e, index) => {
        try {
            const token = localStorage.getItem('auth-token');
            await axios.post(
                `${URL}/users/acceptFriendRequest`,
                { id: searchResult[index].id },
                { headers: { 'x-auth-token': token } }
            );
            let newList = searchResult;
            newList[index].status = 'Accepted';
            setSearchResult([...newList]);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="SearchPageBackground">
            <div className="SearchWindow">
                <div className="SearchResultSubTitle">Search Result for {searchQuery}</div>
                {isDataFetched === true ? (
                    searchResult.length ? (
                        <div>
                            {searchResult.map((result, index) => {
                                // based on status render the search result list.
                                if (result.status === 'Accepted') {
                                    return (
                                        <div className="ResultLine" key={index}>
                                            <div className="ResultName">{result.username}</div>
                                            <div className="AlreadyFriends">Friends</div>
                                        </div>
                                    );
                                } else if (result.status === 'Requested') {
                                    return (
                                        <div className="ResultLine" key={index}>
                                            <div className="ResultName">{result.username}</div>
                                            <div className="Requested">Requested</div>
                                        </div>
                                    );
                                } else if (result.status === 'AcceptIt') {
                                    return (
                                        <div className="ResultLine" key={index}>
                                            <div className="ResultName">{result.username}</div>
                                            <div className="AcceptItDiv">
                                                <button
                                                    className="btnstyle1 AcceptIt"
                                                    onClick={(e) => AcceptRequest(e, index)}
                                                >
                                                    Accept
                                                </button>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="ResultLine" key={index}>
                                            <div className="ResultName">{result.username}</div>
                                            <div className="SendFriendRequestDiv">
                                                <button
                                                    className="btnstyle1 SendFriendRequest"
                                                    onClick={(e) => sendFriendRequest(e, index)}
                                                >
                                                    Send Friend Request
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    ) : (
                        <div>No results found</div>
                    )
                ) : (
                    <div className="LoadingSpinnerDiv">
                        <LoadingSpinner />
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchPage;
