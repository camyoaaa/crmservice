const mongoose = require("mongoose");
const DB_URL = "mongodb://127.0.0.1:27017/kddcrm";
const autoIncrement = require("mongoose-auto-increment");

//mongoose配置
const MongooseConfig = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
};

module.exports = new Promise((resolve, reject) => {
    try {
        mongoose.connect(DB_URL, MongooseConfig);
        let Connection = mongoose.connection;
        // mongoose.set('useFindAndModify', false);
        Connection.on("connected", function() {
            console.log("********************** mongoose connect success **********************");
            resolve();
        });

        //使用自增插件
        autoIncrement.initialize(Connection);
    } catch (error) {
        reject(error);
    }
});
