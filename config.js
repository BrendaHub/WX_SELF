'use strict'
//引入自定义的wechat 签名的中间件
var path = require('path')
var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')
var config = {
	wechat:{
		appID : 'wxf59a542ae67c818d',
		appSecret : '187c631f55216ca87428b4036e22e1f2',
		token : 'ca8742e1f8b4036e22187c631',
		getAccessToken:function(){
			
			return util.readFileAsync(wechat_file)
		},
		saveAccessToken:function(data){
			data = JSON.stringify(data)
			return util.writeFileAsync(wechat_file, data)
		}
	}
}

module.exports = config 