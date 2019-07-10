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


function impurity(t,sum){
	let im = 1.0
	for(let k in t){
		let p = t[k]/=sum
		im -= p*p
	}
	return im
}

function gain(l,r){
	let lm = {}
	let ln = {}
	let g = {}
	
	//console.log(l,r)
	for(let i = 0; i < l.length; i++){
		!lm[l[i][classid]]?lm[l[i][classid]]=1:lm[l[i][classid]]++
		!g[l[i][classid]]?g[l[i][classid]]=1:g[l[i][classid]]++
	}
	
	for(let i = 0; i < r.length; i++){
		!ln[r[i][classid]]?ln[r[i][classid]]=1:ln[r[i][classid]]++
		!g[r[i][classid]]?g[r[i][classid]]=1:g[r[i][classid]]++
	}
	let s = l.length + r.length
	
	return impurity(g,s)-((impurity(lm, l.length)*l.length)/s + (impurity(ln, r.length)*r.length)/s)
}

function split(t){	
   let bestcol = null; //randint(0,classid-1)
   let bestgain = -100
   let bestsplit = 0
   let maxlab = t[0][classid]
   //console.log(t)	   
   for(let col = 0; col < classid; col++){
	   console.log("col=",col)
	   let lab = {}
	   let maxlabctr = -1
	   
	   t.sort(function(a,b) {
		   return a[col] - b[col]
	   })
	   
	   let spv=[]

	   for(let i =1;i< t.length; i++){
		  lab[t[i][classid]]?lab[t[i][classid]]++:lab[t[i][classid]]=1
		  if(lab[t[i][classid]]>maxlabctr){
			  maxlabctr=lab[t[i][classid]]
			  maxlab = t[i][classid]
		  }
		  if(t[i-1][classid]!=t[i][classid]){
			spv.push((t[i-1][col]+t[i][col])/2)
		  }
	   }
	   
	   //console.log(spv)
	   
	   
	   for(let i = 0; i<spv.length; i++){
			let ts = {L:[],R:[]}
			for(let j=0; j < t.length; j++){
				t[j][col] < spv[i]?ts.L.push(t[j]):ts.R.push(t[j])
			}
			
			let g = gain(ts.L,ts.R)
			if(g>bestgain)
			{
				bestgain = g
				bestsplit = spv[i]
				bestcol = col
			}
			
	   }
   }
   console.log("best",bestcol, bestsplit)
   
   if(bestgain < 0) return {split:null, lab:maxlab}
   piv = bestsplit
   //console.log(spv.length, t.length,spv)
   let r = {split:{L:[], R:[], col:bestcol, p:piv}, lab:maxlab}
   for(let i=0; i < t.length; i++){
      t[i][bestcol] < piv?r.split.L.push(t[i]):r.split.R.push(t[i])
   }
   r.x=[r.split.R.length, r.split.L.length]
   return r;
}

function buildmodel(tab){
   let tr={}
   var q = [{d:tab, id:0, depth:0}]
   while(q.length){
       var n = q.pop()
	   console.log(n.d.length)
	   let s = split(n.d)
	   if(!s.split){
		   console.log("------",n.d, s.lab)
		   continue;
	   }else{
		   //console.log(s.x)
	   }
	   tr[n.id]={col:s.col, p:s.p}
	   if(s.split.L.length)q.push({d:s.split.L,id:n.id*2+1, 
			   depth:n.depth+1})           
	   if(s.split.R.length)q.push({d:s.split.R,id:n.id*2+2, 
			   depth:n.depth+1})
       
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






















