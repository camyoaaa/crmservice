   const socketManager = require('../../socketManger');

   const ContextDefine = function (req, res, next) {

       res.isuccess = (data) => {
           res.json({
               status: 200,
               msg: '请求成功',
               data
           });
       }
       res.ierror = (error) => {
           res.json({
               status: 500,
               msg: '请求出错',
               data: null,
               error
           })
       }

       res.systemSocket = function (sid = req.socketUuid) {
           return socketManager.getSocket('system', sid);
       }
       res.userSocket = function (sid = req.userid) {
           console.log('sid--------------', sid);
           return socketManager.getSocket('user', sid);
       }
       res.getSocket = socketManager.getSocket.bind(socketManager);
       next();
   }

   module.exports = ContextDefine;