import React from 'react';

function FriendBox({ friendList, setFriendList, receiver, changeReceiver }) {
    return friendList.map((friend, index) => {
        if (!friend.show) {
            return <React.Fragment key={index}></React.Fragment>;
        }

        let UnseenMessageCount = 'UnseenMessageCount';
        if (friend.unseenMessageCount == 0) UnseenMessageCount = 'UnseenMessageCount0';

        let SelectedFriendClass = '';
        if (friend.friendId === receiver) SelectedFriendClass = 'SelectedFriend';

        let TypingClass = '';
        if (friend.isTyping === true) TypingClass = 'Typing';

        return (
            <div
                onClick={() => {
                    let newFriendList = friendList;
                    newFriendList[index].unseenMessageCount = 0;
                    setFriendList([...newFriendList]);
                    changeReceiver(friend.friendId);
                }}
                className={`FriendBox ${SelectedFriendClass}`}
                key={index}
            >
                <div className="FriendBoxProfilePicDiv">
                    <img
                        className="FriendProfilePic"
                        alt="Profile Pic"
                        src={`data:${friend.profilePic.mimetype};base64,${friend.profilePic.data}`}
                    />
                </div>

                <div className="FriendBoxDetailsContainer">
                    <div className="NameAndCountDiv">
                        <div className="FriendBoxName">{friend.username}</div>
                        <div className={UnseenMessageCount}>{friend.unseenMessageCount}</div>
                    </div>
                    <div className={`FriendBoxLastMessage ${TypingClass}`}>
                        {friend.isTyping ? 'typing...' : friend.lastMessage}
                    </div>
                </div>
            </div>
        );
    });
}

export default FriendBox;
