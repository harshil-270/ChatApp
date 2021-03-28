import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import searchIcon from '../../../assets/searchIcon.png';

function SearchBar() {
    const [searchQuery, setSearchQuery] = useState('');

    const history = useHistory();

    const handleKeyPress = (e) => {
        // if user presses enter key then search user.
        if (e.charCode === 13) {
            e.preventDefault();
            history.push(`/search?searchQuery=${searchQuery}`);
        }
    };
    return (
        <div>
            <form className='SearchForm'>
                <input
                    type='text'
                    onKeyPress={(e) => handleKeyPress(e)}
                    placeholder='Search User'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='SearchBar'
                />
                <Link to={`/search?searchQuery=${searchQuery}`}>
                    <img src={searchIcon} className='SearchIcon' alt='search' />
                </Link>
            </form>
        </div>
    );
}

export default SearchBar;
