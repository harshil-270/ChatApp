import React from 'react';
import fileIcon from '../../assets/fileIcon4.png';
import sendMessageIcon from '../../assets/sendMessageIcon1.png';

function ChatWindowFooter({ inputFile, handleSelectedFile, onInputChange, message, sendMessage }) {
    return (
        <div id="ChatWindowInputFieldContainer">
            <div className="fileIconDiv" onClick={() => inputFile.current.click()}>
                <img src={fileIcon} className="fileIcon" alt="file icon" />
                <input
                    type="file"
                    id="file"
                    ref={inputFile}
                    onChange={handleSelectedFile}
                    style={{ display: 'none' }}
                />
            </div>
            <form className="MessageForm" onSubmit={sendMessage} >
                <input
                    type="text"
                    name="message"
                    placeholder="Type a Message here..."
                    className="MessageInput"
                    value={message}
                    onChange={onInputChange}
                    autoComplete="off"
                />
                <div className="SendButton" onClick={sendMessage}>
                    <img src={sendMessageIcon}></img>
                </div>
            </form>
        </div>
    );
}

export default ChatWindowFooter;
