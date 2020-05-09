var createError = require("http-errors");
var express = require("express");
var path = require("path");
const bodyParser = require("body-parser"); //请求体解析器
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var DBStart = require("./models"); //启动数据库
const MySchedule = require("./schedule/updateStaffAlloc"); //启动定时任务
DBStart.then(() => {
  MySchedule();
});

var {
  API_HEADER,
  CORS_HEAER
} = require("./midwares/header"); //响应头统一控制
var authMiddleware = require("./midwares/auth"); //token认证
var contextDefineMiddleware = require("./midwares/context"); //响应头统一控制

var indexRouter = require("./routes/index");
var systemRouter = require("./routes/system");
var usersRouter = require("./routes/users");
var staffRouter = require("./routes/staffmanage");
var mealRouter = require("./routes/meal");
var businessRouter = require("./routes/business");
var customfromRouter = require("./routes/customfrom");
var customstatusRouter = require("./routes/customstatus");

var departmentRouter = require("./routes/department");
var postRouter = require("./routes/post");
var menuRouter = require("./routes/menu");
var orderRouter = require("./routes/order");
var contractRouter = require("./routes/contract");
var customRouter = require("./routes/custom");
var followRecordRouter = require("./routes/followrecord");
var aftersaleRouter = require("./routes/aftersale");
var payreceiptRouter = require("./routes/payreceipt");
var dashboardRouter = require("./routes/dashboard");
var messageRouter = require("./routes/message");

var app = express();



// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);
app.use(cookieParser());
app.use(bodyParser.json()); //使用请求体解析中间件
app.use(CORS_HEAER); //响应header控制
app.use(express.static(path.join(__dirname, "public")));

app.use(authMiddleware); //启用token认证
//使用中间件
app.use(API_HEADER); //响应header控制
app.use(contextDefineMiddleware); //添加上下文
app.use("/", indexRouter);
app.use("/system", systemRouter);
app.use("/auth", usersRouter);
app.use("/staff", staffRouter);
app.use("/meal", mealRouter);
app.use("/business", businessRouter);
app.use("/department", departmentRouter);
app.use("/post", postRouter);
app.use("/menu", menuRouter);
app.use("/customfrom", customfromRouter);
app.use("/customstatus", customstatusRouter);
app.use("/order", orderRouter);
app.use("/contract", contractRouter);
app.use("/followRecord", followRecordRouter);
app.use("/aftersale", aftersaleRouter);

app.use("/custom", customRouter);
app.use("/payreceipt", payreceiptRouter);
app.use("/dashboard", dashboardRouter);
app.use("/message", messageRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // next(createError(404));
  // res.render('./public/index.html', function (err, html) {
  //   res.send(html)
  // })
  // res.sendfile('./public/index.html');
  res.redirect(`/`);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;