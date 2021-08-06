import React from 'react';
import Message from './Message';

function ChatWindowMessages({ chats, selectedFriend, unseenMessageCount }) {
    return (
        <div id="AllChats">
            {chats[selectedFriend].chat.map((chat, index) => {
                return (
                    <Message
                        key={index}
                        chat={chat}
                        chatLength={chats[selectedFriend].chat.length}
                        count={unseenMessageCount[selectedFriend].count}
                        index={index}
                    />
                );
            })}
        </div>
    );
}

export default ChatWindowMessages;
