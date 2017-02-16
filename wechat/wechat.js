'use strict'

var fs = require('fs')
var Promise = require('bluebird')
var _ = require('lodash')
var request = Promise.promisify(require('request'))
var util = require('./util')
//获取票据接口的配置项目
var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var api = {
	accessToken: prefix + 'token?grant_type=client_credential',
	temporary:{
		upload: prefix + 'media/upload',
		fetch:prefix + 'media/get'
	},
	permanent:{
		upload:prefix + 'material/add_material',
		fetch:prefix + 'material/get_material',
		uploadNews: prefix + 'material/add_news',
		uploadNewPic:prefix + 'media/uploadimg',
		del:prefix + 'material/del_material',
		update: prefix + 'material/update_news',
		count: prefix + 'material/get_materialcount',
		batch: prefix + 'material/batchget_material'
	}
}

//添加票据处理方法
function Wechat(opts){
	var that = this
	this.appID = opts.appID
	this.appSecret = opts.appSecret
	this.getAccessToken = opts.getAccessToken
	this.saveAccessToken = opts.saveAccessToken
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
	console.log('utl = ' + JSON.stringify(url));
	return new Promise(function(resolve, reject){
		request({url: url, json:true}).then(function(response){
			// var data = response[1]
			var data = response.body
			var now = (new Date().getTime())
			console.log('asdfasdfasdf = ' + JSON.stringify(response.body));
			var expires_in = now + (data.expires_in - 20) * 1000 

			data.expires_in = expires_in 

			resolve(data)
		})
	})
}
Wechat.prototype.fetchAccessToken = function(){
	var that = this 
	if( this.access_token && this.expires_in ){//判断是否存在相应的属性值
		if(this.isValidAccessToken(this)){//是否有效
			return Promise.resolve(this)//有效直接返回，当前对象
		}
	}
	//这里采用了Promise的框架，.then() 实现异步的逻辑
	//即获取到票据后， 需要做什么事情.then（）里面进行扫行
	this.getAccessToken().then(function(data){
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
		that.access_token = data.access_token
		that.expires_in = data.expires_in

		that.saveAccessToken(data)

		return Promise.resolve(data)
	})
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
		form.media = fs.createReadStream(filepath)
	}
	
	return new Promise(function(resolve, reject){
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
				request(options)
					.then(function(response){
						var _data = response[1]
						if(_data){
							resolve(_date)
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
				media_id : mediaId,
				access_token : data.access_token
				options.body = form 
			}else{
				if(type === 'video'){
					url = url + replace('https://', 'http://')
				}
				url += '&media_id=' + mediaId 
			}

			if(type === 'news' || type === 'video'){
				request(options)
				.then(function(response){
					var _data = response[1]

					if(_data){
						resolve(_data)
					}else{
						throw new Error('fetch material fails')
					}
				})
			}else{
				resolve(url)
			}



			resolve(url)
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





//在wechat的原型链上添加reply 方法， 
Wechat.prototype.reply = function(){
	var content = this.body
	var message = this.weixin 

	var xml = util.tpl(content, message)

	this.status = 200
	this.type = 'application/xml'
	this.body = xml


}

module.exports = Wechat