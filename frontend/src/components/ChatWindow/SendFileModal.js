import React from 'react';
import Modal from 'react-modal';
import sendIcon from '../../assets/sendIcon.png';
import closeIcon from '../../assets/closeIcon.png';
import fileIcon2 from '../../assets/fileIcon2.png';

// whenever user will select some file to send. this component will show modal with file's detail and send button.

function SendFileModal({ isFilePreviewOpened, closeFilePreview, file, sendFile, loader }) {
    return (
        <Modal
            isOpen={isFilePreviewOpened}
            onRequestClose={closeFilePreview}
            style={{
                content: {
                    top: '50%',
                    left: '50%',
                    right: 'auto',
                    bottom: 'auto',
                    marginRight: '-50%',
                    transform: 'translate(-50%, -50%)',
                },
            }}
            ariaHideApp={false}
            contentLabel="File Preview"
        >
            <div className="FileModalContent">
                <div>
                    <img src={fileIcon2} width="40px" height="40px" alt="file icon" />
                </div>
                <div className="FileModalFileName">{file ? file.name : 'Undefined'}</div>
                <div onClick={sendFile} className="FileModalSendButton">
                    <img src={sendIcon} width="35px" height="35px" alt="send icon" />
                </div>
                <button onClick={closeFilePreview} className="FileModalCloseButton">
                    <img src={closeIcon} width="15px" height="15px" alt="close icon" />
                </button>
            </div>
            {loader}
        </Modal>
    );
}

export default SendFileModal;
