import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import queryString from 'query-string';
import { URL } from '../utils/Config';
import LoadingSpinner from '../utils/LoadingSpinner';
import './SearchResult.css';
import useFullPageLoader from '../utils/useFullPageLoader';

function SearchResult(props) {
    const [searchResult, setSearchResult] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDataFetched, setIsDataFetched] = useState(false);

    const [loader, showLoader, hideLoader] = useFullPageLoader();
    const history = useHistory();

    useEffect(() => {
        const fetchResult = async () => {
            setIsDataFetched(false);
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
        showLoader();
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
        hideLoader();
    };
    const AcceptRequest = async (e, index) => {
        showLoader();
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
        <div className="SearchPageBackground">
            <div className="SearchWindow">
                <div className="SearchResultTitle">Search Result for "{searchQuery}"</div>
                {searchResult.length ? (
                    <div className="SearchResultContent">
                        {searchResult.map((result, index) => {
                            // based on status render the search result list.
                            if (result.status === 'Accepted') {
                                return (
                                    <div className="ResultLine" key={index}>
                                        <div className="ResultName">{result.username}</div>
                                        <div className="AlreadyFriends">Already Friends</div>
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
                                                className="btnstyle AcceptIt"
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
                                                className="btnstyle SendFriendRequest"
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
                    <div className="NoResultFound">No results found</div>
                )}
            </div>
            {loader}
        </div>
    );
}

export default SearchResult;
