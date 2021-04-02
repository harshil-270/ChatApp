import React, { useContext } from 'react';
import UserContext from '../../context/UserContext';
import downloadIcon from '../../assets/downloadIcon.png';
import axios from 'axios';

import fileIcon2 from '../../assets/fileIcon2.png';
import { URL } from '../utils/Config';

function Message({ chat, index, count }) {
    const User = useContext(UserContext);
    const focusMessageId = index === count - 1 ? 'focusMessageId' : '';
    const MessageClass = chat.from === User.user.id ? 'RightMessage' : 'LeftMessage';
    const FileClass = chat.from === User.user.id ? 'FileRightMessage' : 'FileLeftMessage';
    const stylingForFirstMessage = index === 0 ? { marginTop: 'auto' } : {};

    const formatAMPM = (date) => {
        date = new Date(date);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        var strTime = hours + ':' + minutes + ampm;
        return strTime;
    };

    const downloadFile = async (e) => {
        // get the file from server.
        const token = localStorage.getItem('auth-token');
        const res = await axios.get(`${URL}/messages/downloadFile`, {
            headers: {
                'x-auth-token': token,
            },
            params: {
                id: chat.id,
            },
            responseType: 'blob',
        });
        // also get file information from server like file name and file type.
        const fileInfo = await axios.get(`${URL}/messages/getFileData`, {
            headers: {
                'x-auth-token': token,
            },
            params: {
                id: chat.id,
            },
        });
        const myFile = fileInfo.data.body.split('.');
        const fileExntesion = myFile[-1];
        const url = window.URL.createObjectURL(new Blob([res.data], { type: fileExntesion }));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileInfo.data.body;
        link.click();
    };

    // based on whether it is text message or file render it.
    if (chat.type === 'message') {
        return (
            <div className={`Message ${MessageClass}`} style={stylingForFirstMessage}>
                <div className='MessageContent' id={focusMessageId}>
                    {chat.body}
                </div>
                <div className='MessageTimePartDiv'>
                    <div className='TimeDiv'>{formatAMPM(chat.time)}</div>
                </div>
            </div>
        );
    }
    return (
        <div className={`FileContainer ${MessageClass} ${FileClass}`} style={stylingForFirstMessage}>
            <div>
                <img src={fileIcon2} width='40px' height='40px' alt='file icon' />
            </div>
            <div className='FileDetail' id={focusMessageId}>
                <div className='FileName'>{chat.body}</div>
                <div className='FileTimeDiv'>{formatAMPM(chat.time)}</div>
            </div>
            <div className='DownloadImgDiv' onClick={(e) => downloadFile(e, index)}>
                <img src={downloadIcon} width='40px' height='40px' alt='download icon' />
            </div>
        </div>
    );
}

export default Message;
