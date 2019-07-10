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

function split(t){
   let col = randint(0,classid-1)
   let pid = randint(0,t.length-1)
   let piv = t[pid][col]

   t.sort(function(a,b) {
       return a[col] - b[col]
   })
   
   let spv=[]

   for(let i =1;i< t.length; i++){
      if(t[i-1][classid]!=t[i][classid]){
        spv.push((t[i-1][col]+t[i][col])/2)
      }
   }
   
   console.log(spv.length, t.length,spv)
   let r = {L:[], R:[], col:col, p:piv}
   for(let i=0; i < t.length; i++){
      t[i][col] < piv?r.L.push(t[i]):r.R.push(t[i])
   }
   return r;
}

function buildmodel(tab){
   let tr={}
   var q = [{d:tab, id:0, depth:0}]
   while(q.length){
       var n = q.pop()
       if(n.d.length > 2 && n.depth < 12){
           let s = split(n.d)
           tr[n.id]={col:s.col, p:s.p}
           q.push({d:s.L,id:n.id*2+1, 
                   depth:n.depth+1})           
           q.push({d:s.R,id:n.id*2+2, 
		    	   depth:n.depth+1})
       }else{
           tr[n.id]={lab:1}
   	}
       
   }

   console.log("done")
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
   
   console.log("build model")
   buildmodel(parts.a)
})






















