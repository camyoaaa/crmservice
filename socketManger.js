const messageModel = require('./models/message');

class SocketManager {

    constructor() {
        this.systemSocket = {};
        this.userSocket = {};
        this.noSocket = {
            sendMessage: this.noSendMessageFn
        }
    }

    addSocket(socket, type) { //添加一个socket
        let socketid = socket.handshake.query[type === 'system' ? 'uuid' : 'userid'];
        if (!socketid) return;
        socketid = Number(socketid);
        socket.on('disconnect', () => {
            socket.removeAllListeners(socket.eventNames); //移除事件监听
            socket = null; //指针清零
        });

        socket.sendMessage = this.sendMessage.bind(socket); //绑定发送消息的方法

        if (type === 'user') {
            socket.join(socket.handshake.query.role, () => {}); //根据用户角色分房间
        }

        delete this[`${type}Socket`][socketid];
        this[`${type}Socket`][socketid] = socket;
        console.log(Object.keys(this.userSocket));
    }
    getSocket(type, socketid) { //获取socket
        return this[`${type}Socket`][socketid] || this.noSocket
    }

    async sendMessage({
        broadcast = false,
        to = undefined,
        messageBody = undefined,
        socketBody = undefined

    }) {
        let context = this;
        if (to) {
            context = context.to(to);
        }
        if (broadcast) {
            context = context.broadcast
        }
        if (messageBody) {
            let result = await messageModel.create(messageBody);
            socketBody.messageBody = result || messageBody;
        }
        console.log('xxxxxxxxxxxxxxx', socketBody);
        context.emit('message', socketBody)
    }

    noSendMessageFn() {
        console.log('用户未连接socket');
    }

}

module.exports = new SocketManager();