'use strict'

var config = require('./config')
var Wechat = require('./wechat/wechat')

var wechatApi = new Wechat(config.wechat)

exports.reply = function* (next){
	var message = this.weixin
	console.log(message);

	//微信事件操作
	if(message.MsgType === 'event'){
		//关注操作
		if(message.Event === 'subscribe'){
			//关注也有区分来源， 有扫码来的， 也有搜索来的
			if(message.EventKey){
				console.info('扫描二维码进来：' + message.EventKey + ' ' + message.ticket);
			}
			this.body = '哈哈， 你订阅了这个号\r\n 消息ID: ' + message.MsgId 


		}else if(message.Event === 'unsubscribe'){//取消关注
			console.log('取消关注');
		}else if(message.Event === 'LOCATION'){
			this.body = '您上报的位置是:' + message.Latitude + '/' + message.Longitude + '-' + message.Precision

		}else if(message.Event === 'CLICK'){
			this.body = '您点击了菜单 ' + message.EventKey

		}else if(message.Event === 'SCAN'){//扫描
			console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket) ;
			this.body = '看到你扫了一下哦'

		}else if(message.Event === 'VIEW'){
			this.body = '您点击了菜单中的链接： ' + message.EventKey

		}
		
	}else if(message.MsgType === 'text'){
		var content = message.Content 
		var reply = '额， 你说的 ' + message.Content + ' 太复杂了 '
		if(content === '1'){
			reply = '天下第一吃大米'
		}else if (content === '2'){
			reply = '天下第二吃豆腐'
		}else if (content === '3'){
			reply = '天下第三吃仙丹'
		}else if(content === '4'){
			//回复一个图文
			reply = [{
				title: '技术来改变世界',
				description:'这只是个描述而以',
				picUrl : 'http://pic6.huitu.com/res/20130116/84481_20130116142820494200_1.jpg',
				url:'https://github.com'
			},{
				title: '学习node.js',
				description:'只是很棒',
				picUrl : 'http://pic55.nipic.com/file/20141208/19462408_171130083000_2.jpg',
				url:'https://nodejs.org'
			}]
		}else if(content === '5'){
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg')

			reply = {
				type:'image',
				mediaId:data.media_id
			}
			console.log(reply);
		}else if(content === '6'){
			var data = yield wechatApi.uploadMaterial('video', __dirname + '/6.mp4')

			reply = {
				type:'video',
				title:'回复视频内容',
				description:'打个篮球玩玩',
				mediaId:data.media_id
			}
			console.log(reply);
		}else if(content === '7'){
			//先上传一个素材，图片
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg')

			reply ={
				type:'music',
				title:'播放音乐内容',
				description:'放松一下',
				musicUrl:'http://mpge.5nd.com/2015/2015-9-12/66325/1.mp3',
				thumbMediaId: data.media_id
			}

			console.log(reply);
		}
		this.body = reply
	}else{

	}

	yield next 
}