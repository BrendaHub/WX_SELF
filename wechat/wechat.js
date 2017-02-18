'use strict'

var fs = require('fs')
var Promise = require('bluebird')
var _ = require('lodash')
var request = Promise.promisify(require('request'))
var util = require('./util')
//获取票据接口的配置项目
var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var mpPrefix = 'https://mp.weixin.qq.com/cgi-bin'
//语意智能接口玩玩
var semanticUrl = 'https://api.weixin.qq.com/semantic/semproxy/search'
var api = {
	semantUrl:semanticUrl,
	accessToken: prefix + 'token?grant_type=client_credential',
	temporary:{
		upload: prefix + 'media/upload',
		fetch:prefix + 'media/get'
	},
	permanent:{
		upload:prefix + 'material/add_material',
		fetch:prefix + 'material/get_material',
		uploadNews: prefix + 'material/add_news',
		uploadNewsPic: prefix + 'media/uploadimg',
		del:prefix + 'material/del_material',
		update: prefix + 'material/update_news',
		count: prefix + 'material/get_materialcount',
		batch: prefix + 'material/batchget_material'
	},
	group:{
		create: prefix + 'groups/create',
		fetch:prefix + 'groups/get',
		check: prefix + 'groups/getid',
		update: prefix + 'groups/update',
		move: prefix + 'groups/members/update',
		batchupdate: prefix + 'groups/members/batchupdate',
		del:prefix + 'groups/delete',
	},
	user:{
		remark:prefix + 'user/info/updateremark',
		fetch: prefix + 'user/info',
		batchFetch: prefix + 'user/info/batchget',
		list: prefix + 'user/get'
	},
	mass:{
		sendByGroup: prefix + 'message/mass/sendall',
		openId: prefix + 'message/mass/send',
		del: prefix + 'message/mass/delete',
		preview: prefix + 'message/mass/preview',
		check: prefix + 'message/mass/get'
	},
	menu:{
		create: prefix + 'menu/create',
		get: prefix +'menu/get',
		del: prefix + 'menu/delete',
		current: prefix + 'get_current_selfmenu_info'
	},
	qrcode:{
		create: prefix + 'qrcode/create',
		showqrcode: mpPrefix + 'showqrcode'
	},
	shortUrl:{
		create: prefix + 'shorturl'
	},
	ticket:{//微信jssdk获取票据的接口地址配置
		get: prefix + 'ticket/getticket'
	}
}

//添加票据处理方法
function Wechat(opts){
	var that = this
	this.appID = opts.appID
	this.appSecret = opts.appSecret
	this.getAccessToken = opts.getAccessToken
	this.saveAccessToken = opts.saveAccessToken
	this.getTicket = opts.getTicket 
	this.saveTicket = opts.saveTicket
	this.fetchAccessToken()
}

//Wechat 对象的原型链上添加一个判断access_token 的方法
Wechat.prototype.isValidAccessToken = function(data){
	if( !data || !data.access_token || !data.expires_in){
		return false;
	} 

	var access_token = data.access_token
	var expires_in = data.expires_in
	var now = (new Date().getTime())

	if(now < expires_in){
		return true;
	}else{
		return false
	}
}

//Wechat对象的原型链上添加一个更新access_token的方法
Wechat.prototype.updateAccessToken = function(){
	var appID = this.appID
	var appSecret = this.appSecret
	var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret 
	//console.log('utl = ' + JSON.stringify(url));
	return new Promise(function(resolve, reject){
		request({url: url, json:true}).then(function(response){
			// var data = response[1]
			var data = response.body
			var now = (new Date().getTime())
			var expires_in = now + (data.expires_in - 20) * 1000 

			data.expires_in = expires_in 

			resolve(data)
		})
	})
}

//获取调用接口的access_token 方法,会在文件中缓存
Wechat.prototype.fetchAccessToken = function(){
	var that = this 
	if( this.access_token && this.expires_in ){//判断是否存在相应的属性值
		if(this.isValidAccessToken(this)){//是否有效
			return Promise.resolve(this)//有效直接返回，当前对象
		}
	}
	//这里采用了Promise的框架，.then() 实现异步的逻辑
	//即获取到票据后， 需要做什么事情.then（）里面进行扫行
	return this.getAccessToken().then(function(data){
		try{
			//直接使用accessToken
			data = JSON.parse(data)
		}catch(e){
			//出现异常后， 需要更新票据
			return that.updateAccessToken()
		}
		//如果有效
		if(that.isValidAccessToken(data)){
			//通过Promise.resovle进行专递票据
			return Promise.resolve(data)
		}
		else{
			//如果失效，则需要更新票据
			return that.updateAccessToken()
		}
	}).then(function(data){

		//不需要存在that 对象上
		// that.access_token = data.access_token
		// that.expires_in = data.expires_in

		that.saveAccessToken(data)

		return Promise.resolve(data)
	})
}

