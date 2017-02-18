'use strict'

var Koa = require('koa')
var path = require('path')
//引入自定义的wechat 签名的中间件
var wechat = require('./wechat/g')
var util = require('./libs/util')
var config = require('./config')
var reply = require('./wx/reply')
// var wechat_file = path.join(__dirname, './config/wechat.txt')
 

var app = new Koa()

app.use(wechat(config.wechat, reply.reply))
   
app.listen(1234)

console.log('Listening: 1234');