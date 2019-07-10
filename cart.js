var fs = require('fs')


var f='fw_train_3min_uniq.csv'
//f = 'tennis.csv' 
f = 'iris.csv' 
var dropheader = true

var fdata = []
var classid = -1
var header = null
var colstats = []

var data_strats = null
var class_cnts = null


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Utility functions
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function randint(min, max){
    return Math.floor((max-min)*Math.random()+min)
}

function get_strats(x, c){
    let g = {}
    for(let i in x){
        let l = x[i][c]
        if(!g[l])g[l]=[]
        g[l].push(i)
    }
    return g
}

function shuffle(arr){
	var shuffled = arr.slice(0), i = arr.length, temp, index;
	while (i--) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
	
	return shuffled;
}


function stsample(x,s,p){
    let r = {a:[], b:[]}
    for(let g in s){
       let c = p*s[g].length
	   var shfld = shuffle(s[g], c)
       for(let i in shfld)
           if(i<c)r.a.push(x[shfld[i]])
           else r.b.push(x[shfld[i]])
    }
    return r
}


function calcstats(data){
    colstats = []
    for(var j=0; j<data[0].length; j++){
        console.log(header[j]);
        var range = {min:parseFloat(data[0][j]), max:parseFloat(data[0][j])}
        var stat = {}
        for(var i in data){
            var l = data[i][j]
            var lfl = parseFloat(l);
            stat[l]=stat[l]?stat[l]+1:1;
            if(lfl){
                if(lfl > range.max)range.max = lfl;
                if(lfl < range.min)range.min = lfl;
				data[i][j] = lfl
            }
        }
        var colinfo = {}
        var values = Object.keys(stat)
        colinfo['type']=values.length > 10?'numeric':'nominal'
        if(colinfo['type']=='nominal')colinfo['values']=values
        if(colinfo['type']=='numeric')colinfo['range']=range
        console.log(colinfo)
        colstats.push(colinfo);
    }
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Cart
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function buildmodel(tab){
   var q = [{d:tab}]
   while(q.length){
       var n = q.pop()
       
   }
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// I/O
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

console.log('reading file...')
fs.readFile(f,'utf8', function(e,c){
   fdata = c.split('\n')
   for(var i=0;i<fdata.length;i++){
       fdata[i] = fdata[i].replace('\r','').replace('\n','').split(',');
       //fdata[i].pop()
   }
   if(dropheader)header = fdata.splice(0,1)[0];
   classid = fdata[0].length - 1;
   data_strats = get_strats(fdata, classid)
 
   console.log("-=- Colstats =-=-=-=-")
   calcstats(fdata);
   console.log("-=-=-=-=-=-")
   let parts = stsample(fdata, data_strats, 0.8)
   let trainstrats = get_strats(parts.a, classid)
})






















