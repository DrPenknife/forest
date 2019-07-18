var fs = require('fs')


var f='fw_train_3min_uniq.csv'
f = 'tennis.csv' 
//f = 'iris.csv' 
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


function calcstats(data, classid){
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

function argmax(m){
	let mx = 0;
	let mxlab = null
	for(let k in m){
		if(m[k]>mx){
			mxlab=k
			mx=m[k]
		}
	}
	return mxlab
}

function iclsc(){
	let r = {}
	for(let k in colstats[classid].values){
		r[colstats[classid].values[k]]=0
	}
	return r;
}

function impurity(t,sum){
	let im = 1.0
	for(let k in t){
		let p = t[k]/=sum
		im -= p*p
	}
	return im
}

function gain(l,r){
	let lm = iclsc()
	let ln = iclsc()
	let g = iclsc()
	
	for(let i = 0; i < l.length; i++){
		lm[l[i][classid]]++
		g[l[i][classid]]++
	}
	
	for(let i = 0; i < r.length; i++){
		ln[r[i][classid]]++
		g[r[i][classid]]++
	}
	let s = l.length + r.length
	
	return impurity(g,s)-
	       ((impurity(lm, l.length)*l.length)/s + 
		    (impurity(ln, r.length)*r.length)/s)
}

function isLorR(x, node){
	if(!colstats[node.col])return true
	if(colstats[node.col].type == "numeric"){
		if(x[node.col] < node.p) return true
	}else{
		if(x[node.col] == node.p)return true
	}
	return false;
}

function group(arr,x,col,th){
	if(colstats[col].type == "numeric"){
		if(x[col] == th)arr.E.push(x)
			else x[col] < th?arr.L.push(x):arr.R.push(x)
	}else{
		(x[col] == th)?arr.L.push(x):arr.R.push(x)
	}
}

function checksplit(t, spv, col){
	let bestgain = -100
	let bestsplit = 0
	for(let i = 0; i<spv.length; i++){
		let ts = {L:[], R:[], E:[]}
		for(let j=0; j < t.length; j++)group(ts,t[j],col,spv[i])
		if(ts.L.length == 0)ts.L=ts.L.concat(ts.E)
		else ts.R=ts.R.concat(ts.E)
		let g = gain(ts.L,ts.R)
		if(g>bestgain)
		{
			bestgain = g
			bestsplit = spv[i]
		}
   }
   return {gain:bestgain, split:bestsplit}
}

function dist(d,classid){
	let ctr = iclsc();
	for(let i = 0; i<d.length; i++)
	{
	   ctr[d[i][classid]]++;
	}
	return ctr;
}

function split(t){	
   let bestcol = null;  
   let bestgain = -100
   let bestsplit = 0
   let maxlab = t[0][classid]
   if(t.length <= 1) return null;
   
   for(let col = 0; col < classid; col++){
	   let spv={}
   
	   let maxBin = 10
	   let rng = {min:t[0][col],max:t[0][col]}
	
	   for(let i =1;i< t.length; i++){
		   if(colstats[col].type == "numeric"){
				   if(t[i][col]>rng.max)rng.max=t[i][col]
				   if(t[i][col]<rng.min)rng.min=t[i][col]
		   }else{
			   spv[t[i][col]]=1
		   }
	   }
	   
	   if(colstats[col].type == "numeric"){
		   for(let i = 0; i <= maxBin; i++)
			   spv[i*(rng.max-rng.min)/maxBin+rng.min]=1
	   }
	 
	   spv = Object.keys(spv)
	   
	   candidate = checksplit(t,spv,col)
	   
	   if(candidate.gain > bestgain){
			bestgain=candidate.gain
			bestsplit=candidate.split
			bestcol = col
	   }
	   
   }
   
   if(bestgain < 0) return null
   piv = bestsplit
   let r = {L:[], R:[], col:bestcol, p:piv, labels:[], E:[]}
   let eq = []
   
   for(let i=0; i < t.length; i++){
	  group(r,t[i],bestcol,piv)
   }

   if(r.L.length == 0 && r.R.length == 0){
	   return null
   }
   
   if(r.L.length == 0)r.L=r.L.concat(eq)
   else r.R=r.R.concat(eq)

   r.labels[0]=argmax(dist(r.L,classid))
   r.labels[1]=argmax(dist(r.R,classid))
  			
   return r;
}

function buildmodel(tab){
   let tr={}
   var q = [{d:tab, id:0, depth:0}]
   let ctr = 0;
   while(q.length){
       var n = q.pop()
	   //console.log('split ',n.d.length)
	   let s = split(n.d)
	   tr[n.id]={lab:n.lab}
	   if(!s)continue;
	   tr[n.id].col=s.col
	   tr[n.id].p=s.p
	   if(s.L.length)q.push({d:s.L,id:n.id*2+1, 
			   depth:n.depth+1, lab:s.labels[0]})           
	   if(s.R.length)q.push({d:s.R,id:n.id*2+2, 
			   depth:n.depth+1, lab:s.labels[1]})
       
   }
   console.log(tr)
   return tr
}


let trip = []
function classify(model, x){
	
	let votes = iclsc()
	for(let t=0; t < model.length; t++){
		let tree=model[t];
		var id = 0;
		while(true){
			var node=tree[id]
			let nid = isLorR(x,node)?2*id+1:2*id+2
			if(!tree[nid])break;
			trip.push(nid)
			id = nid	
		}
		let lab = tree[id].lab?tree[id].lab:"?"
		votes[lab]++
	}
	return argmax(votes)
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Evaluation
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


function evaluate(t, dat){
   let err = 0;
   let cmat = {}
   for(let i in dat){
       let x = dat[i];
       let pr = classify(t, x);
       let e = x[classid]
       if(!cmat[e]) cmat[e] = iclsc()
       cmat[e][pr]++;
       if(pr != e) {
		   console.log("-------")
		   console.log('trip',trip.join(","))
		   console.log('err',x)
		   err++;
	   }
   }
   console.log('err='+err + '/' + dat.length);
   console.log('confusion matrix')
   console.log(cmat);
} 



// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// I/O
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

console.log('reading file...')
fs.readFile(f,'utf8', function(e,c){
   fdata = c.split('\n')
   for(let i=0;i<fdata.length;i++){
       fdata[i] = fdata[i].replace('\r','').replace('\n','').split(',');
       //fdata[i].pop()
   }
   if(dropheader)header = fdata.splice(0,1)[0];
   classid = fdata[0].length - 1;
   data_strats = get_strats(fdata, classid)
 
   console.log("-=- Colstats =-=-=-=-")
   calcstats(fdata, classid);
   console.log("-=-=-=-=-=-")
   let parts = stsample(fdata, data_strats, 0.8)
   let trainstrats = get_strats(parts.a, classid)
   
   console.log("build model")
   let model = buildmodel(fdata)
   console.log("done")

   console.log("evaluate on training data")
   evaluate([model], fdata)
   
   console.log("evaluate on validation data")
   evaluate([model], parts.b)
})






















