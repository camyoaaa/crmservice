const CORS_HEAER = function (req, res, next) {
    /**跨域设置 */
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,socketuuid");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", " 3.2.1");
    next();
}


const API_HEADER = function (req, res, next) {
    res.header("Content-Type", "application/json;charset=utf-8");

    if (req.path === '/auth/login' || req.path === '/auth/regist') {
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,socketuuid,x-real-ip"); //允许后端获取请求头中x-real-ip
        req.path === '/auth/login' && res.header("Access-Control-Expose-Headers", "Authorization"); //使前端能获取到header中的Authorization
    }
    req.socketUuid = req.headers.socketuuid;
    next();
}

module.exports = {
    CORS_HEAER,
    API_HEADER
};