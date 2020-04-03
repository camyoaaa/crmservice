var express = require("express");
var router = express.Router();
var moment = require("moment");
const address = require("address");

// 引入解析包
var formidable = require("formidable");
var fs = require("fs");
let path = require("path");
var userModel = require("../models/user");

const Jwt = require("../midwares/auth/jwt");

const {
    StaffStatus
} = require('../config');

//剥离记录中敏感信息
const filterUserInfo = (record, req) => {
    const {
        password,
        transactionPassword,
        __v,
        _id,
        ...usreInfo
    } = record;
    usreInfo.userid = _id;
    usreInfo.lastLoginIP = usreInfo.lastLoginIP || getClientIP(req);
    usreInfo.lastLoginTime = usreInfo.lastLoginTime || moment().format("YYYY-MM-DD HH:mm:ss");
    usreInfo.hasTradeCode = !!transactionPassword;
    return usreInfo;
};

const getClientIP = req => {
    return req.headers["x-real-ip"] ? req.headers["x-real-ip"] : req.ip.replace(/::ffff:/, "");
};

/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

router.post("/regist", async function (req, res, next) {
    try {
        let registSuccess = await userModel.create(req.body);
        if (registSuccess) {
            res.json({
                status: 200,
                msg: "注册成功"
            });
        }
    } catch (error) {
        console.log(error);
    }
});

router.post("/login", async function (req, res, next) {
    const {
        account,
        password,
        rememberMe
    } = req.body;
    try {
        let condition = isNaN(Number(account)) ? {
            name: account,
            password
        } : {
            account,
            password
        };

        let loginResult = await userModel.findOneAndUpdate(condition, {
            rememberMe,
            status: StaffStatus.Working, //登录的时候设置员工为工作中
            lastLoginTime: Date.now(),
            lastLoginIP: getClientIP(req)
        });
        if (loginResult && loginResult.id) {
            let userid = loginResult._id.toString();
            let userToken = new Jwt(userid).generateToken(rememberMe ? 60 * 60 * 24 * 7 : undefined); //如果用户选择了记住账号密码,token有效期7天,否则1天
            res.header("Authorization", userToken);
            res.json({
                status: 200,
                msg: "登陆成功",
                user: {
                    ...filterUserInfo(loginResult._doc, req),
                    status: StaffStatus.Working
                }
            });
        } else {
            throw new Error("error");
        }
    } catch (error) {
        console.log(error);
        res.json({
            status: 500,
            msg: "登陆失败,请检查用户名及密码"
        });
    }
});

//用户登出
router.post("/logout", async function (req, res, next) {
    const {
        account
    } = req.body;
    try {
        let user = await userModel.findOneAndUpdate({
            account
        }, {
            status: StaffStatus.Offwork
        });
        if (user) {
            res.json({
                status: 200,
                msg: "注销成功",
                user: user._doc
            });
        } else {
            throw new Error("用户名或密码错误,请重新登录");
        }
    } catch (error) {
        res.json({
            status: 400,
            msg: error.message
        });
    }
});

router.post("/avatar", async function (req, res, next) {

    let {
        avatar
    } = await userModel.findOne({
        _id: req.userid
    });
    if (avatar) {
        let paths = avatar.split('/');
        let pngname = paths[paths.length - 1];

        if (pngname != 'avatar.png') { ////如果用户已经有头像了,且不是默认头像,则删除之前的头像图片
            fs.unlink(path.join(__dirname, `../public/images/avatar/${pngname}`), function () {
                console.log(`删除文件${pngname}成功`);
            });
        }
    }

    let form = new formidable.IncomingForm();
    // form.encoding = "utf-8"; // 编码
    // 保留扩展名
    form.keepExtensions = true;
    //文件存储路径 最后要注意加 '/' 否则会被存在public下
    form.uploadDir = path.join(__dirname, "../public/images/avatar/");
    let updateSucess = false;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return next(err);
        }
        let imgPath = files.file.path;
        let imgName = files.file.name;
        // 返回路径和文件名
        try {
            fs.rename(imgPath, `${imgPath}.png`, async function () {
                let paths = imgPath.split("\\");
                let publicpath = paths[paths.length - 1];

                let finalpath = `http://${address.ip()}:3000/images/avatar/${publicpath}.png`;
                let result = await userModel.updateOne({
                    _id: req.userid
                }, {
                    $set: {
                        avatar: finalpath
                    }
                });
                updateSucess = result.nModified == 1;
                res.json({
                    status: updateSucess ? 200 : 500,
                    data: updateSucess ? {
                        name: imgName,
                        path: finalpath
                    } : {}
                });
            });
        } catch (err) {}
    });
});

router.get("/info", async function (req, res, next) {
    try {
        let queryResult = await userModel.findOne({
            _id: req.userid
        });
        res.json({
            status: 200,
            user: filterUserInfo(queryResult._doc, req)
        });
    } catch (error) {
        res.json({
            status: 404,
            msg: "未查询到用户信息",
            info: null
        });
    }
});
router.put("/modinfo", async function (req, res, next) {
    try {
        let {
            userid,
            ...payload
        } = req.body

        if (payload.status) {
            payload.status = Number(payload.status)
        }
        if (payload.phone) {
            payload.phone = Number(payload.phone)
        }
        let queryResult = await userModel.updateOne({
            _id: userid
        }, {
            $set: payload
        });
        console.log(queryResult);
        res.json({
            status: 200,
            message: "更新成功"
        });
    } catch (error) {
        res.json({
            status: 404,
            msg: "更新失败"
        });
    }
});

module.exports = router;