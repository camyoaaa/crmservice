// 引入模块依赖
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
// 创建 token 类
class Jwt {
    constructor(data) {
        this.data = data;

    }

    //生成token
    generateToken(expireMinutes = 60 * 60 * 24) { //默认token有效期一天
        let data = this.data;
        let created = Math.floor(Date.now() / 1000);
        let cert = fs.readFileSync(path.join(__dirname, './pem/rsa_private_key.pem')); //私钥 可以自己生成
        let token = jwt.sign({
            data,
            exp: created + expireMinutes,
        }, cert, {
            algorithm: 'RS256'
        }); //默认'HS256'
        return token;
    }

    // 校验token
    verifyToken() {
        let token = this.data;
        let cert = fs.readFileSync(path.join(__dirname, './pem/rsa_public_key.pem')); //公钥 可以自己生成
        let res = null;
        try {
            let result = jwt.verify(token, cert, {
                algorithms: ['RS256']
            }) || {};
            let {
                exp = 0
            } = result, current = Math.floor(Date.now() / 1000);
            if (current <= exp) {
                res = result.data || {};
            }
        } catch (e) {
            res = null;
        }
        return res;
    }
}

module.exports = Jwt;