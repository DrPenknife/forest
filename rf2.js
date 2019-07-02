var fs = require('fs')

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Globals
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


var f='fw_train_3min_uniq.csv'
//f = 'tennis.csv' 
f = 'iris.csv' 
var dropheader = true

var samprate = 0.7
var selections = 5
var maximumdepth = 5
var outputmodel = false
var region_size = 0.001

var data = []
var fdata = []
var classid = -1
var header = null
var colstats = []
var entropy0 = -1

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

function groupby(x, c){
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

function stsample(x,s,p){
    let rid = {}
    for(let g in s){
       let c = p*s[g].length
       for(let i =0; i<c; i++){
          let n = randint(0, s[g].length)
          let m = s[g][n]
          rid[m] = m
       }
    }
    let ndata=[]
    let ids = Object.keys(rid)
    for(let i in ids){
        ndata.push(x[ids[i]])
    }
    return ndata
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Random Tree
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function left_or_right(x, cid, val){
    if(colstats[cid].type == 'nominal'){
        if(x[cid] == val)return 0
		return 1
    }else{
		var r = Math.abs(colstats[cid].range.max-colstats[cid].range.min)
		if( Math.abs(x[cid]-val) <= region_size*r) return 0
		else return 1;
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
    var res={data:x, split:mp, stats:stat, ln:ln, scol:colid, val:val}
    if(ln[0] && ln[1]){
        res.ent = [entropy(stat[0]), entropy(stat[1])]
        res.gain = e0 - res.ent[0]*ln[0]/L - res.ent[1]*ln[1]/L
        return res
    }else return null
}

function randomsplit(node){
    var col = randint(0, node.data[0].length-1)
    var sampleid = randint(0, node.data.length)
    var value = node.data[sampleid][col]
    var r = split_col(node.data, col, value, node.entropy)
    return r
}

function split(node){
    var best = null
    if(node.entropy < 0.001) return best;
    for(var i=0;i<selections;i++){
       var r = randomsplit(node)
       if(!best || r && (r.gain > best.gain)){
           best = r
       }
    }
    if(!best) return null;
    var slices = {}

    slices.L = {data:best.split[0], depth:node.depth+1, entropy:best.ent[0].val,
                  id: 2*node.id+1, stats:best.ent[0].p}
    slices.R = {data:best.split[1], depth:node.depth+1, entropy:best.ent[1].val, 
                  id: 2*node.id+2, stats:best.ent[1].p}
    node.split = {prop:best.scol, val:best.val}
    return slices;
}

function buildtree(data, maxdepth){
    var tree = {}
    var q = [{data:data, depth:0, entropy: entropy0.val, id:0}]
    while(q.length){
        var prnt = q.pop()
        var slices = split(prnt)
        tree[prnt.id] = prnt;
        if(slices){
            if(slices.L)q.push(slices.L)
            if(slices.R)q.push(slices.R)
        }else{
            prnt['isleaf']=true
        }
    }
    
    return tree;
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Classifier API
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function single_tree_cls(tree,x){
	var id = 0;
    while(true){
        var node=tree[id]
        if(node.split){
			if(left_or_right(x,node.split.prop,node.split.val) == 0){
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
    return single_tree_cls(tree, x);
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


function alldone(){
   console.log('training...');
   var tree = buildtree(data, maximumdepth)

   if(outputmodel) {
      var stream = fs.createWriteStream("out.txt");
      for(var i in tree)tree[i].data=tree[i].data.map(x=>x.join(","))
      stream.once('open', function(fd) {
         stream.write(JSON.stringify(tree,null,4));
         stream.end();
      });
   }

   console.log('evaluating...')
   evaluate(tree, fdata)
}


console.log('reading file...')
fs.readFile(f,'utf8', function(e,c){
   fdata = c.split('\n')
   for(var i=0;i<fdata.length;i++){
       fdata[i] = fdata[i].replace('\r','').replace('\n','').split(',');
       //fdata[i].pop()
   }
   if(dropheader)header = fdata.splice(0,1)[0];
   classid = fdata[0].length - 1;
   
   calcstats(fdata);
   console.log("-=-=-=-=-=-")

   let strats = groupby(fdata, classid)
   let cnts = counts(strats)

   console.log('strats')
   console.log(cnts)
   
   console.log('sampling data, rate = '+samprate)
   data = stsample(fdata, strats, samprate)
   
   ctr = hist(data, classid)
   console.log(ctr)
   entropy0 = entropy(ctr);
   console.log("-=-=-=-=-=-")
   alldone()
})