//获取调用jssdk 接口所需的ticket的方法, 需要根据access_token开获到 
//jssdk的ticket 也是需要按照access_token一样的处理方法缓存起来， 每资申请到的一个有效的
//ticket有效期为7200秒 
Wechat.prototype.fetchTicket = function(access_token){
	var that = this 
	return this.getTicket().then(function(data){
		try{
			data = JSON.parse(data)
		}catch(e){
			return that.updateTicket(access_token)
		}

		if(that.isValidTicket(data)){
			return Promise.resolve(data)
		}else{
			return that.updateTicket(access_token)
		}
	}).then(function(data){
		that.saveTicket(data)
		return Promise.resolve(data)
	})
}
//更新ticket 方法
Wechat.prototype.updateTicket = function(access_token){
	//access_token=ACCESS_TOKEN&type=jsapi
	var url = api.ticket.get + '&access_token=' + access_token + '&type=jsapi'
	console.log('utl = ' + JSON.stringify(url));
	return new Promise(function(resolve, reject){
		request({url: url, json:true}).then(function(response){
			console.log('ticket = ' + JSON.stringify(response));
			// var data = response[1]
			var data = response.body
			var now = (new Date().getTime())
			var expires_in = now + (data.expires_in - 20) * 1000 

			data.expires_in = expires_in 

			resolve(data)
		})
	})
}
//判断ticket 是否有效
Wechat.prototype.isValidTicket = function(data){
	if( !data || !data.ticket || !data.expires_in){
		return false;
	} 

	var ticket = data.ticket
	var expires_in = data.expires_in
	var now = (new Date().getTime())

	if(ticket && now < expires_in){
		return true;
	}else{
		return false
	}
}


//添加一个上传素材的方法
Wechat.prototype.uploadMaterial = function(type, material, permanent){
	var that = this
	//定义一个from表单
	var form = {}
	var uploadUrl = api.temporary.upload

	if(permanent){
		uploadUrl = api.permanent.upload

		_.extend(form, permanent)
	}

	if(type === 'pic'){
		uploadUrl = api.permanent.uploadNewsPic
	}
	if(type === 'news'){
		uploadUrl = api.permanent.uploadNews 

		form = material 
	}else{
		form.media = fs.createReadStream(material)
	}
	
	return new Promise(function(resolve, reject){
		console.log('>>' + JSON.stringify(that.fetchAccessToken()));
		that
			.fetchAccessToken()
			.then(function(data){
				var url = uploadUrl + '?access_token=' + data.access_token
				//如果不是永久素材
				if(!permanent){
					url += '&type=' + type
				}else{
					form.access_token = data.access_token
				}

				var options = {
					method:'POST',
					url : url,
					json: true
				}
				if(type === 'news'){
					options.body = form
				}else{
					options.formData = form 
				}

				//再通过request进行发送请求
				//console.log('<<>>>> ' + JSON.stringify(options));
				request(options)
					.then(function(response){
						// var _data = response[1]
						var _data = response.body
						if(_data){
							resolve(_data)
						}else{
							throw new Error('Upload metairal fails!')
						}
					}).catch(function(err){
						reject(err)
					})
			})
	})

}
//添加了获取永久素材的方法
Wechat.prototype.fetchMaterial = function(mediaId, type, permanent){
	var that = this 
	var form = {}
	var fetchUrl = api.temporary.fetch 

	if(permanent){
		fetchUrl = api.permanent.fetch 
	}

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = fetchUrl + '?access_token=' + data.access_token 
			var form = {}
			var options = {method:'POST',url:url, json:true}
			if(permanent){//如果是永久的
				options.media_id = mediaId
				options.access_token = data.access_token
				options.body = form 
			}else{
				if(type === 'video'){
					url = url + replace('https://', 'http://')
				}
				url += '&media_id=' + mediaId 
			}

					//console.log('...options.>>>' + JSON.stringify(options));
			if(type === 'news' || type === 'video'){
				request(options)
				.then(function(response){
					//console.log('....>>>' + JSON.stringify(response));
					var _data = response.body

					if(_data){
						resolve(_data)
					}else{
						throw new Error('fetch material fails')
					}
				})
			}else{
				resolve(url)
			}
			// resolve(url)
		})
	})
}

