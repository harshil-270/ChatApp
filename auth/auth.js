const jwt = require('jsonwebtoken') ;

const auth = (req, res, next) => {
    try {
        const token = req.header('x-auth-token') ;
        
        if(!token) {
            return res.status(401).json({err: 'Not Auth token. Access denied'}) ;
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET) ;
        if(!verified) {
            return res.status(401).json({err: 'Token is not valid. access denied'}) ;
        }
        req.user = verified.id;
        next();
    } catch (error) {
        return res.status(401).json({err: 'Token invalid'});
    }
}

module.exports = auth ;