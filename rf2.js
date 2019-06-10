var fs = require('fs')

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Globals
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


var f='tennis.csv'
var dropheader = true
var data = []
var classid = -1
var header = null
var colstats = []
var entropy0 = -1
var selections = 3

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

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Random Tree
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

function split_col(x, colid, val, e0){
    var mp = [[],[]]
    var stat = [{},{}]
    var ln = [0,0]
    var L = x.length
    for(var i in x){
        var l = x[i][classid] 
        var hit=1
        if(x[i][colid] == val)hit=0
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

function classify(tree, x){
    var id = 0;
    while(true){
        var node=tree[id]
        if(node.split){
            if(x[node.split.prop] == node.split.val){
                id = 2*id+1
            }else{
                id = 2*id+2
            }
        }else{
            return argmax(node.stats)
        }
    }
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Data Statistics
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


function calcstats(){
    colstats = []
    for(var j=0; j<data[0].length; j++){
        var stat = {}
        for(var i in data){
            var l = data[i][j]
            stat[l]=stat[l]?stat[l]+1:1;
        }
        colstats.push(stat);
    }
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// I/O
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


function alldone(){
   var tree = buildtree(data, 5)

   var stream = fs.createWriteStream("out.txt");
   for(var i in tree)tree[i].data=tree[i].data.map(x=>x.join(","))
   stream.once('open', function(fd) {
       stream.write(JSON.stringify(tree,null,4));
       stream.end();
   });

   var err = 0;
   for(var i in data){
       var x = data[i];
       var r = classify(tree, x);
       if(r != x[classid]) err++;
   }
   console.log('err='+err + '/' + data.length);
}

fs.readFile(f,'utf8', function(e,c){
   data = c.split('\n')
   for(var i=0;i<data.length;i++){
       data[i] = data[i].replace('\r','').replace('\n','').split(',');
   }
   if(dropheader)header = data.splice(0,1)[0];
   classid = data[0].length - 1;
   calcstats()
   entropy0 = entropy(colstats[classid]);
   alldone()
})

