import React from 'react';
import Message from './Message';

function ChatWindowMessages({ chats, selectedFriend, seenMessageCount }) {
    return (
        <div id='AllChats'>
            {chats[selectedFriend].chat.map((chat, index) => {
                return <Message key={index} chat={chat} count={seenMessageCount[selectedFriend].count} index={index} />;
            })}
        </div>
    );
}

export default ChatWindowMessages;
