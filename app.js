'use strict'

var Koa = require('koa')
var path = require('path')
//引入自定义的wechat 签名的中间件
var wechat = require('./wechat/g')
var util = require('./libs/util')
var config = require('./config')
var reply = require('./wx/reply')
var Wechat = require('./wechat/wechat')
var crypto = require('crypto')
// var wechat_file = path.join(__dirname, './config/wechat.txt')
 

var app = new Koa()
//引入一个ejs 的html 的模板组件
var ejs = require('ejs')
//引入一个heredoc的模板组织组件
var heredoc = require('heredoc')
var _tpl = heredoc(function(){/*
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>JSSDK接口的测试场景</title>
	<meta name="viewport" content="initial-scale=1, maximum-scale=1,minimum-scale=1">
</head>
<body>
	<h1>点击标题，开始录音翻译</h1>
	<p id="title"></p>
	<div id="poster"></div>
	<script src="http://zeptojs.com/zepto-docs.min.js"></script>
	<script src="http://res.wx.qq.com/open/js/jweixin-1.0.0.js"></script>
	<script>
		wx.config({
		    debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
		    appId: 'wxf59a542ae67c818d', // 必填，公众号的唯一标识
		    timestamp: '<%= timestamp %>', // 必填，生成签名的时间戳
		    nonceStr: '<%= noncestr %>', // 必填，生成签名的随机串
		    signature: '<%= signature %>',// 必填，签名，见附录1
		    jsApiList: [
				'startRecord',
				'stopRecord',
				'onVoiceRecordEnd',
				'translateVoice'
		    ] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
		});

		wx.ready(function(){
			//用来检查某个接口是否可以调用
			wx.checkJsApi({
				    jsApiList: ['onVoiceRecordEnd'], // 需要检测的JS接口列表，所有JS接口列表见附录2,
				    success: function(res) {
				    	console.log(res)
				        // 以键值对的形式返回，可用的api值true，不可用为false
				        // 如：{"checkResult":{"chooseImage":true},"errMsg":"checkJsApi:ok"}
				    }
				});
			
		    // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
			//定义一个停止录音的操作变量
			var isRecording = false

		    $('h1').on('tap', function(){
		    	if(!isRecording){
		    		isRecording = true //标记录音开始
					wx.startRecord({
						//如果取消操作了
						cancel:function(){
							window.alert('你取消了录音操作。')
						}
					})
					return 
		    	}
				
				isRecording = false 
				wx.stopRecord({
				    success: function (res) {
				        var localId = res.localId
				        //录音结束后，就可以开始识别音频了
				        wx.translateVoice({
						   localId: localId, // 需要识别的音频的本地Id，由录音相关接口获得
						    isShowProgressTips: 1, // 默认为1，显示进度提示
						    success: function (res) {
						        alert(res.translateResult); // 语音识别的结果
						    }
						});
				    }
				})

		    })
		});

	</script>
</body>
</html>
*/})

//开始创建jssdk的有效票据
//第一步，生成一个随机数
var createNonce = function(){
	return Math.random().toString(36).substr(2,15)
}
//第二步， 生成一个时间截
var createTimestamp = function(){
	//表示是生成了一个十进制的时间截的数字
	return parseInt(new Date().getTime()/1000, 10) + ''
}

//实现具体的签名算法，方法如下所示：
/**
	即signature=sha1(string1)。 示例：
	noncestr=Wm3WZYTPz0wzccnW
	jsapi_ticket=sM4AOVdWfPE4DxkXGEs8VMCPGGVi4C3VM0P37wVUCFvkVAy_90u5h9nbSlYy3-Sl-HhTdfl2fzFy1AOcHKP7qg
	timestamp=1414587457
	url=http://mp.weixin.qq.com?params=value

	步骤1. 对所有待签名参数按照字段名的ASCII 码从小到大排序（字典序）后，使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串string1：
*/
var _sign = function(noncestr, ticket, timestamp, url){
	var params = [
		'noncestr=' + noncestr,
		'jsapi_ticket=' + ticket,
		'timestamp=' + timestamp,
		'url='+ url
	]
	//先字典排序 ，再用&拼接成串
	var str = params.sort().join('&')
	//sha1加密
	var shasum = crypto.createHash('sha1')
	shasum.update(str)
	return shasum.digest('hex')
}

//好了， jssdk签名所需要的参数都有了，可以开始实现jssdk的签名了
function sign(ticket, url ){
	var noncestr = createNonce()
	var timestamp = createTimestamp()
	var signature = _sign(noncestr, ticket, timestamp, url)

	return {
		noncestr: noncestr,
		timestamp: timestamp,
		signature: signature
	}
}

//添加一个模块， 模拟实现一个页面的请求
app.use(function *(next){
	if(this.url.indexOf('/movie') > -1){
		//在这个入口这里需要拿到一个url ,所以初始化一个wechatApi 对象
		var wechatApi = new Wechat(config.wechat) 
		//先拿到token 
		var token_data = yield wechatApi.fetchAccessToken()
		var access_token = token_data.access_token 
		//拿到access_token后， 就可以去拿ticket 票据
		var ticketData = yield wechatApi.fetchTicket(access_token)
		var ticket = ticketData.ticket 
		var url = this.href //当前操作的完整url 
		console.log('ticket=' + JSON.stringify(ticket));
		console.log('url = ' + JSON.stringify(url));
		var signData = sign(ticket, url)

		console.log('signData = ' + JSON.stringify(signData));
		//通过ejs整合heredoc的模板描述，进行数据值绑定
		this.body = ejs.render(_tpl, signData) 

		return next 
	}

	yield next 
})

app.use(wechat(config.wechat, reply.reply))
   
app.listen(1234)

console.log('Listening: 1234');