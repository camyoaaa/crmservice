global.SocketIO = {};


const nameSpaces = ['salesManager', 'seller', 'afterSalesManager']
module.exports = function (io) {
    nameSpaces.forEach(async (ns) => {
        global.SocketIO[ns] = await new Promise((resolve, reject) => {
            io.of(`/${ns}`).on('connection', function (socket) {
                console.log(`global.SocketIO[${ns}] connection`);
                socket.on('disconnect', (reason) => {
                    console.log(`global.SocketIO[${ns}] disconnect`, reason)
                })
                socket.on('disconnecting', (reason) => {
                    console.log(`global.SocketIO[${ns}] disconnecting`, reason)
                })
                resolve(socket)
            });
        });
    });
}