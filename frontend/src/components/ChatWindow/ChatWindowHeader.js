import React from 'react';
import returnIcon from '../../assets/returnIcon.png';

function ChatWindowHeader({ friend, windowWidth, setSelectFriend, changeReceiver }) {
    const breakpoint = 750;

    const returnButtonHandler = () => {
        changeReceiver('');
        setSelectFriend(-1);
    };

    return (
        <div id="ChatWindowHeader">
            {windowWidth <= breakpoint && (
                <div onClick={returnButtonHandler}>
                    <img src={returnIcon} alt="return button" height="45px" width="45px"></img>{' '}
                </div>
            )}
            <div id="ChatWindowHeaderPicDiv">
                <img
                    id="ChatWindowHeaderPic"
                    alt="Profile Pic"
                    src={`data:${friend.profilePic.mimetype};base64,${friend.profilePic.data}`}
                />
            </div>
            <div id="ChatWindowHeaderUsername">{friend.username}</div>
        </div>
    );
}

export default ChatWindowHeader;
