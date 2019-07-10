var fs = require('fs')


var f='fw_train_3min_uniq.csv'
//f = 'tennis.csv' 
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


function calcstats(data){
    colstats = []
    for(var j=0; j<data[0].length; j++){
        console.log(header[j]);
        var range = {min:parseFloat(data[0][j]), max:parseFloat(data[0][j])}
        var stat = {}
        for(var i=0; i < data.length; i++){
			//if(j == classid)data[i][j]="C"+data[i][j]	
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
// Random FOREST
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function argmax(tab){
	let m = {}
	let mx = {lab:0,ctr:0}
	for(let i=0; i<tab.length; i++){
		let lab = tab[i][classid]
		m[lab]=!m[lab]?1:m[lab]+1
		if(m[lab]>mx.ctr){
			mx.ctr=m[lab]; mx.lab=lab;
		}
	}
	return mx.lab
}


function buildtree(array, maxdepth) {
  let tree = {}
  let q = [{array:array, id:0, depth:0}]	
  while(q.length){
     let node = q.pop();
	 //console.log(node.depth)
     var cid = randint(0, classid-2)
	 var pid = randint(0, node.array.length-1)
	 
	 
	 node.array.sort(function(x, y) {
		  if (x[cid] < y[cid]) {
			return -1;
		  }
		  if (x[cid] > y[cid]) {
			return 1;
		  }
		  return 0;
	 })
	 let ab={}
	 for(let i = 0; i< node.array.length; i++)
		 ab[node.array[i][classid]]=!ab[node.array[i][classid]]?1:ab[node.array[i][classid]]+1
	
	 //for(let i = 0; i< node.array.length; i++);
		
     let pivot = node.array[pid][cid]

	 tree[node.id]={cid:cid, pivot:pivot}
	 if(node.depth+1 >= maxdepth || node.array.length < 3) {
		 tree[node.id].label = argmax(node.array)
		 continue;
	 }

     var left=[], right=[]; 
     for (let i = 0; i < node.array.length; i++) {
       node.array[i][cid] < pivot ? left.push(node.array[i]) : right.push(node.array[i]);
     }
 
	 if(left.length)q.push({array:left, id:2*node.id+1, depth:node.depth+1})
	 if(right.length) q.push({array:right, id:2*node.id+2, depth:node.depth+1})
  }	 
  return tree; 
};


function classify(model, x){
	let votes = {}
	let m = {lab:0,ctr:0}
	for(let t=0; t < model.length; t++){
		let tree=model[t];
		var id = 0;
		//console.log(tree)
		while(true){
		//console.log(id)
			var node=tree[id]
			//(x[node.cid] < node.pivot)?console.log("L"):console.log("R")
			let nid = (x[node.cid] < node.pivot)?2*id+1:2*id+2
			if(!tree[nid])break;
			id = nid	
		}
		let lab = tree[id].label?tree[id].label:"?"
		votes[lab]=!votes[lab]?1:votes[lab]+1
		if(votes[lab]>m.ctr){
			m.ctr=votes[lab]
			m.lab = lab;
		}
	}
	return m.lab
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Evaluation
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


function evaluate(t, dat){
   var err = 0;
   let cmat = {}
   for(var i in dat){
       var x = dat[i];
       var pr = classify(t, x);
	  // exit(1)
       var e = x[classid]
       if(!cmat[e]) cmat[e] = {}
       if(!cmat[e][e]) cmat[e][e] = 0
       if(!cmat[e][pr]) cmat[e][pr] = 0
       cmat[e][pr]++;
       if(pr != e) {
		   err++;
	//	   console.log(x,pr)
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
   for(var i=0;i<fdata.length;i++){
       fdata[i] = fdata[i].replace('\r','').replace('\n','').split(',');
       fdata[i].pop()
   }
   if(dropheader)header = fdata.splice(0,1)[0];
   classid = fdata[0].length - 1;
   data_strats = get_strats(fdata, classid)
 
   console.log("-=- Colstats =-=-=-=-")
   calcstats(fdata);
   console.log("-=-=-=-=-=-")
   parts = stsample(fdata, data_strats, 0.8)
   let trainstrats = get_strats(parts.a, classid)
   
   let mod = []
   for(let i = 0; i < 10; i++){
		let bag = []
		for(let j = 0; j < 0.8*parts.a.length; j++)
			bag.push(parts.a[randint(0,parts.a.length-1)]);
		let tree = buildtree(bag, 40);
		mod.push(tree);
		console.log("tree"+i)
   }
   console.log("==evaluate===")
   //evaluate(mod,parts.a)
   //console.log("=====")
   evaluate(mod,parts.b)
})













