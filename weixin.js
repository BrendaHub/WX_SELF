'use strict'

var config = require('./config')
var Wechat = require('./wechat/wechat')

var wechatApi = new Wechat(config.wechat)

exports.reply = function* (next){
	var message = this.weixin

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
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.png')

			console.log('>>>>>> = ' + JSON.stringify(data));
			reply = {
				type:'image',
				mediaId:data.media_id
			}
			console.log(reply)
		}else if(content === '6'){
			var data = yield wechatApi.uploadMaterial('video', __dirname + '/6.mp4')

			reply = {
				type:'video',
				title:'回复视频内容99999',
				description:'打个篮球玩玩',
				mediaId:data.media_id
			}
			console.log(reply);
		}else if(content === '7'){
			//先上传一个素材，图片
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.png')

			reply ={
				type:'music',
				title:'播放音乐内容',
				description:'放松一下',
				musicUrl:'http://mpge.5nd.com/2015/2015-9-12/66325/1.mp3',
				thumbMediaId: data.media_id
			}

			console.log(reply);
		}else if(content === '8'){
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.png', {type:'image'})

			reply = {
				type:'image',
				mediaId:data.media_id
			}
			console.log(reply);
		}else if(content === '9'){
			var data = yield wechatApi.uploadMaterial('video', __dirname + '/6.mp4', {type:'video',description:'{"title":"Really a nice place", "introduction":"Never think is so easy! "}'})
			console.log(data);
			reply = {
				type:'video',
				title:'回复视频内容232',
				description:'打个篮球玩玩',
				mediaId:data.media_id
			}
			console.log(reply);
		}else if(content === '10'){
			//上传素材， 这个方法支持上传临时和永久二种， 区别就在第三个参数， 有表示永久 没有则是临时
			var picData = yield wechatApi.uploadMaterial('image', __dirname + '/2.png', {type:'image'})
			console.log('上传图文素材后的media_id  为= ' + JSON.stringify(picData));
			var media = {
				articles:[{
					title:'图片素材1',
					thumb_media_id: picData.media_id,
					author:'Brenda',
					digest:'摘要内容',
					show_cover_pic:1,
					content:'没有什么内容',
					content_source_url:'https://github.com'
				}]
			}
			//好来上传一个图文
			data = yield wechatApi.uploadMaterial('news', media, {})
			console.log('上传图文的media_id  为= ' + JSON.stringify(data));
			//把上传后的图片获取回来
			data = yield wechatApi.fetchMaterial(data.media_id, 'news' , {})
			console.log('获取上传后的图文信息  为= ' + JSON.stringify(data));


			//获取到图文后， 马上就可以回复

			var items  = data.news_item
			// console.log('>>items>> ' + items);

			var news = []

			items.forEach(function(item){
				news.push({
					title:item.title,
					decription:item.digest,
					picUrl:picData.url,
					url: item.url
				})
			})

			reply = news
		}else if(content === '11'){
			var counts = yield wechatApi.countMaterial()

			console.log(JSON.stringify(counts));

			// var list_image = yield wechatApi.batchGetMaterial({
			// 	type:'image',
			// 	offset:0,
			// 	count:10
			// })

			// var list_video = yield wechatApi.batchGetMaterial({
			// 	type:'video',
			// 	offset:0,
			// 	count:10
			// })

			// var list_voice = yield wechatApi.batchGetMaterial({
			// 	type:'voice',
			// 	offset:0,
			// 	count:10
			// })

			// var list_news = yield wechatApi.batchGetMaterial({
			// 	type:'news',
			// 	offset:0,
			// 	count:10
			// })
			//上面注释掉的写法，可以合并成下面的并发的写法
			var result = yield [
				wechatApi.batchGetMaterial({
					type:'image',
					offset:0,
					count:10
				}),wechatApi.batchGetMaterial({
					type:'voice',
					offset:0,
					count:10
				}),wechatApi.batchGetMaterial({
					type:'video',
					offset:0,
					count:10
				}),wechatApi.batchGetMaterial({
					type:'news',
					offset:0,
					count:10
				})
			]
			console.log(result );

			reply = result 
		}else if(content === '12'){
			var group = yield wechatApi.createGroup('wechat')

			console.log('分组名： ' + group);

			var groups = yield wechatApi.fetchGroups()

			console.log('分组列表：' + JSON.stringify(groups));

			var group_self = yield wechatApi.checkGroup(message.FromUserName) 

			console.log('查询我在的分组， ' + JSON.stringify(group_self));
		}else if(content === '13'){//获取用户接口测试
			//单个获取
			var user = yield wechatApi.fetchUsers(message.FromUserName,'en')
			//批量获取
			var openIds = [
				//国家地区语言版本，zh_CN 简体，zh_TW 繁体，en 英语，默认为zh-CN
				{openid: message.FromUserName,lang:'en'}
			]
			var userlist = yield wechatApi.fetchUsers(openIds)

			reply = JSON.stringify(userlist)
		}else if(content === '14'){
			var listUser = yield wechatApi.listUsers()

			if(listUser){
				reply = listUser.total
			}
			else{
				reply = '没有关注用户'
			}
		}else if(content === '15'){//测试群发接口
			var npmews = {
				media_id : 'xxxx'
			}
			var text = {
				'content':'针对关注用户的文本回复'
			}

			var msgData = yield wechatApi.sendByGroup('mpnews', mpnews, 100)

			console.log(msgData);

			reply = '回复成功了吗'
		}else if(content === '16'){//测试群发消息的预览接口

			var mpnews = {
				media_id:'adfasdfasdfadf'
			}

			// var text = {
			// 	'content':'预览文本效果'
			// }

			var msgData = yield wechatApi.previewMass('mpnews', mpnews, 'openid乡村基f')

			console.log(msgData);

			reply = '测试预览完成，是否成功了 。 '
		}else if(content === '17'){//测试，群发消息是否成功的查检接口
			var checkResult = yield wechatApi.checkMass('msgid')

			console.log(checkResult);

			reply = JSON.stringify(checkResult)
		}

	
		this.body = reply
	}else{

	}

	yield next 
}