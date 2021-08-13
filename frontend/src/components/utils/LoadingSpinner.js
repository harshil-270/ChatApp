import React from 'react';
import LoadingSpinnerGIF from '../../assets/loadingSpinner2.gif';

function LoadingSpinner(props) {
    if (props.size === 'small')
        return <img src={LoadingSpinnerGIF} alt="loading-spinner" className="LoadingSpinnerImgSmall" />;
    else return <img src={LoadingSpinnerGIF} alt="loading-spinner" className="LoadingSpinnerImg" />;
}

export default LoadingSpinner;
