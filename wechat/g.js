'use strict'

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var util = require('./util')

module.exports = function(opts, handler){
	var wechat = new Wechat(opts)
	return function* (next){
		var that = this
		//通过 this.query 就可以拿到 微信传过来的签名参数
		console.log(this.query);
		//自己配置的token
		var token = opts.token 
		//拿到传递过来的signatrue
		var signature = this.query.signature 
		//拿到传递过来的随机参数
		var nonce = this.query.nonce 
		var timestamp = this.query.timestamp 
		var echostr = this.query.echostr 

		//然后做字典排序 
		var str = [token, timestamp, nonce].sort().join('')
		//加密码
		var sha = sha1(str)
		//判断请求的方法是Get 还是 post 
		if(this.method === 'GET'){
			
			//判断生成的签名与传递过来的签名的正确性
			console.log('sha1 = ' + sha);
			if(sha === signature){
				this.body = echostr + ''
			}else{
				this.body = 'Wrong'
			}
		} else if(this.method === 'POST'){
			//也判断一下签名的合法性
			if(sha !== signature){
				this.body = 'Wrong'
				return false 
			}
			//下面我就可以拿到微信返回过来的xml 参数 ， 通过raw-body模块进行解析
			var data = yield getRawBody(this.req, {
				length:this.length,
				limit:'1mb',
				encoding:this.charset
			})
			console.log(data.toString());

			var content = yield util.parseXMLAsync(data)

			console.log(content);
			//接下来还需要把content进一步格式化
			var message = util.formatMessage(content.xml)

			console.log(message);

			//进行微信接口事件的判断
			//是个event 操作事件
			// if(message.MsgType === 'event'){
			// 	//是event事件里，关注动作
			// 	if(message.Event === 'subscribe'){
			// 		var now = new Date().getTime()

			// 		that.status = 200
			// 		that.type = 'application/xml'
			// 		// var reply = '<xml>' + 
			// 		// 			'<ToUserName><![CDATA['+ message.FromUserName +']]></ToUserName>' + 
			// 		// 			'<FromUserName><![CDATA['+ message.ToUserName +']]></FromUserName>' + 
			// 		// 			'<CreateTime>'+ now +'</CreateTime>' + 
			// 		// 			'<MsgType><![CDATA[text]]></MsgType>' + 
			// 		// 			'<Content><![CDATA[你好]]></Content>' + 
			// 		// 			'</xml>'
			// 		var reply = xml
			// 		console.log(reply);
			// 		that.body = reply

			// 		return 
			// 	}
			// }
			//这里拿到了微信返过来的数据， 并且转换和格式化好了，接下来就可以反接下来的回复逻辑交给下一下业务处理流程
			//把得到的message 挂到当前对象上
			this.weixin = message 
			//这里直接引用了yield的异步处一逻辑
			yield handler.call(this, next)
			//这样的调用wechat的reply方法， 是会改变上下文
			wechat.reply.call(this)

		}
	}
}

