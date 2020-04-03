const Jwt = require('./jwt'); //引入jwt认证工具类

//不用认证的api地址
const noAuthUrls = [
    '/auth/login',
    '/auth/regist',
    '/auth/isRegist',
    '/auth/captcha',
    '/department/tree'
];
const auth = function (req, res, next) {
    if (!noAuthUrls.includes(req.url)) {
        let token = req.headers.authorization;
        let verifyToken = new Jwt(token).verifyToken();
        if (!verifyToken) { //如果验证token不通过
            res.json({
                status: 403,
                code: 0,
                msg: '无权限访问或登录过期,请重新登录'
            });
            return;
        } else { //如果通过token验证,则将验证信息写入req对象
            req.userid = verifyToken;
            req.query.userid = verifyToken;
            req.body.userid = verifyToken;
        }
    }
    next();
}

module.exports = auth;