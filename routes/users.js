var express = require("express");
var router = express.Router();
const address = require("address");

// 引入解析包
var formidable = require("formidable");
var fs = require("fs");
let path = require("path");
var userModel = require("../models/user");

var permissionModel = require('../models/permission');
const Jwt = require("../midwares/auth/jwt");

const {
    staffStatusList
} = require('../config');


const {
    APP_HOST,
    APP_PORT
} = require('../systemConfig');

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
        // let condition = isNaN(Number(account)) ? {
        //     name: account,
        //     password
        // } : {
        //     account,
        //     password
        // };
        let condition = {
            account: Number(account),
            password
        }
        console.log(condition);

        let WorkingStatus = staffStatusList.find(s => s.name === '正在工作').id;
        let loginResult = await userModel.findOneAndUpdate(condition, {
            rememberMe,
            status: WorkingStatus, //登录的时候设置员工为工作中
            lastLoginTime: Date.now(),
            lastLoginIP: getClientIP(req)
        }).select('-__v');
        let {
            _id,
            ...userInfo
        } = loginResult._doc || {}
        if (userInfo.account) {
            let userid = userInfo.account;
            let userToken = new Jwt(userid).generateToken(rememberMe ? 60 * 60 * 24 * 7 : undefined); //如果用户选择了记住账号密码,token有效期7天,否则1天
            res.header("Authorization", userToken);

            // res.systemSocket().sendMessage({
            //     broadcast: true,
            //     socketBody: {
            //         message: '系统通知',
            //         description: `【${userInfo.name}】已上线`
            //     }
            // });

            res.json({
                status: 200,
                msg: "登陆成功",
                user: {
                    userid,
                    ...userInfo,
                    status: WorkingStatus
                }
            });
        } else {
            console.log();
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
        let OffworkingStatus = staffStatusList.find(s => s.name === '暂停业务').id;
        let logoutresult = await userModel.findOneAndUpdate({
            account
        }, {
            status: OffworkingStatus
        });
        let {
            _id,
            ...userInfo
        } = logoutresult._doc || {}
        if (_id) {
            // res.systemSocket().sendMessage({
            //     broadcast: true,
            //     socketBody: {
            //         message: '系统通知',
            //         description: `【${userInfo.name}】已下线`
            //     }
            // });
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

//上传用户头像
router.post("/avatar", async function (req, res, next) {

    let {
        avatar
    } = await userModel.findOne({
        account: req.userid
    });
    if (avatar) {
        let paths = avatar.split('/');
        let pngname = paths[paths.length - 1];

        if (pngname != 'avatar.png') { ////如果用户已经有头像了,且不是默认头像,则删除之前的头像图片
            //删除文件
            fs.unlink(path.join(__dirname, `../public/images/avatar/${pngname}`), function () {
                console.log(`删除文件${pngname}成功`);
            });
        }
    }

    let form = new formidable.IncomingForm();
    form.encoding = "utf-8"; // 编码
    // 保留扩展名
    form.keepExtensions = true;
    form.maxFieldsSize = 2 * 1024 * 1024; //文件大小
    //文件存储路径 最后要注意加 '/' 否则会被存在public下
    form.uploadDir = path.join(__dirname, "../public/images/avatar/");
    let updateSucess = false;
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return next(err);
        }
        let imgPath = files.file.path;
        console.log('imgPath', imgPath);

        let oldPath = files.file.path;
        let newPath = path.join(__dirname, `../public/images/avatar/${req.userid}_avatar.png`);

        let imgName = files.file.name;
        // 返回路径和文件名
        try {
            fs.rename(oldPath, newPath, async function () {
                let paths = newPath.split("\\");
                let publicpath = paths[paths.length - 1];
                let finalpath = `http://${APP_HOST}:${APP_PORT}/images/avatar/${publicpath}`;
                let result = await userModel.updateOne({
                    account: req.userid
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


//获取用户信息
router.get("/info", async function (req, res, next) {
    try {
        let queryResult = await userModel.findOne({
            account: req.userid
        }).select('-__v');
        let {
            _id,
            ...userInfo
        } = queryResult._doc || {}
        let userid = queryResult ? queryResult.account : '';
        res.json({
            status: 200,
            user: {
                userid,
                ...userInfo
            }
        });
    } catch (error) {
        res.json({
            status: 404,
            msg: "未查询到用户信息",
            info: null
        });
    }
});

//更新用户信息
router.put("/modinfo", async function (req, res, next) {
    try {
        let payload = req.body

        if (payload.status) {
            payload.status = Number(payload.status)
        }
        if (payload.phone) {
            payload.phone = Number(payload.phone)
        }
        let queryResult = await userModel.findOneAndUpdate({
            account: req.userid
        }, {
            $set: payload
        });

        let {
            status: prevStatus,
            name
        } = queryResult._doc || {}

        if (payload.status && payload.status !== prevStatus) {
            let WorkingStatus = staffStatusList.find(r => r.name === '正在工作').id;

            // res.systemSocket().sendMessage({
            //     broadcast: true,
            //     socketBody: {
            //         message: '系统通知',
            //         description: `【${name}】已${payload.status === WorkingStatus?'上':'下'}线`,
            //     }
            // });
        }
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