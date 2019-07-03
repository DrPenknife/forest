var fs = require('fs')

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Globals
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


var f='fw_train_3min_uniq.csv'
//f = 'tennis.csv' 
f = 'iris.csv' 
var dropheader = true

var samprate = 0.9
var selections = 5
var maximumdepth = 89
var outputmodel = false
var tressnum = 10

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

function argmax(prob){
    var mv = -1;
    var mk = null;
    for(var key in prob){
        if(prob[key] > mv){
            mv = prob[key]
            mk = key
        }
    }
    return mk
}

function hist(x,id){
    let m = {}
    for(var i in x){
        let lab = x[i][id] 
        if(!m[lab])m[lab]=1
        else m[lab]++
    }
    return m
}

function entropy(prob){
    var denom = 0;
    var sum = 0;
    var probmap = {};
    for(var key in prob){
        denom += prob[key]
    }
    for(var key in prob){
        var p = prob[key]/denom
        probmap[key] = p;
        sum += p*Math.log(p)
    }
    return {val:-sum, p:probmap};
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

function counts(gr){
    let r={}
    for(let k in gr) r[k]=gr[k].length
    return r
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
    let ndata=[]
    let mdata=[]
    for(let g in s){
       let c = p*s[g].length
	   var shfld = shuffle(s[g], c)
       let selected = shfld.slice(0, c)
	   for(let si in selected){
           ndata.push(x[selected[si]])
	   }
	   let notselected = shfld.slice(c)
	   for(let si in notselected){
           mdata.push(x[notselected[si]])
	   }
    }
    return {a:ndata, b:mdata}
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Random Tree
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function left_or_right(x, cid, val){
    if(colstats[cid].type == 'nominal'){
        if(x[cid] == val)return 0; else return 1;
    }else{
		if(x[cid] < val) return 0; else return 1;
    }
}

function split_col(x, colid, val, e0){
    var mp = [[],[]]
    var stat = [{},{}]
    var ln = [0,0]
    var L = x.length
    for(var i in x){
        var l = x[i][classid] 
        var hit=left_or_right(x[i], colid, val)
        ln[hit]++;
        stat[hit][l] = stat[hit][l]?stat[hit][l]+1:1
        mp[hit].push(x[i]) 
    }
    var res={data:x, split:mp, stats:stat, 
			ln:ln, scol:colid, val:val}
    if(ln[0] && ln[1]){
        res.ent = [entropy(stat[0]), entropy(stat[1])]
        res.gain = e0 - res.ent[0]*ln[0]/L - res.ent[1]*ln[1]/L
        return res
    }else return null
}

function bestsplit(node, maxdepth){
    var best = null
    if(node.entropy < 0.001 || node.depth > maxdepth) return best;
    for(var i=0;i<selections;i++){
	   var col = randint(0, node.data[0].length-1)
	   var sampleid = randint(0, node.data.length)
	   var r = split_col(node.data, col, node.data[sampleid][col], node.entropy) 
	   if(!best || r && (r.gain > best.gain)){
		   best = r
	   }
    }
    if(!best) return null;
    var slices = []

	for(let id=0; id<2; id++){
		slices.push({data:best.split[id], depth:node.depth+1, entropy:best.ent[id].val,
                  id: 2*node.id+(1+id), stats:best.ent[id].p})
	}			  
    node.split = {prop:best.scol, val:best.val}
    return slices;
}

function buildtree(data, entropy0, maxdepth){
    var tree = {}
    var q = [{data:data, depth:0, entropy: entropy0.val, id:0}]
    while(q.length){
        var prnt = q.pop()
        var slices = bestsplit(prnt, maxdepth)
        tree[prnt.id] = prnt;
        if(slices){
			for(let id=0; id<2; id++)
				if(slices[id])q.push(slices[id])
        }else{
            prnt['isleaf']=true
        }
    }
    
    return tree;
}

function buildmodel(indata, strats){
   console.log('training...');
   let trees =[]
   for(let i = 0; i < tressnum; i++){
      data = stsample(indata, strats, samprate).a
      ctr = hist(data, classid)
      entropy0 = entropy(ctr);
      console.log('training tree'+i)
      var t = buildtree(data, entropy0, maximumdepth)
      trees.push(t)
   }
   console.log('-=-=-=-=-=-=-=-=')
   return trees;
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Classifier API
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function single_tree_cls(tree,x){
	var id = 0;
    while(true){
        var node=tree[id]
        if(node.split){
			if(left_or_right(x,node.split.prop,node.split.val,node.rs) == 0){
                id = 2*id+1
            }else{
                id = 2*id+2
            }
        }else{
            return argmax(node.stats)
        }
    }
}

function classify(tree, x){
    let r = {}
    for(let i in tree){
       let u = single_tree_cls(tree[i], x);
       r[u]=r[u]?r[u]+1:1
    }
    return argmax(r)
}

function evaluate(t, dat){
   var err = 0;
   let cmat = {}
   for(var i in dat){
       var x = dat[i];
       var pr = classify(t, x);
       var e = x[classid]
       if(!cmat[e]) cmat[e] = {}
       if(!cmat[e][e]) cmat[e][e] = 0
       if(!cmat[e][pr]) cmat[e][pr] = 0
       cmat[e][pr]++;
       if(pr != e) err++;
   }
  
   console.log('err='+err + '/' + dat.length);
   console.log('confusion matrix')
   console.log(cmat);

} 

function evaluatemodel(trees,data){
   console.log('evaluating...')
   evaluate(trees, data)
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Data Statistics
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


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

   let model = buildmodel(parts.a, trainstrats)
   evaluatemodel(model, parts.a)
   evaluatemodel(model, parts.b)
})














