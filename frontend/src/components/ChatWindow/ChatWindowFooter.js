import React from 'react'
import fileIcon1 from '../../assets/fileIcon1.png';

function ChatWindowFooter({inputFile, handleSelectedFile, onInputChange, message, sendMessage}) {
    return (
        <div id='ChatWindowInputFieldContainer'>
            <div className='fileIconDiv' onClick={() => inputFile.current.click()}>
                <img src={fileIcon1} className='fileIcon' alt='file icon' />
                <input
                    type='file'
                    id='file'
                    ref={inputFile}
                    onChange={handleSelectedFile}
                    style={{ display: 'none' }}
                />
            </div>
            <form onSubmit={sendMessage} className='MessageForm'>
                <input
                    type='text'
                    name='message'
                    placeholder='Type a Message here...'
                    className='MessageInput'
                    value={message}
                    onChange={onInputChange}
                    autoComplete='off'
                />
                <button type='submit' className='SendButton'>
                    Send
                </button>
            </form>
        </div>
    )
}

export default ChatWindowFooter
