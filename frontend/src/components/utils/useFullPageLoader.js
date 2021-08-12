import { useState } from "react";
import FullPageLoader from "./FullPageLoader";

const useFullPageLoader = () => {
    const [loading, setLoading] = useState(false);

    return [
        loading ? <FullPageLoader /> : null,
        () => setLoading(true), //Show Loader
        () => setLoading(false) //Hide Loader
    ];
};

export default useFullPageLoader;