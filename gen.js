'use strict'

var gen = function* (n){
	for(var i = 0 ; i < 3 ; i++){
		n++

		yield n
	}
}

var genobj = gen(2)

console.log(genobj.next());
console.log(genobj.next());
console.log(genobj.next());
console.log(genobj.next());
console.log(genobj.next());