'use strict'

// module.exports = {
// 	'button':[
//      {	
//           'type':'click',
//           'name':'今日歌曲',
//           'key':'V1001_TODAY_MUSIC'
//       },
//       {
//            'name':'菜单',
//            'sub_button':[
//            {	
//                'type':'view',
//                'name':'搜索',
//                'url':'http://www.soso.com/'
//             },
//             {
//                'type':'view',
//                'name':'视频',
//                'url':'http://v.qq.com/'
//             },
//             {
//                'type':'click',
//                'name':'赞一下我们',
//                'key':'V1001_GOOD'
//             }]
//        }]
// }

module.exports = {
	'button':[
		{
			'name':'点击事件Y',
			'type':'click',
			'key':'menu_click'
		},{
			'name':'点击菜单',
			'sub_button':[{
				'type':'view',
				'name':'跳转URL',
				'url':'http://github.com/'
			},{
				'type':'scancode_push',
				'name':'扫码推送事件',
				'key':'qr_scan'
			},{
				'type':'scancode_waitmsg',
				'name':'扫码推送',
				'key':'qr_scan_wait'
			},{
				'type':'pic_sysphoto',
				'name':'弹出系统拍照',
				'key':'pic_photo'
			},{
				'type':'pic_photo_or_album',
				'name':'弹出拍照或相册',
				'key':'pic_phote_album'
			}]
		},{
			'name':'点击菜单2',
			'sub_button':[{
				'type':'pic_weixin',
				'name':'点击相册发图',
				'key':'pic_weixin'
			},{
				'type':'location_select',
				'name':'地理位置选择',
				'key':'location_select'
			}
			// },{
			// 	'type':'media_id',
			// 	'name':'下发图片消息',
			// 	'key':'xxxxx'
			// },{
			// 	'type':'view_limited',
			// 	'name':'跳转图文消息的URL',
			// 	'key':'xxxxx'
			// }]
			]
		}
	]
}