import { React, useState, useEffect } from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import axios from 'axios';

import './style.css';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import NewPassword from './components/Auth/NewPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Home from './components/BasicLayoutComponents/Home';
import Header from './components/BasicLayoutComponents/Header/Header';
import SearchResult from './components/SearchResult/SearchResult';
import RequestPage from './components/FriendRequestList/RequestPage';
import UpdateProfile from './components/UpdateProfile/UpdateProfile';
import LoadingSpinner from './components/utils/LoadingSpinner';

import UserContext from './context/UserContext';
import { URL } from './components/utils/Config';

export default function App() {
    const [user, setUser] = useState({
        id: '',
        token: '',
        username: '',
        isValid: false,
    });
    const [isDataFetched, setIsDataFetched] = useState(false);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('auth-token');
            axios
                .post(
                    `${URL}/users/isTokenValid`,
                    {},
                    {
                        headers: { 'x-auth-token': token },
                    }
                )
                .then((res) => {
                    if (res.data.isValid) {
                        setUser({
                            token: token,
                            id: res.data.id,
                            username: res.data.username,
                            isValid: res.data.isValid,
                        });
                    }
                    setIsDataFetched(true);
                })
                .catch((err) => {
                    setIsDataFetched(true);
                });
        };
        checkLoggedIn();
    }, []);
    return (
        <div className="App">
            <BrowserRouter>
                <UserContext.Provider value={{ user, setUser }}>
                    <Header />
                    <div className="AppBodyContainer">
                        {isDataFetched ? (
                            <Switch>
                                <Route exact path="/" component={Home} />
                                <Route exact path="/login" component={Login} />
                                <Route exact path="/register" component={Register} />
                                <Route exact path="/search" component={SearchResult} />
                                <Route exact path="/request" component={RequestPage} />
                                <Route exact path="/updateprofile" component={UpdateProfile} />
                                <Route exact path="/reset" component={ResetPassword} />
                                <Route exact path="/reset/:resetToken" component={NewPassword} />
                                <Route path="*" component={() => '404 Page not found'} />
                            </Switch>
                        ) : (
                            <div className="LoadingSpinnerDiv">
                                <LoadingSpinner />
                            </div>
                        )}
                    </div>
                </UserContext.Provider>
            </BrowserRouter>
        </div>
    );
}