//添加了删除永久素材Id的方法
Wechat.prototype.deleteMaterial = function(mediaId){
	var that = this 
	var form = {
		media_id: mediaId 
	}

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.permanent.del + '?access_token=' + data.access_token 
			+ '&media_id=' + mediaId 

			request({method:'POST',url:url, body:form,json:true})
			.then(function(response){
				var _data = response[1]

				if(_data){
					resolve(_data)
				}else{
					throw new Error('delMaterial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}
//更新永久素材
Wechat.prototype.updateMaterial = function(mediaId, news){
	var that = this 
	var form = {
		media_id: mediaId 
	}

	_.extend(form , news)

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.permanent.update + '?access_token=' + data.access_token 
			+ '&media_id=' + mediaId 

			request({method:'POST',url:url, body:form,json:true})
			.then(function(response){
				var _data = response[1]

				if(_data){
					resolve(_data)
				}else{
					throw new Error('delMaterial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}
//获取永久素材数量
Wechat.prototype.countMaterial = function(){
	var that = this 
	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.permanent.count + '?access_token=' + data.access_token 

			request({method:'GET',url:url, json:true})
			.then(function(response){
				var _data = response[1]

				if(_data){
					resolve(_data)
				}else{
					throw new Error('delMaterial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}
//批量来获取素材
Wechat.prototype.batchGetMaterial = function(options){
	var that = this 

	options.type = options.type || 'image'
	options.offset = options.offset || 0
	options.count = options.count || 1 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.permanent.batch + '?access_token=' + data.access_token 

			request({method:'POST',url:url, body:options, json:true})
			.then(function(response){
				var _data = response[1]

				if(_data){
					resolve(_data)
				}else{
					throw new Error('delMaterial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//创建分组
Wechat.prototype.createGroup = function(name){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.group.create + '?access_token=' + data.access_token 

			var options = {
				group:{
					name:name
				}
			}

			request({method:'POST',url:url,json:true,body:options})
			.then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('create group mateial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//获取所有分组信息
Wechat.prototype.fetchGroups = function(){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.group.fetch + '?access_token=' + data.access_token 

			request({method:'GET',url:url,json:true})
			.then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('get all group mateial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//查询用户是否在指定的分组
Wechat.prototype.checkGroup = function(openId){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.group.check + '?access_token=' + data.access_token 
			var options = {
				openid:openId
			}
			request({method:'POST',body:options, url:url,json:true})
			.then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('checkGroup  mateial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//修改分组名称
Wechat.prototype.updateGroup = function(groupId, newName){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.group.update + '?access_token=' + data.access_token 
			var options = {
				group:{
					id:groupId,
					name:newName
				}
			}
			request({method:'POST',body:options, url:url,json:true})
			.then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('updateGroup  mateial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//移动分组 and 批量移动分组
Wechat.prototype.moveGroup = function(openId, targetGroupId){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = ''
			var options = {
				to_groupid:targetGroupId
			}
			if(_.isArray(openId)){//如果是个数组
				url = api.group.batchupdate + '?access_token=' + data.access_token
				options.openid_list = openId
			}else{
				url = api.group.move + '?access_token=' + data.access_token
				options.openid = openId
			}
			request({method:'POST',body:options, url:url,json:true})
			.then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('moveGroup  mateial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//批删分组
Wechat.prototype.deleteGroup = function(groupid){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.group.del + '?access_token=' + data.access_token 

			var options = {
				group:{
					id:groupid
				}
			}

			request({method:'POST',json:true, url:url, body: options})
			.then(function(response){
				var _data = response.body

				if(_data){
					resolve(_data)
				}else{
					throw new Error('delgroup mateial fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//备注用户名称
Wechat.prototype.remarkUser = function(openId, remark){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.user.remark + '?access_token=' + data.access_token 

			var options = {
				openid:openId,
				remark:remark
			}

			request({method:'POST',json:true, url:url, body: options})
			.then(function(response){
				var _data = response.body

				if(_data){
					resolve(_data)
				}else{
					throw new Error('remarkUser info  fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//批量获取关注用户信息, 添加了支持获取单个用户的功能
Wechat.prototype.fetchUsers = function(openIds, lang ){
	var that = this 

	//js 给一个参数设置默认值
	lang = lang || 'zh_CN'

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){

			var url = ''
			var options = {
				json:true
			}
			//如果是数组
			if(_.isArray(openIds)){
				options.url = api.user.batchFetch + '?access_token=' + data.access_token 
				options.body = {
					user_list:openIds
				}
				options.method = 'POST'

			}else{
				options.url = api.user.fetch + '?access_token=' + data.access_token + 
				'&openid=' + openIds + '&lang=' + lang 
				options.method = 'GET'
			}

			request(options)
			.then(function(response){
				var _data = response.body

				if(_data){
					resolve(_data)
				}else{
					throw new Error('batchFetch Users fails ')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//获取用户list 
Wechat.prototype.listUsers = function(openId){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken()
		.then(function(data){
			var url = api.user.list + '?access_token=' + data.access_token 

			if(openId){
				url += '&next_openid=' +  openId
			}

			request({method:'GET',json:true, url:url})
			.then(function(response){
				var _data = response.body

				if(_data){
					resolve(_data)
				}else{
					throw new Error('listUsers info  fails')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//高级群发接口, 说明：
// type ,表示要群发的消息类型
// message ，表示群发的消息内容
// groupid，表示群发的目录群组
Wechat.prototype.sendByGroup = function(type, messge, groupid){
	var that = this 

	//定义一个消息字面对象
	var msg = {
		filter:{},
		msgType: type
	}
	msg[type] = message
	// msg.type = message
	//如果分组信息为空，表示给所有的群发送消息
	if(!groupid){
		msg.filter.is_to_all = true
	}else{
		msg.filter = {
			is_to_all:false,
			group_id: groupid
		}
	}

	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.mass.sendByGroup + '?access_token=' + data.access_token 

			requedt({method:'POST',url:url, json:true, body: msg}).then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('send all group info fail')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//针对某个单独的openId 调用群发接口，这个方法只能是认证后的服务号可以调用
Wechat.prototype.sendByOpenId = function(type, message, openIds){
	var that = this 

	//定义一个消息字面对象
	var msg = {
		msgType: type,
		touser:openIds
	}
	msg[type] = message
	// msg.type = message
	//如果分组信息为空，表示给所有的群发送消息

	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.mass.openId + '?access_token=' + data.access_token 

			requedt({method:'POST',url:url, json:true, body: msg}).then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('send by OpenId  info fail')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//删除群发
/*
	1、只有已经发送成功的消息才能删除
    2、删除消息是将消息的图文详情页失效，已经收到的用户，还是能在其本地看到消息卡片。
	3、删除群发消息只能删除图文消息和视频消息，其他类型的消息一经发送，无法删除。
	4、如果多次群发发送的是一个图文消息，那么删除其中一次群发，就会删除掉这个图文消息也，导致所有群发都失效
*/
Wechat.prototype.deleteMass = function(msgId){
	//将当前上下文对象 引用到一个局部变量，方便操作
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.mass.del + '?access_token=' + data.access_token

			var form = {
				msg_id : msgId
			}

			request({method:'POST',url:url, json:true, body:form }).then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('delete Mass npmnews fails ')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//群发消息预览接口实现
Wechat.prototype.previewMass = function(type, message, toUserOpenId){
	var that = this 
	var msg = {
		msgtype: type,
		touser: toUserOpenId
	}

	msg[type] = message

	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){

			var url = api.mass.preview + '?access_token=' + data.access_token

			request({method:'POST',url:url, json:true,body:msg}).then(function(response){
				var _data = response.body
				if(_data)
				{
					resolve(_data)
				}else{
					throw new Error('preview mass message fails ')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//检查群发消息的是否发送成功
Wechat.prototype.checkMass = function(msgId){
	var that = this 
	

	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){

			var url = api.mass.check + '?access_token=' + data.access_token
			var form = {
				msg_id : msgId
			}
			request({method:'POST',url:url, json:true,body:form}).then(function(response){
				var _data = response.body
				if(_data)
				{
					resolve(_data)
				}else{
					throw new Error('check  mass message fails ')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//实现微信公众号创建菜单的功能
Wechat.prototype.createMenu = function(menuJson){
	var that = this 
	

	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){

			var url = api.menu.create + '?access_token=' + data.access_token
			
			request({method:'POST',url:url, json:true,body:menuJson}).then(function(response){
				var _data = response.body
				if(_data)
				{
					resolve(_data)
				}else{
					throw new Error('create menu  message fails ')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//通过接口创建的菜单是否要获取到菜单的结构数据
Wechat.prototype.getMenu = function(){
	var that  = this 
	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.menu.get + '?access_token=' + data.access_token

			request({url:url,json:true}).then(function(response){
				var _data = response.body 
			   if(_data){
			   	     resolve(_data)
			   }else{
			   	throw new Error(" get Menu fails ")
			   }
			}).catch(function(err){
				reject(err)
			})
		})
	})
}


//删除创建的菜单信息
Wechat.prototype.deleteMenu = function(){
	var that = this 
		//console.log('>>>' + JSON.stringify(that))
	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.menu.del + '?access_token=' + data.access_token
			request({url:url, json:true}).then(function(response){
				var _data = response.body 
				if(_data){
					resolve(_data)
				}else{
					throw new Error('delete Menu fails ')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//删除创建的菜单信息
// Wechat.prototype.deleteMenu = function(){
// 	var that  = this 


// 	return new Promise(function(resolve, reject){
// 		that.fetchAccessToken()
// 			.then(function(data){
// 			var url = api.menu.del + '?access_token=' + data.access_token

// 			request({url:url,json:true}).then(function(response){
// 				var _data = response.body 
// 			   if(_data){
// 			   	     resolve(_data)
// 			   }else{
// 			   	throw new Error(" delete Menu fails ")
// 			   }
// 			}).catch(function(err){
// 				reject(err)
// 			})
// 		})
// 	})
// }

//获取自定义菜单配置接口
Wechat.prototype.getCurrentMenu = function(){
	var that  = this 
	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.menu.current + '?access_token=' + data.access_token

			request({url:url,json:true}).then(function(response){
				var _data = response.body 
			   if(_data){
			   	     resolve(_data)
			   }else{
			   	throw new Error(" get Current  Menu fails ")
			   }
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//创建二维码
Wechat.prototype.createQrcode = function(qr){
	var that = this 
	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.qrcode.create + '?access_token=' + data.access_token
			request({method:'POST',url:url,json:true,body:qr}).then(function(response){
				var _data = response.body
				if(_data){
					resolve(_data)
				}else{
					throw new Error('create Qrcode fails ')
				}
			}).catch(function(err){
				reject(err)
			})
		})
	})
}

//显示二维码方法
Wechat.prototype.showQrcode = function(ticket){
	return api.qrcode.show + '?ticket=' + encodeURI(ticket)
}

//调用微信的长链接 转换成短连接的方法
Wechat.prototype.createShortUrl = function(urlType, url){
	urlType = urlType || 'long2short'

	var that = this 
	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url  = api.shortUrl.create + '?access_token=' + data.access_token 
			var form = {
				action:urlType,
				long_url:url
			}
			request({method:'POST',url:url, json:true, body:form}).then(function(response){
				var _data = response.body
				if(_data ){
					resolve(_data)
				}else{
					throw new Error('showQrcode long_url fails ')
				}
			}).catch(function(err){
				reject(err) 
			})
		})
	})
}

//添加智能语意识别接口实现
Wechat.prototype.semantic = function(semanticData){
	var that = this 

	return new Promise(function(resolve, reject){
		that.fetchAccessToken().then(function(data){
			var url = api.semantUrl + '?access_token=' + data.access_token 
			//给参数的对象里添加一个 appid 
			semanticData.appid = data.appID
			request({method:'POST',json:true,url:url,body:semanticData}).then(function(response){
				var _data = response.body 
				if(_data){
					resolve(_data)
				}else{
					throw new Error('semantic send fail ')
				}
			}).catch(function(err){
				reject(err) 
			})
		})
	})
}
// ========================



//在wechat的原型链上添加reply 方法， 
Wechat.prototype.reply = function(){
	var content = this.body
	var message = this.weixin 
	console.log('content ===== '+ JSON.stringify(content));

	console.log('message ===== '+ JSON.stringify(message));
	var xml = util.tpl(content, message)

	//console.log('>>>>xml > ' + xml)
	this.status = 200
	this.type = 'application/xml'
	this.body = xml


}

module.exports = Wechat