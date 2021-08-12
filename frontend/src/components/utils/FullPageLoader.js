import LoadingSpinnerGIF from '../../assets/loadingSpinner.gif';

function FullPageLoader() {
    return (
        <div className='fullPageLoaderContainer'>
            <img src={LoadingSpinnerGIF} alt='loading-spinner' className='fullPageLoader' />;
        </div>
    )   
}

export default FullPageLoader;
